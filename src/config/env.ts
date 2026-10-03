function flagEnabled(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  useMocks: flagEnabled(process.env.EXPO_PUBLIC_USE_MOCKS, true),
};
