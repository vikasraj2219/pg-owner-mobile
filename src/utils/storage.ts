import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Universal safe storage wrapper:
 * Uses SecureStore on native devices (Android/iOS) and AsyncStorage on Web/unsupported environments.
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
    try {
      return await SecureStore.getItemAsync(key);
    } catch (_err) {
      try {
        return await AsyncStorage.getItem(key);
      } catch (_innerErr) {
        return null;
      }
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (_err) {
        // Fallback
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (_err) {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (_innerErr) {
        // Fallback
      }
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        await AsyncStorage.removeItem(key);
      } catch (_err) {
        // Fallback
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (_err) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (_innerErr) {
        // Fallback
      }
    }
  },
};
