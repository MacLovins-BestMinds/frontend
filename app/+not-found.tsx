import { Redirect } from 'expo-router';

/**
 * Неизвестный адрес (опечатка, старая ссылка): ведём на главную, а не на служебную страницу expo-router.
 * Лендинг сам отправит вошедшего на «Главную».
 */
export default function NotFound() {
  return <Redirect href="/" />;
}
