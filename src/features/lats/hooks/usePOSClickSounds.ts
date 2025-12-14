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
    if (!finalConfig.enabled) {
      return;
    }

    // Fire-and-forget - don't await, don't block
    try {
      switch (soundType) {
        case 'click':
          if (finalConfig.sounds.click) {
            SoundManager.playClickSound().catch(() => {});
          }
          break;
        case 'cart-add':
          if (finalConfig.sounds.cartAdd) {
            try {
              SoundManager.playCartAddSound();
            } catch (e) {
              // Silent catch
            }
          }
          break;
        case 'payment':
          if (finalConfig.sounds.payment) {
            SoundManager.playPaymentSound().catch(() => {});
          }
          break;
        case 'delete':
          if (finalConfig.sounds.delete) {
            SoundManager.playDeleteSound().catch(() => {});
          }
          break;
        case 'success':
          if (finalConfig.sounds.success) {
            SoundManager.playSuccessSound().catch(() => {});
          }
          break;
        case 'error':
          if (finalConfig.sounds.error) {
            SoundManager.playErrorSound().catch(() => {});
          }
          break;
      }
    } catch (error) {
      // Silent catch - don't log in production
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
