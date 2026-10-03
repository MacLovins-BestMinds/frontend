import { useWindowDimensions } from 'react-native';

/** Одна вёрстка на сайт и приложение: wide — раскладка для компьютера, иначе телефонная. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  return { width, height, wide, pad: wide ? 32 : 20 };
}
