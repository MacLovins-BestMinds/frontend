import { Alert } from 'react-native';

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Подпись кнопки согласия: «Закончить раунд», «Остановить». */
  ok: string;
  cancel: string;
  /** Действие что-то теряет — на iOS кнопка красная. */
  destructive?: boolean;
};

/** Подтверждение необратимого действия системным диалогом; true — человек согласился. */
export function confirm({ title, message, ok, cancel, destructive }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: ok, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
