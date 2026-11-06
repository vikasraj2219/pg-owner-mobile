import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Universal safe storage wrapper:
 * Uses AsyncStorage as resilient primary storage, with SecureStore hardware encryption for native credentials.
 * Handles Android 2KB SecureStore size limits seamlessly.
 */
export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return await AsyncStorage.getItem(key);
      } catch (_err) {
        return null;
      }
    }

    // Try SecureStore first
    try {
      const secureVal = await SecureStore.getItemAsync(key);
      if (secureVal !== null && secureVal !== undefined) {
        return secureVal;
      }
    } catch (_err) {
      // SecureStore failed or unavailable; fall through to AsyncStorage
    }

    // Fall back to AsyncStorage
    try {
      return await AsyncStorage.getItem(key);
    } catch (_innerErr) {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    // Always persist to AsyncStorage to ensure data is never lost due to size limits
    try {
      await AsyncStorage.setItem(key, value);
    } catch (_err) {
      // ignore
    }

    if (Platform.OS !== 'web') {
      try {
        // SecureStore has a 2048-byte limit on Android; only store if within safe range
        if (value.length < 2000) {
          await SecureStore.setItemAsync(key, value);
        } else {
          // Clean up any stale small entry from SecureStore
          await SecureStore.deleteItemAsync(key).catch(() => {});
        }
      } catch (_err) {
        // Size limit or Keystore error; AsyncStorage already safely holds the data
      }
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (_err) {
      // ignore
    }

    if (Platform.OS !== 'web') {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (_err) {
        // ignore
      }
    }
  },
};
