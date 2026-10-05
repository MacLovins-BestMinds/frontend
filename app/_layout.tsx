import { Rubik_400Regular, Rubik_500Medium, Rubik_500Medium_Italic, Rubik_600SemiBold, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { ShantellSans_700Bold, ShantellSans_800ExtraBold } from '@expo-google-fonts/shantell-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';

import { c } from '@/design/theme';

export default function RootLayout() {
  const [ready, fontError] = useFonts({
    ShantellSans_700Bold,
    ShantellSans_800ExtraBold,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_500Medium_Italic,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });
  // пока шрифты грузятся — пустой кремовый экран, чтобы текст не прыгал; не загрузились — системными шрифтами
  if (!ready && !fontError) return <View style={{ flex: 1, backgroundColor: c.cream }} />;
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
        {/* лендинг — только для тех, кто ещё не вошёл: вошедшего он сразу отправляет во вкладки */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        {/* вкладки «Главная» и «Профиль» — дом вошедшего; назад на лендинг с них не уводим */}
        <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
        {/* сцена, жюри и разбор — один раунд: открываются плавно, как занавес, и свайпом их не закрыть, чтобы не оборвать запись */}
        {/* подготовка: свайп назад только от края — по всему экрану он мешал бы писать заметки и листать слайды */}
        <Stack.Screen name="prep" options={{ fullScreenGestureEnabled: false }} />
        <Stack.Screen name="stage" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="jury" options={{ animation: 'fade', gestureEnabled: false }} />
        {/* разбор только что сыгранного раунда выезжает снизу как финал, свайпом не закрывается (выход — «домой» в углу);
            разбор из истории (/result?round=<id>) — обычная страница: выезжает справа, свайп назад возвращает в профиль */}
        <Stack.Screen
          name="result"
          options={({ route }) => ((route.params as { round?: string } | undefined)?.round ? {} : { animation: 'slide_from_bottom', gestureEnabled: false })}
        />
      </Stack>
    </>
  );
}
