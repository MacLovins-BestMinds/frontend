import { Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { ShantellSans_700Bold, ShantellSans_800ExtraBold } from '@expo-google-fonts/shantell-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

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
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: c.cream } }} />
    </>
  );
}
