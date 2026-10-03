# Stage Zero

Мобильный тренажёр выступлений. Каркас на Expo SDK 57, TypeScript и expo-router. Экраны игры ещё не собраны — см. `docs/tz/`.

Камера, микрофон и детектор лица — нативные модули. Expo Go их не запускает, нужен development build.

Нужен Node `>= 22.13` (в репозитории `.nvmrc` — 24). На 22.12 React Native 0.86 не ставится.

## Старт

```sh
nvm use
npm install
cp .env.example .env
npx expo prebuild
npm run ios
# или
npm run android
```

`npm start` поднимает Metro для уже установленного development build.

`ios/` и `android/` генерирует `npx expo prebuild`, в git они не коммитятся.

Детектор лица на симуляторе iOS 26 не заводится: у ML Kit нет ARM64-среза. Проверять на устройстве.

## Окружение

| Переменная | Зачем |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | HTTPS-адрес бэкенда |
| `EXPO_PUBLIC_USE_MOCKS` | `1` — моки, `0` — реальный API |

Читаются в `src/config/env.ts`.
