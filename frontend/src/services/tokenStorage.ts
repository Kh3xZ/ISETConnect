import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'isetconnect_token';


const webStorage = (): Storage | undefined => (globalThis as { localStorage?: Storage }).localStorage;

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return webStorage()?.getItem(KEY) ?? null;
    return SecureStore.getItemAsync(KEY);
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') webStorage()?.setItem(KEY, token);
    else await SecureStore.setItemAsync(KEY, token);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') webStorage()?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  },
};
