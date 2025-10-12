import { useCallback } from 'react';
import { SoundManager } from '../../../lib/soundUtils';
import { useGeneralSettings } from '../../../hooks/usePOSSettings';

export type POSClickSoundType = 
  | 'click' 
  | 'cart-add' 
  | 'payment' 
  | 'delete' 
  | 'success' 
  | 'error';

export interface POSClickSoundsConfig {
  enabled: boolean;
  volume: number;
  sounds: {
    click: boolean;
    cartAdd: boolean;
    payment: boolean;
    delete: boolean;
    success: boolean;
    error: boolean;
  };
}

const defaultConfig: POSClickSoundsConfig = {
  enabled: true,
  volume: 0.5,
  sounds: {
    click: true,
    cartAdd: true,
    payment: true,
    delete: true,
    success: true,
    error: true,
  },
};

/**
 * Custom hook for managing POS click sounds
 */
export const usePOSClickSounds = (config: Partial<POSClickSoundsConfig> = {}) => {
  const { settings: generalSettings } = useGeneralSettings();
  
  // Use settings from POS configuration if available
  const settingsConfig: POSClickSoundsConfig = {
    enabled: generalSettings?.enable_sound_effects ?? defaultConfig.enabled,
    volume: generalSettings?.sound_volume ?? defaultConfig.volume,
    sounds: {
      click: generalSettings?.enable_click_sounds ?? defaultConfig.sounds.click,
      cartAdd: generalSettings?.enable_cart_sounds ?? defaultConfig.sounds.cartAdd,
      payment: generalSettings?.enable_payment_sounds ?? defaultConfig.sounds.payment,
      delete: generalSettings?.enable_delete_sounds ?? defaultConfig.sounds.delete,
      success: generalSettings?.enable_sound_effects ?? defaultConfig.sounds.success,
      error: generalSettings?.enable_sound_effects ?? defaultConfig.sounds.error,
    },
  };
  
  const finalConfig = { ...settingsConfig, ...config };

  const playSound = useCallback((soundType: POSClickSoundType) => {
    const timestamp = new Date().toISOString().split('T')[1];
    console.log(`\n🔔 ═══════════════════════════════════════════════════`);
    console.log(`🔔 SOUND EVENT @ ${timestamp}`);
    console.log(`🔔 Type: ${soundType}`);
    console.log(`🔔 Config - Enabled: ${finalConfig.enabled}`);
    console.log(`🔔 Config - ${soundType} enabled: ${finalConfig.sounds[soundType === 'cart-add' ? 'cartAdd' : soundType] ?? 'unknown'}`);
    console.log(`🔔 ═══════════════════════════════════════════════════`);
    
    if (!finalConfig.enabled) {
      console.error('❌ SOUND BLOCKED: Sounds globally disabled in config');
      console.log(`🔔 ═══════════════════════════════════════════════════\n`);
      return;
    }

    // Fire-and-forget - don't await, don't block
    try {
      switch (soundType) {
        case 'click':
          if (finalConfig.sounds.click) {
            console.log('✅ SOUND ALLOWED: Click sounds enabled, calling SoundManager...');
            SoundManager.playClickSound().catch(e => {
              console.error('❌ SOUND FAILED: Click sound error:', e);
              console.log(`🔔 ═══════════════════════════════════════════════════\n`);
            });
          } else {
            console.error('❌ SOUND BLOCKED: Click sounds disabled in config');
            console.log(`🔔 ═══════════════════════════════════════════════════\n`);
          }
          break;
        case 'cart-add':
          if (finalConfig.sounds.cartAdd) {
            console.log('✅ SOUND ALLOWED: Cart-add sounds enabled, calling SoundManager...');
            try {
              SoundManager.playCartAddSound();
            } catch (e) {
              console.error('❌ SOUND FAILED: Cart add sound error:', e);
              console.log(`🔔 ═══════════════════════════════════════════════════\n`);
            }
          } else {
            console.error('❌ SOUND BLOCKED: Cart sounds disabled in config');
            console.log(`🔔 ═══════════════════════════════════════════════════\n`);
          }
          break;
        case 'payment':
          if (finalConfig.sounds.payment) {
            console.log('✅ SOUND ALLOWED: Payment sounds enabled, calling SoundManager...');
            SoundManager.playPaymentSound().catch(e => {
              console.error('❌ SOUND FAILED: Payment sound error:', e);
              console.log(`🔔 ═══════════════════════════════════════════════════\n`);
            });
          } else {
            console.error('❌ SOUND BLOCKED: Payment sounds disabled in config');
            console.log(`🔔 ═══════════════════════════════════════════════════\n`);
          }
          break;
        case 'delete':
          if (finalConfig.sounds.delete) {
            console.log('✅ SOUND ALLOWED: Delete sounds enabled, calling SoundManager...');
            SoundManager.playDeleteSound().catch(e => {
              console.error('❌ SOUND FAILED: Delete sound error:', e);
              console.log(`🔔 ═══════════════════════════════════════════════════\n`);
            });
          } else {
            console.error('❌ SOUND BLOCKED: Delete sounds disabled in config');
            console.log(`🔔 ═══════════════════════════════════════════════════\n`);
          }
          break;
        case 'success':
          if (finalConfig.sounds.success) {
            SoundManager.playSuccessSound().catch(e => console.error('Success sound error:', e));
          }
          break;
        case 'error':
          if (finalConfig.sounds.error) {
            SoundManager.playErrorSound().catch(e => console.error('Error sound error:', e));
          }
          break;
        default:
          console.error(`❌ SOUND BLOCKED: Unknown sound type: ${soundType}`);
          console.log(`🔔 ═══════════════════════════════════════════════════\n`);
      }
    } catch (error) {
      console.error('❌ SOUND FAILED: Sound playback exception:', error);
      console.log(`🔔 ═══════════════════════════════════════════════════\n`);
    }
  }, [finalConfig]);

  const playClickSound = useCallback(() => playSound('click'), [playSound]);
  const playCartAddSound = useCallback(() => playSound('cart-add'), [playSound]);
  const playPaymentSound = useCallback(() => playSound('payment'), [playSound]);
  const playDeleteSound = useCallback(() => playSound('delete'), [playSound]);
  const playSuccessSound = useCallback(() => playSound('success'), [playSound]);
  const playErrorSound = useCallback(() => playSound('error'), [playSound]);

  return {
    playSound,
    playClickSound,
    playCartAddSound,
    playPaymentSound,
    playDeleteSound,
    playSuccessSound,
    playErrorSound,
    config: finalConfig,
  };
};

