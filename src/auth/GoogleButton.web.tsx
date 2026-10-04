import { createElement, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GoogleButtonProps } from './GoogleButton';

const SCRIPT = 'https://accounts.google.com/gsi/client';

type GoogleId = {
  initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
};

let loading: Promise<GoogleId> | null = null;

/** Скрипт Google Identity Services грузится один раз, когда кнопка впервые нужна. */
function loadGoogle(): Promise<GoogleId> {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const ready = () => (window as unknown as { google?: { accounts: { id: GoogleId } } }).google?.accounts.id;
    const existing = ready();
    if (existing) return resolve(existing);
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => {
      const id = ready();
      if (id) resolve(id);
      else reject(new Error('Google sign-in did not load'));
    };
    script.onerror = () => reject(new Error('Google sign-in did not load'));
    document.head.appendChild(script);
  });
  loading.catch(() => (loading = null)); // не загрузилось — при следующем открытии попробуем снова
  return loading;
}

/** Кнопка «Continue with Google», браузер: её рисует сам Google, нам возвращается ID-токен. */
export function GoogleButton({ clientId, onToken, onError }: GoogleButtonProps) {
  const slot = useRef<HTMLDivElement | null>(null);
  const handlers = useRef({ onToken, onError });
  handlers.current = { onToken, onError };

  useEffect(() => {
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled || !slot.current) return;
        google.initialize({
          client_id: clientId,
          callback: (response) => (response.credential ? handlers.current.onToken(response.credential) : handlers.current.onError('Google did not return an account')),
        });
        google.renderButton(slot.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'center', width: 320 });
      })
      .catch((e: Error) => !cancelled && handlers.current.onError(e.message));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return <View style={styles.wrap}>{createElement('div', { ref: slot, style: { minHeight: 44 } })}</View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
