import { Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { ShantellSans_700Bold, ShantellSans_800ExtraBold } from '@expo-google-fonts/shantell-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';

import { c } from '@/design/theme';

export default function RootLayout() {
  const [ready] = useFonts({
    ShantellSans_700Bold,
    ShantellSans_800ExtraBold,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });
  // пока шрифты грузятся — пустой кремовый экран, чтобы текст не прыгал
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.cream }} />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.cream },
          // iOS: системный переход — новый экран выезжает справа поверх, прежний уходит назад в тень,
          // свайп от края возвращает. Android: выезд справа. В браузере экран появляется сам (Page)
          animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        {/* после входа назад на лендинг не уводим */}
        <Stack.Screen name="menu" options={{ animation: 'fade', gestureEnabled: false }} />
        {/* сцена, жюри и разбор — один раунд: открываются плавно, как занавес, и свайпом их не закрыть, чтобы не оборвать запись */}
        <Stack.Screen name="stage" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="jury" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      </Stack>
    </>
  );
}
