import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, Row, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Bootstrap = {
  profile: { firstName: string; lastName: string; creditBalance: number };
  subscription: { planId: string; status: string } | null;
  projects: Array<{ id: string; name: string; type: string; industry: string | null; updatedAt: string }>;
};

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setError('');
    try { setData(await apiRequest<Bootstrap>('/api/v1/mobile/bootstrap', session.access_token)); }
    catch { setError('تعذر تحميل لوحة التطبيق. اسحب أو أعد المحاولة لاحقًا.'); }
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Screen>
      <Row><View style={styles.brandDot} /><Eyebrow>BRAND BOX AI</Eyebrow></Row>
      <Title>{data ? `مرحبًا ${data.profile.firstName || ''}` : 'مركز النمو الذكي'}</Title>
      <Muted>من الترند إلى فكرة، ومن الفكرة إلى محتوى ومشروع قابل للنشر.</Muted>
      {!data && !error ? <ActivityIndicator color={colors.red} /> : null}
      {error ? <Card><Text style={styles.error}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.link}>إعادة المحاولة</Text></Pressable></Card> : null}
      {data ? (
        <>
          <View style={styles.metrics}>
            <Card><Text style={styles.metric}>{data.profile.creditBalance}</Text><Muted>نقطة AI</Muted></Card>
            <Card><Text style={styles.metric}>{data.projects.length}</Text><Muted>مشروع نشط</Muted></Card>
          </View>
          <Card>
            <Eyebrow>CREATE FIRST</Eyebrow>
            <Text style={styles.cardTitle}>ابدأ من الهدف، وليس من الأداة.</Text>
            <Muted>أنشئ نصًا أو صورة أو فيديو، أو حوّل فرصة ترند إلى حملة تسويقية.</Muted>
            <Pressable style={styles.action} onPress={() => router.push('/(tabs)/create')}><Text style={styles.actionText}>فتح استوديو AI</Text></Pressable>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>السوشيال ميديا</Text>
            <Muted>اربط قنواتك عبر OAuth، ثم جهّز المحتوى للجدولة والنشر بعد اعتماد كل موصل.</Muted>
            <Pressable style={styles.secondary} onPress={() => router.push('/social')}><Text style={styles.secondaryText}>إدارة الحسابات المتصلة</Text></Pressable>
          </Card>
          <Text style={styles.section}>آخر المشاريع</Text>
          {data.projects.slice(0, 3).map((project) => <Card key={project.id}><Text style={styles.cardTitle}>{project.name}</Text><Muted>{project.industry || project.type}</Muted></Card>)}
        </>
      ) : null}
      <Pressable onPress={() => void signOut()} style={styles.signOut}><Text style={styles.signOutText}>تسجيل الخروج</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  metrics: { flexDirection: 'row-reverse', gap: space.sm },
  metric: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'right' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'right', lineHeight: 26 },
  section: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right', marginTop: 4 },
  action: { backgroundColor: colors.red, borderRadius: radius.md, padding: 14, marginTop: 4 },
  actionText: { color: colors.white, fontWeight: '800', textAlign: 'center' },
  secondary: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 14 },
  secondaryText: { color: colors.text, fontWeight: '800', textAlign: 'center' },
  error: { color: '#FF777D', textAlign: 'right' }, link: { color: colors.red, fontWeight: '800', textAlign: 'right' },
  signOut: { alignSelf: 'center', padding: 14 }, signOutText: { color: colors.textMuted, fontWeight: '700' },
});