/**
 * Higher-order function to wrap click handlers with sound
 */
export const withClickSound = (
  handler: () => void,
  soundType: POSClickSoundType = 'click',
  soundConfig?: Partial<POSClickSoundsConfig>
) => {
  const { playSound } = usePOSClickSounds(soundConfig);
  
  return () => {
    playSound(soundType);
    handler();
  };
};

/**
 * Hook for POS-specific sound interactions
 */
export const usePOSInteractions = (soundConfig?: Partial<POSClickSoundsConfig>) => {
  const { playClickSound, playCartAddSound, playPaymentSound, playDeleteSound } = usePOSClickSounds(soundConfig);

  const handleAddToCart = useCallback((originalHandler: () => void) => {
    return () => {
      playCartAddSound();
      originalHandler();
    };
  }, [playCartAddSound]);

  const handlePayment = useCallback((originalHandler: () => void) => {
    return () => {
      playPaymentSound();
      originalHandler();
    };
  }, [playPaymentSound]);

  const handleDelete = useCallback((originalHandler: () => void) => {
    return () => {
      playDeleteSound();
      originalHandler();
    };
  }, [playDeleteSound]);

  const handleClick = useCallback((originalHandler: () => void) => {
    return () => {
      playClickSound();
      originalHandler();
    };
  }, [playClickSound]);

  return {
    handleAddToCart,
    handlePayment,
    handleDelete,
    handleClick,
  };
};
