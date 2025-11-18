const isCapacitor = () => !!window.Capacitor;

export const storage = {
  async getItem(key) {
    try {
      if (isCapacitor()) {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key });
        return value;
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Storage error getting item ${key}:`, error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (isCapacitor()) {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key, value: String(value) });
      } else {
        localStorage.setItem(key, String(value));
      }
    } catch (error) {
      console.error(`Storage error setting item ${key}:`, error);
    }
  },

  async removeItem(key) {
    try {
      if (isCapacitor()) {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Storage error removing item ${key}:`, error);
    }
  }
};
