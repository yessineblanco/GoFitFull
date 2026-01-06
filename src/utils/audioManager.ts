import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let beepSound: Audio.Sound | null = null;
let warningSound: Audio.Sound | null = null;
let completionSound: Audio.Sound | null = null;

/**
 * Initialize audio manager - sets audio mode
 */
export const initializeAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  } catch (error) {
    console.warn('Failed to initialize audio:', error);
  }
};

/**
 * Play a short beep sound (timer start)
 */
export const playStartBeep = async (enabled: boolean = true) => {
  if (!enabled) return;
  
  try {
    // Use haptic feedback (works on all devices)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Note: Audio files can be added later. For now, using haptic only.
    // To add audio: place sound files in assets/sounds/ and uncomment below
    /*
    if (beepSound) {
      await beepSound.unloadAsync();
    }
    
    beepSound = new Audio.Sound();
    await beepSound.loadAsync(require('@/assets/sounds/beep.mp3'), {
      shouldPlay: true,
      volume: 0.5,
    });
    */
  } catch (error) {
    // Fallback: Use haptic only if audio fails
    console.warn('Audio play failed, using haptic only:', error);
  }
};

/**
 * Play warning beep (10s, 5s remaining)
 */
export const playWarningBeep = async (enabled: boolean = true) => {
  if (!enabled) return;
  
  try {
    // Use haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Note: Audio files can be added later. For now, using haptic only.
    /*
    if (warningSound) {
      await warningSound.unloadAsync();
    }
    
    warningSound = new Audio.Sound();
    await warningSound.loadAsync(require('@/assets/sounds/warning.mp3'), {
      shouldPlay: true,
      volume: 0.6,
    });
    */
  } catch (error) {
    console.warn('Warning sound failed:', error);
  }
};

/**
 * Play completion sound
 */
export const playCompletionSound = async (enabled: boolean = true) => {
  if (!enabled) return;
  
  try {
    // Use haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Note: Audio files can be added later. For now, using haptic only.
    /*
    if (completionSound) {
      await completionSound.unloadAsync();
    }
    
    completionSound = new Audio.Sound();
    await completionSound.loadAsync(require('@/assets/sounds/complete.mp3'), {
      shouldPlay: true,
      volume: 0.7,
    });
    */
  } catch (error) {
    console.warn('Completion sound failed:', error);
  }
};

/**
 * Play haptic feedback
 */
export const playHaptic = async (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning',
  enabled: boolean = true
) => {
  if (!enabled) return;
  
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch (error) {
    // Haptics might not be available on all devices
    console.warn('Haptic feedback failed:', error);
  }
};

/**
 * Cleanup audio resources
 */
export const cleanupAudio = async () => {
  try {
    if (beepSound) {
      await beepSound.unloadAsync();
      beepSound = null;
    }
    if (warningSound) {
      await warningSound.unloadAsync();
      warningSound = null;
    }
    if (completionSound) {
      await completionSound.unloadAsync();
      completionSound = null;
    }
  } catch (error) {
    console.warn('Audio cleanup failed:', error);
  }
};

