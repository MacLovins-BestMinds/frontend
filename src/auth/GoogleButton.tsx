export type GoogleButtonProps = {
  /** Client ID приложения в Google — его отдаёт бэкенд (/api/auth/config). */
  clientId: string;
  /** Google вернул ID-токен вошедшего человека — его проверяет бэкенд. */
  onToken: (idToken: string) => void;
  onError: (message: string) => void;
};

/**
 * Кнопка «Continue with Google». В приложении её пока нет: нужен отдельный Client ID под iOS/Android
 * и development build. В браузере работает GoogleButton.web.tsx.
 */
export function GoogleButton(_props: GoogleButtonProps) {
  return null;
}
