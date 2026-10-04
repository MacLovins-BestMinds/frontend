import Constants from 'expo-constants';
import { Platform } from 'react-native';

function flagEnabled(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

/**
 * На телефоне localhost — это сам телефон. В разработке подменяем его адресом компьютера,
 * с которого приложение уже грузит код через Metro (hostUri вида "172.20.10.8:8081").
 */
function reachable(url: string): string {
  if (Platform.OS === 'web' || !__DEV__) return url;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!host) return url;
  return url.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, `//${host}`);
}

const apiUrl = reachable(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000');

export const env = {
  apiUrl,
  // адрес бэкенда задан по умолчанию — ходим в него; моки включаются только при явном EXPO_PUBLIC_USE_MOCKS=1
  useMocks: flagEnabled(process.env.EXPO_PUBLIC_USE_MOCKS, false),
};
