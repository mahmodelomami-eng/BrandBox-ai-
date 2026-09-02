import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;

function safeKey(key: string) {
  return `bb_${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

async function nativeRemove(key: string) {
  const base = safeKey(key);
  const rawCount = await SecureStore.getItemAsync(`${base}.count`);
  const count = Math.max(0, Number(rawCount || 0));
  await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${base}.${index}`)));
  await SecureStore.deleteItemAsync(`${base}.count`);
}

export const sessionStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    const base = safeKey(key);
    const rawCount = await SecureStore.getItemAsync(`${base}.count`);
    const count = Math.max(0, Number(rawCount || 0));
    if (!count) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${base}.${index}`))
    );
    if (chunks.some((item) => item === null)) return null;
    return chunks.join('');
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    await nativeRemove(key);
    const base = safeKey(key);
    const chunks = Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) }, (_, index) =>
      value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
    );
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${base}.${index}`, chunk)));
    await SecureStore.setItemAsync(`${base}.count`, String(chunks.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    return nativeRemove(key);
  },
};
