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
    // Mark user interaction on any user action and force init AudioContext
    const markInteraction = async () => {
      this.markUserInteracted();
      
      // Force create AudioContext immediately on first interaction
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext && !this.audioContext) {
          this.audioContext = new AudioContext();
          
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
          
          this.isInitialized = true;
          
          // Keep AudioContext alive by resuming it periodically
          this.startKeepAlive();
        }
      } catch (error) {
        // Silently handle - user will be notified if sounds don't work
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
        } catch (error) {
          // Silently handle - context will retry on next interaction
        }
      }
    }, 1000); // Check every second
    

  }

  /**
   * Stop the keep-alive interval
   */
  static stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;

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
          this.isInitialized = true;
          return;
        }

        this.audioContext = new AudioContext();
        
        // Resume the context if it's suspended
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        this.isInitialized = true;
      }
    } catch (error) {
      this.isInitialized = true;
    }
  }

  /**
   * Mark that user has interacted (call this on first user action)
   */
  static markUserInteracted() {
    if (!this.userInteracted) {
      this.userInteracted = true;
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
    console.log('🎵 SoundManager Status:', stats);
  }

  /**
   * Force mark user interaction (for testing purposes)
   */
  static forceUserInteraction() {
    this.userInteracted = true;
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
      // No audio element fallback - gracefully fail
    } catch (error) {
      // Silently handle
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
    try {
      // Ensure AudioContext exists
      if (!this.audioContext) {
        this.markUserInteracted();
        await this.initialize();
      }

      if (!this.audioContext) {
        this.soundErrors++;
        return;
      }
      
      // ALWAYS resume context before playing (critical for repeated plays)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.audioContext.state === 'running') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Click sound (short, crisp tone)
        oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
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
      } else {
        this.soundErrors++;
      }
    } catch (error) {
      this.soundErrors++;
    }
  }

  /**
   * Play a cart add sound for adding items to cart
   */
  static playCartAddSound() {
    try {
      // Create AudioContext immediately if it doesn't exist (synchronously in user gesture)
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
          this.isInitialized = true;
          this.userInteracted = true;
        }
      }

      if (!this.audioContext) {
        this.soundErrors++;
        return;
      }
      
      // Resume AudioContext (this must happen in user gesture context)
      // Don't await - just trigger it
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          // Try to play again after resume
          this.playCartAddSoundImmediate();
        });
        return; // Exit and let the resume callback handle the sound
      }

      this.playCartAddSoundImmediate();
    } catch (error) {
      this.soundErrors++;
    }
  }

  /**
   * Internal method to play cart sound immediately (assumes AudioContext is running)
   */
  private static playCartAddSoundImmediate() {
    try {
      if (!this.audioContext || this.audioContext.state !== 'running') {
        return;
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Cart add sound (pleasant chime)
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.05);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
      
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
    } catch (error) {
      this.soundErrors++;
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
        this.soundErrors++;
        return;
      }

      // ALWAYS resume context before playing
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
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
      } else {
        this.soundErrors++;
      }
    } catch (error) {
      this.soundErrors++;
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
        this.soundErrors++;
        return;
      }

      // ALWAYS resume context before playing
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
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
      } else {
        this.soundErrors++;
      }
    } catch (error) {
      this.soundErrors++;
    }
  }

  /**
   * Test function to verify sound functionality
   */
  static async testSound() {
    try {
      await this.playRemarkSound();
    } catch (error) {
      console.error('❌ Sound test failed:', error);
    }
  }
} 