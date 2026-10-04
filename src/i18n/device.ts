import { Platform, Settings } from 'react-native';

/** Языки устройства по порядку предпочтения: настройки iOS (в том числе язык одного приложения), затем Intl. */
export function preferredTags(): (string | undefined)[] {
  const tags: (string | undefined)[] = [];
  if (Platform.OS === 'ios') {
    try {
      tags.push((Settings.get('AppleLanguages') as string[] | undefined)?.[0]);
    } catch {
      // настроек нет — смотрим Intl
    }
  }
  try {
    tags.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Intl недоступен — останется английский
  }
  return tags;
}
