// Minimal in-memory AsyncStorage shim for the headless smoke test.
const store = new Map<string, string>();

export default {
  async getItem(key: string): Promise<string | null> {
    return store.get(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach((key) => store.delete(key));
  },
  async getAllKeys(): Promise<string[]> {
    return [...store.keys()];
  },
};
