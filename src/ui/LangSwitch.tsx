import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type PressableStateCallbackType } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { c, font } from '@/design/theme';
import { useLayout } from '@/hooks/useLayout';
import { LANGS, useLangStore, useT, type Lang } from '@/i18n';

import { GlassButton, GlassSurface } from './Glass';

function Check() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

/**
 * Переключатель языка в шапке: стеклянная кнопка с кодом языка (на широком экране — ещё и глобус).
 * Нажатие открывает меню под кнопкой: самоназвания языков и галочка у текущего. Закрывается выбором или нажатием мимо.
 */
export function LangSwitch() {
  const t = useT('common');
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const { wide, width } = useLayout();
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  // меню стоит под кнопкой, прижато к её правому краю: координаты окна, Modal рисуется поверх всего экрана
  const [at, setAt] = useState({ top: 0, right: 0 });
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  const show = () => {
    const node = anchor.current;
    if (!node) return;
    node.measureInWindow((x, y, w, h) => {
      setAt({ top: y + h + 8, right: Math.max(8, width - x - w) });
      setOpen(true);
    });
  };
  const pick = (id: Lang) => {
    setOpen(false);
    if (id !== lang) setLang(id);
  };

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <GlassButton icon={wide ? 'globe' : undefined} title={current.code} label={t('languageNow', { name: current.name })} onPress={show} />
      </View>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel={t('close')} />
        <GlassSurface round={18} style={[styles.menu, at]}>
          <View accessibilityRole="menu" accessibilityLabel={t('language')} style={styles.list}>
            {LANGS.map((l) => {
              const on = l.id === lang;
              return (
                <Pressable
                  key={l.id}
                  accessibilityRole="menuitem"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={l.name}
                  onPress={() => pick(l.id)}
                  style={(state) => {
                    // в вебе Pressable сообщает и наведение мыши
                    const { pressed, hovered } = state as PressableStateCallbackType & { hovered?: boolean };
                    return [styles.item, (pressed || hovered) && styles.itemHover];
                  }}>
                  <Text style={styles.code}>{l.code}</Text>
                  <Text style={[styles.name, on && styles.nameOn]} numberOfLines={1}>
                    {l.name}
                  </Text>
                  <View style={styles.check}>{on ? <Check /> : null}</View>
                </Pressable>
              );
            })}
          </View>
        </GlassSurface>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menu: { position: 'absolute', minWidth: 200 },
  list: { padding: 6, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingLeft: 12, paddingRight: 10, borderRadius: 12 },
  itemHover: { backgroundColor: 'rgba(42,36,28,0.08)' },
  code: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.8, color: c.graphite, width: 24 },
  name: { fontFamily: font.medium, fontSize: 16, color: c.ink, flex: 1 },
  nameOn: { fontFamily: font.bold },
  check: { width: 18, alignItems: 'center' },
});
