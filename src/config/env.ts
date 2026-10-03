function flagEnabled(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const env = {
  apiUrl,
  // адрес бэкенда задан по умолчанию — ходим в него; моки включаются только при явном EXPO_PUBLIC_USE_MOCKS=1
  useMocks: flagEnabled(process.env.EXPO_PUBLIC_USE_MOCKS, false),
};
