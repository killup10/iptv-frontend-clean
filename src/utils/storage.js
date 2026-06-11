// src/utils/storage.js
import { Preferences } from '@capacitor/preferences';

const isCapacitor = () => !!window.Capacitor;

export const storage = {
  async getItem(key) {
    try {
      if (isCapacitor()) {
        const { value } = await Preferences.get({ key });
        return value;
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Storage error getting item ${key}:`, error);
      return localStorage.getItem(key);
    }
  },

  async setItem(key, value) {
    try {
      const stringValue = String(value);
      if (isCapacitor()) {
        await Preferences.set({ key, value: stringValue });
      } else {
        localStorage.setItem(key, stringValue);
      }
    } catch (error) {
      console.error(`Storage error setting item ${key}:`, error);
      localStorage.setItem(key, String(value));
    }
  },

  async removeItem(key) {
    try {
      if (isCapacitor()) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Storage error removing item ${key}:`, error);
      localStorage.removeItem(key);
    }
  }
};
