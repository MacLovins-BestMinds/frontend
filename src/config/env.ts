function flagEnabled(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

export const env = {
  apiUrl,
  // адрес бэкенда задан — ходим в него; моки по умолчанию только без адреса
  useMocks: flagEnabled(process.env.EXPO_PUBLIC_USE_MOCKS, apiUrl === ''),
};
