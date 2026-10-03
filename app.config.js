// Дополняет app.json тем, что у каждого своё. Expo CLI читает .env до этого файла.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    // Команда подписи из Xcode. Без неё `expo prebuild` сбрасывает выбранную команду.
    appleTeamId: process.env.APPLE_TEAM_ID || undefined,
  },
});
