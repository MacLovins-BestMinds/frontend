import { useRef, useState } from 'react';
import { ActionSheetIOS, Modal, Platform, Pressable, StyleSheet, Text, View, type PressableStateCallbackType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { c, font, outline } from '@/design/theme';
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

/** Строки выбора: код, самоназвание и галочка у текущего — одни и те же в меню сайта и в листе Android. */
function Options({ lang, onPick }: { lang: Lang; onPick: (id: Lang) => void }) {
  return (
    <>
      {LANGS.map((l) => {
        const on = l.id === lang;
        return (
          <Pressable
            key={l.id}
            accessibilityRole="menuitem"
            accessibilityState={{ checked: on }}
            accessibilityLabel={l.name}
            onPress={() => onPick(l.id)}
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
    </>
  );
}

/**
 * Переключатель языка в шапке: стеклянная кнопка с кодом языка (на широком экране — ещё и глобус).
 * - iOS — системный лист действий (ActionSheet) с галочкой у текущего языка и «Отмена»;
 * - Android — лист снизу экрана: языки и «Отмена», закрывается выбором, «Отменой», нажатием мимо и кнопкой «назад»;
 * - браузер — меню под кнопкой, закрывается выбором или нажатием мимо.
 * Ничего не измеряет на телефоне: лист всегда снизу, поэтому не может оказаться за краем экрана.
 */
export function LangSwitch() {
  const t = useT('common');
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const { wide, width } = useLayout();
  const insets = useSafeAreaInsets();
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  // меню браузера стоит под кнопкой, прижато к её правому краю: координаты окна, Modal рисуется поверх всего экрана
  const [at, setAt] = useState({ top: 0, right: 0 });
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  const pick = (id: Lang) => {
    setOpen(false);
    if (id !== lang) setLang(id);
  };

  const show = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: t('language'), options: [...LANGS.map((l) => (l.id === lang ? `✓ ${l.name}` : l.name)), t('cancel')], cancelButtonIndex: LANGS.length },
        (index) => {
          if (index < LANGS.length) pick(LANGS[index].id);
        },
      );
      return;
    }
    if (Platform.OS !== 'web') return setOpen(true);
    const node = anchor.current;
    if (!node) return;
    node.measureInWindow((x, y, w, h) => {
      setAt({ top: y + h + 8, right: Math.max(8, width - x - w) });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <GlassButton icon={wide ? 'globe' : undefined} title={current.code} label={t('languageNow', { name: current.name })} onPress={show} />
      </View>
      {Platform.OS === 'web' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel={t('close')} />
          <GlassSurface round={18} style={[styles.menu, at]}>
            <View accessibilityRole="menu" accessibilityLabel={t('language')} style={styles.list}>
              <Options lang={lang} onPick={pick} />
            </View>
          </GlassSurface>
        </Modal>
      ) : Platform.OS === 'android' ? (
        <Modal visible={open} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
          <View style={styles.sheetRoot}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel={t('close')} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} accessibilityRole="menu" accessibilityLabel={t('language')}>
              <View style={styles.grip} />
              <Text style={styles.sheetTitle}>{t('language')}</Text>
              <Options lang={lang} onPick={pick} />
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={({ pressed }) => [styles.cancel, pressed && styles.itemHover]}>
                <Text style={styles.cancelText}>{t('cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  menu: { position: 'absolute', minWidth: 200 },
  list: { padding: 6, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingLeft: 12, paddingRight: 10, borderRadius: 12 },
  itemHover: { backgroundColor: 'rgba(42,36,28,0.08)' },
  code: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.8, color: c.graphite, width: 24 },
  name: { fontFamily: font.medium, fontSize: 16, color: c.ink, flex: 1 },
  nameOn: { fontFamily: font.bold },
  check: { width: 18, alignItems: 'center' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,20,24,0.45)' },
  sheet: { backgroundColor: c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 12, paddingTop: 8, gap: 2, ...outline, borderBottomWidth: 0 },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.onInkMuted, marginBottom: 8 },
  sheetTitle: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: c.burnt, paddingHorizontal: 12, paddingBottom: 4 },
  cancel: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(42,36,28,0.2)' },
  cancelText: { fontFamily: font.bold, fontSize: 16, color: c.ink },
});
