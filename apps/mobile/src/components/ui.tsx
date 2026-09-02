import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = scroll
    ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={styles.content}>{children}</View>;
  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: PropsWithChildren) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress(): void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.lg, gap: space.md, paddingBottom: 44, flexGrow: 1 },
  eyebrow: { color: colors.red, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textAlign: 'right' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 38, textAlign: 'right' },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 22, textAlign: 'right' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.sm },
  button: { minHeight: 50, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  row: { flexDirection: 'row-reverse', gap: space.sm, alignItems: 'center' },
});
