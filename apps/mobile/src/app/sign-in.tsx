import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Screen, Eyebrow, Title, Muted, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, space } from '@/theme/tokens';

export default function SignInScreen() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (session) return <Redirect href="/(tabs)" />;

  async function submit() {
    setError('');
    setBusy(true);
    try { await signIn(email, password); }
    catch { setError('تعذر تسجيل الدخول. تحقق من البيانات وحالة الحساب.'); }
    finally { setBusy(false); }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Eyebrow>BRAND BOX AI</Eyebrow>
        <Title>مساحة نمو وتسويق مدعومة بالذكاء الاصطناعي.</Title>
        <Muted>نفس حساب Brand Box، ونفس الرصيد والمشاريع. لا يوجد حساب منفصل للتطبيق.</Muted>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>البريد الإلكتروني</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholder="name@example.com" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>كلمة المرور</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor={colors.textMuted} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {busy ? <ActivityIndicator color={colors.red} /> : <PrimaryButton label="دخول" onPress={submit} disabled={!email || !password} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 70, gap: space.md },
  form: { marginTop: 24, gap: space.sm, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  label: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  input: { minHeight: 52, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, color: colors.text, textAlign: 'right' },
  error: { color: '#FF777D', textAlign: 'right', lineHeight: 20 },
});
