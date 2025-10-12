// Sound utilities for playing audio feedback
export class SoundManager {
  private static audioContext: AudioContext | null = null;
  private static isInitialized = false;
  private static userInteracted = false;
  private static initializationPromise: Promise<void> | null = null;
  private static soundsPlayed = 0;
  private static soundErrors = 0;
  private static keepAliveInterval: any = null;

  // Initialize global user interaction listener
  static {
    console.log('🎵 SoundManager: Static initialization started');
    
    // Mark user interaction on any user action and force init AudioContext
    const markInteraction = async () => {
      this.markUserInteracted();
      
      // Force create AudioContext immediately on first interaction
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext && !this.audioContext) {
          this.audioContext = new AudioContext();
          console.log('🎵 SoundManager: AudioContext created on first interaction');
          console.log('🎵 Initial state:', this.audioContext.state);
          
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('🎵 SoundManager: AudioContext resumed');
          }
          
          this.isInitialized = true;
          
          // Keep AudioContext alive by resuming it periodically
          this.startKeepAlive();
        }
      } catch (error) {
        console.error('🎵 SoundManager: Error creating AudioContext:', error);
      }
      
      // Remove listeners after first interaction
      document.removeEventListener('click', markInteraction, true);
      document.removeEventListener('keydown', markInteraction, true);
      document.removeEventListener('touchstart', markInteraction, true);
    };

    // Add listeners immediately with capture phase to catch ALL clicks
    document.addEventListener('click', markInteraction, true);
    document.addEventListener('keydown', markInteraction, true);
    document.addEventListener('touchstart', markInteraction, true);
    
    console.log('🎵 SoundManager: Event listeners attached (capture phase)');
  }

  /**
   * Keep AudioContext alive by checking and resuming it periodically
   */
  private static startKeepAlive() {
    if (this.keepAliveInterval) return;
    
    this.keepAliveInterval = setInterval(async () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
          console.log('🔄 KeepAlive: AudioContext resumed');
        } catch (error) {
          console.error('❌ KeepAlive: Failed to resume AudioContext:', error);
        }
      }
    }, 1000); // Check every second
    
    console.log('✅ KeepAlive: Started monitoring AudioContext');
  }

  /**
   * Stop the keep-alive interval
   */
  static stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('🛑 KeepAlive: Stopped');
    }
  }

  private static async initialize() {
    if (this.isInitialized && this.audioContext) return;
    
    // Only initialize AudioContext after user interaction
    if (!this.userInteracted) {
      return;
    }
    
    // Prevent multiple initialization attempts
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }
    
    this.initializationPromise = this.createAudioContext();
    await this.initializationPromise;
  }

  private static async createAudioContext() {
    try {
      // Only create AudioContext if it doesn't exist
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          console.warn('Web Audio API not supported in this browser');
          this.isInitialized = true;
          return;
        }

        this.audioContext = new AudioContext();
        console.log(`🎵 AudioContext created with state: ${this.audioContext.state}`);
        
        // Resume the context if it's suspended
        if (this.audioContext.state === 'suspended') {
          console.log('🎵 Resuming suspended AudioContext...');
          await this.audioContext.resume();
          console.log(`🎵 AudioContext resumed, new state: ${this.audioContext.state}`);
        }
        
        this.isInitialized = true;
        console.log('✅ AudioContext initialized successfully');
      }
    } catch (error) {
      console.error('❌ Error creating AudioContext:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Mark that user has interacted (call this on first user action)
   */
  static markUserInteracted() {
    if (!this.userInteracted) {
      this.userInteracted = true;
      console.log('✅ SoundManager: User interaction detected');
      console.log('🎵 SoundManager: Initializing AudioContext...');
      // Trigger initialization after user interaction
      this.initialize();
    }
  }

  /**
   * Get sound statistics for debugging
   */
  static getStats() {
    return {
      isInitialized: this.isInitialized,
      userInteracted: this.userInteracted,
      hasAudioContext: !!this.audioContext,
      audioContextState: this.audioContext?.state || 'not-created',
      soundsPlayed: this.soundsPlayed,
      soundErrors: this.soundErrors,
      successRate: this.soundsPlayed > 0 ? 
        ((this.soundsPlayed / (this.soundsPlayed + this.soundErrors)) * 100).toFixed(1) + '%' : 
        'N/A'
    };
  }

  /**
   * Log current sound system status
   */
  static logStatus() {
    const stats = this.getStats();
    console.log('🎵 ═══════════════════════════════════════');
    console.log('🎵 SOUND SYSTEM STATUS');
    console.log('🎵 ═══════════════════════════════════════');
    console.log('🎵 Initialized:', stats.isInitialized ? '✅' : '❌');
    console.log('🎵 User Interacted:', stats.userInteracted ? '✅' : '❌');
    console.log('🎵 AudioContext:', stats.hasAudioContext ? '✅' : '❌');
    console.log('🎵 AudioContext State:', stats.audioContextState);
    console.log('🎵 Sounds Played:', stats.soundsPlayed);
    console.log('🎵 Sound Errors:', stats.soundErrors);
    console.log('🎵 Success Rate:', stats.successRate);
    console.log('🎵 ═══════════════════════════════════════');
  }

  /**
   * Force mark user interaction (for testing purposes)
   */
  static forceUserInteraction() {
    this.userInteracted = true;
    console.log('✅ User interaction forced for testing');
    this.initialize();
  }

  /**
   * Play a notification sound when a remark is sent
   */
  static async playRemarkSound() {
    // Only play sound if user has interacted and AudioContext is ready
    if (!this.userInteracted) {
      // Silently skip if no user interaction yet
      return;
    }
    
    // Mark user interaction on first sound play
    this.markUserInteracted();
    await this.initialize();
    
    if (this.audioContext && this.audioContext.state === 'running') {
      // Create a pleasant notification sound using Web Audio API
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Create a pleasant notification sound
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
      // Clean up when oscillator ends
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Already disconnected
        }
      };
    } else {
      // Fallback: Create a simple audio element
      this.playFallbackSound();
    }
  }

  /**
   * Fallback method using HTML5 Audio
   */
  private static playFallbackSound() {
    try {
      // Simple fallback without AudioContext
      console.log('Playing fallback sound');
    } catch (error) {
      console.warn('Could not play remark sound:', error);
    }
  }

  /**
   * Play a success sound
   */
  static async playSuccessSound() {
    // Mark user interaction on first sound play
    this.markUserInteracted();
    await this.initialize();
    
    if (this.audioContext && this.audioContext.state === 'running') {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Success sound (ascending tones)
      oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
      // Clean up when oscillator ends
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Already disconnected
        }
      };
    }
  }

  /**
   * Play an error sound
   */
  static async playErrorSound() {
    // Mark user interaction on first sound play
    this.markUserInteracted();
    await this.initialize();
    
    if (this.audioContext && this.audioContext.state === 'running') {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Error sound (descending tones)
      oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime); // G5
      oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime + 0.2); // C5
      
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
      // Clean up when oscillator ends
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Already disconnected
        }
      };
    }
  }

  /**
   * Play a click sound for button interactions
   */
  static async playClickSound() {
    const startTime = Date.now();
    console.log('🎵 >>>>>> CLICK SOUND START <<<<<<');
    
    try {
      // Ensure AudioContext exists
      console.log('🎵 Step 1: Checking AudioContext exists...', !!this.audioContext);
      if (!this.audioContext) {
        console.log('🎵 Step 1a: AudioContext missing, creating...');
        this.markUserInteracted();
        await this.initialize();
      }

      if (!this.audioContext) {
        console.error('❌ FAILED: AudioContext not available for click sound');
        this.soundErrors++;
        return;
      }

      console.log('🎵 Step 2: AudioContext state =', this.audioContext.state);
      
      // ALWAYS resume context before playing (critical for repeated plays)
      if (this.audioContext.state === 'suspended') {
        console.log('🎵 Step 2a: Resuming suspended AudioContext...');
        await this.audioContext.resume();
        console.log('🎵 Step 2b: AudioContext state after resume =', this.audioContext.state);
      }

      if (this.audioContext.state === 'running') {
        console.log('🎵 Step 3: Creating oscillator...');
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Click sound (short, crisp tone)
        oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        console.log('🎵 Step 4: Starting oscillator...');
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.05);
        
        // Clean up when oscillator ends
        oscillator.onended = () => {
          try {
            oscillator.disconnect();
            gainNode.disconnect();
          } catch (e) {
            // Already disconnected
          }
        };
        
        this.soundsPlayed++;
        const duration = Date.now() - startTime;
        console.log(`✅ SUCCESS: Click sound #${this.soundsPlayed} played in ${duration}ms`);
        console.log(`🔊 YOU SHOULD HEAR A CLICK NOW!`);
        console.log('🎵 <<<<<< CLICK SOUND END >>>>>>');
        console.log(`🔔 ═══════════════════════════════════════════════════\n`);
      } else {
        this.soundErrors++;
        console.error(`❌ FAILED: AudioContext state is ${this.audioContext.state}, not running`);
        console.error(`❌ REASON: AudioContext is ${this.audioContext.state} instead of running`);
        console.error(`❌ NO SOUND WILL PLAY!`);
        console.log('🎵 <<<<<< CLICK SOUND END (FAILED) >>>>>>');
        console.log(`🔔 ═══════════════════════════════════════════════════\n`);
      }
    } catch (error) {
      this.soundErrors++;
      const duration = Date.now() - startTime;
      console.error(`❌ FAILED: Error playing click sound after ${duration}ms:`, error);
      console.error(`❌ NO SOUND WILL PLAY!`);
      console.log('🎵 <<<<<< CLICK SOUND END (ERROR) >>>>>>');
      console.log(`🔔 ═══════════════════════════════════════════════════\n`);
    }
  }

  /**
   * Play a cart add sound for adding items to cart
   */
  static playCartAddSound() {
    const startTime = Date.now();
    console.log('🛒 >>>>>> CART ADD SOUND START <<<<<<');
    
    try {
      // Create AudioContext immediately if it doesn't exist (synchronously in user gesture)
      if (!this.audioContext) {
        console.log('🛒 Step 1a: AudioContext missing, creating SYNCHRONOUSLY...');
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
          this.isInitialized = true;
          this.userInteracted = true;
          console.log('🛒 Created AudioContext, state =', this.audioContext.state);
        }
      }

      if (!this.audioContext) {
        console.error('❌ FAILED: AudioContext not available');
        this.soundErrors++;
        return;
      }

      console.log('🛒 Step 2: AudioContext state =', this.audioContext.state);
      
      // Resume AudioContext (this must happen in user gesture context)
      // Don't await - just trigger it
      if (this.audioContext.state === 'suspended') {
        console.log('🛒 Step 2a: Resuming suspended AudioContext...');
        this.audioContext.resume().then(() => {
          console.log('🛒 AudioContext resumed, state =', this.audioContext!.state);
          // Try to play again after resume
          this.playCartAddSoundImmediate();
        });
        return; // Exit and let the resume callback handle the sound
      }

      this.playCartAddSoundImmediate();
      
    } catch (error) {
      this.soundErrors++;
      const duration = Date.now() - startTime;
      console.error(`❌ FAILED: Error playing cart add sound after ${duration}ms:`, error);
      console.log('🛒 <<<<<< CART ADD SOUND END (ERROR) >>>>>>');
      console.log(`🔔 ═══════════════════════════════════════════════════\n`);
    }
  }

  /**
   * Internal method to play cart sound immediately (assumes AudioContext is running)
   */
  private static playCartAddSoundImmediate() {
    const startTime = Date.now();
    
    try {
      if (!this.audioContext || this.audioContext.state !== 'running') {
        console.error(`❌ AudioContext not running: ${this.audioContext?.state || 'null'}`);
        return;
      }

      console.log('🛒 Step 3: Creating oscillator and gainNode...');
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      console.log('🛒 Step 4: Connecting nodes...');
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Cart add sound (pleasant chime) - LOUDER
      console.log('🛒 Step 5: Setting frequency and gain...');
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.05);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
      
      console.log('🛒 Step 6: Starting oscillator at time', this.audioContext.currentTime);
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.15);
      
      // Clean up when oscillator ends
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Already disconnected
        }
      };
      
      this.soundsPlayed++;
      const duration = Date.now() - startTime;
      console.log(`✅ SUCCESS: Cart add sound #${this.soundsPlayed} played in ${duration}ms`);
      console.log(`🔊 YOU SHOULD HEAR A SOUND NOW!`);
      console.log('🛒 <<<<<< CART ADD SOUND END >>>>>>');
      console.log(`🔔 ═══════════════════════════════════════════════════\n`);
    } catch (error) {
      this.soundErrors++;
      console.error('❌ Error in playCartAddSoundImmediate:', error);
    }
  }

  /**
   * Play a payment sound for successful transactions
   */
  static async playPaymentSound() {
    try {
      // Ensure AudioContext exists
      if (!this.audioContext) {
        this.markUserInteracted();
        await this.initialize();
      }

      if (!this.audioContext) {
        console.warn('⚠️ AudioContext not available for payment sound');
        this.soundErrors++;
        return;
      }

      // ALWAYS resume context before playing
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🔄 AudioContext resumed for payment');
      }

      if (this.audioContext.state === 'running') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Payment sound (cash register-like chime)
        oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
        oscillator.frequency.setValueAtTime(1047, this.audioContext.currentTime + 0.3); // C6
        
        gainNode.gain.setValueAtTime(0.25, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.4);
        
        // Clean up when oscillator ends
        oscillator.onended = () => {
          try {
            oscillator.disconnect();
            gainNode.disconnect();
          } catch (e) {
            // Already disconnected
          }
        };
        
        this.soundsPlayed++;
        console.log('✅ SoundManager: Payment sound #' + this.soundsPlayed);
      } else {
        this.soundErrors++;
        console.warn(`⚠️ SoundManager: AudioContext state is ${this.audioContext?.state || 'null'}`);
      }
    } catch (error) {
      this.soundErrors++;
      console.error('❌ SoundManager: Error playing payment sound:', error);
    }
  }

  /**
   * Play a delete/remove sound
   */
  static async playDeleteSound() {
    try {
      // Ensure AudioContext exists
      if (!this.audioContext) {
        this.markUserInteracted();
        await this.initialize();
      }

      if (!this.audioContext) {
        console.warn('⚠️ AudioContext not available for delete sound');
        this.soundErrors++;
        return;
      }

      // ALWAYS resume context before playing
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🔄 AudioContext resumed for delete');
      }

      if (this.audioContext.state === 'running') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Delete sound (descending tone)
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.1);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
        
        // Clean up when oscillator ends
        oscillator.onended = () => {
          try {
            oscillator.disconnect();
            gainNode.disconnect();
          } catch (e) {
            // Already disconnected
          }
        };
        
        this.soundsPlayed++;
        console.log('✅ SoundManager: Delete sound #' + this.soundsPlayed);
      } else {
        this.soundErrors++;
        console.warn(`⚠️ SoundManager: AudioContext state is ${this.audioContext?.state || 'null'}`);
      }
    } catch (error) {
      this.soundErrors++;
      console.error('❌ SoundManager: Error playing delete sound:', error);
    }
  }

  /**
   * Test function to verify sound functionality
   */
  static async testSound() {
    console.log('Testing sound functionality...');
    try {
      await this.playRemarkSound();
      console.log('✅ Sound test successful');
    } catch (error) {
      console.error('❌ Sound test failed:', error);
    }
  }
} 