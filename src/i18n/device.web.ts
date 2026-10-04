/** Языки браузера по порядку предпочтения, затем Intl. */
export function preferredTags(): (string | undefined)[] {
  const tags: (string | undefined)[] = [];
  if (typeof navigator !== 'undefined') tags.push(...(navigator.languages ?? []), navigator.language);
  try {
    tags.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Intl недоступен — останется английский
  }
  return tags;
}
