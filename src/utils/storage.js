// src/utils/storage.js
import { Preferences } from '@capacitor/preferences';

const isCapacitor = () => {
  try {
    return Boolean(
      (typeof window !== 'undefined' && window.Capacitor) ||
      (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform && window.Capacitor.isNativePlatform())
    );
  } catch {
    return false;
  }
};

export const storage = {
  async getItem(key) {
    try {
      if (isCapacitor()) {
        try {
          const { value } = await Preferences.get({ key });
          if (value !== null && value !== undefined && value !== '') {
            return value;
          }
        } catch (prefErr) {
          console.warn(`Preferences.get error for ${key}:`, prefErr);
        }
      }
      return typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(key)
        : null;
    } catch (error) {
      console.error(`Storage error getting item ${key}:`, error);
      return typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(key)
        : null;
    }
  },

  async setItem(key, value) {
    const stringValue = String(value);
    try {
      if (isCapacitor()) {
        try {
          await Preferences.set({ key, value: stringValue });
        } catch (prefErr) {
          console.warn(`Preferences.set error for ${key}:`, prefErr);
        }
      }
    } catch (e) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, stringValue);
      }
    } catch (error) {
      console.error(`Storage error setting localStorage item ${key}:`, error);
    }
  },

  async removeItem(key) {
    try {
      if (isCapacitor()) {
        try {
          await Preferences.remove({ key });
        } catch (prefErr) {
          console.warn(`Preferences.remove error for ${key}:`, prefErr);
        }
      }
    } catch (e) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Storage error removing localStorage item ${key}:`, error);
    }
  }
};

