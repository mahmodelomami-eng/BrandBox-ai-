import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius } from '@/theme/tokens';

type Provider = { id: string; name: string; oauthConfigured: boolean; publishingEnabled: boolean; capabilities: string[] };

export default function SocialScreen() {
  const { session } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session?.access_token) return;
    apiRequest<{ providers: Provider[] }>('/api/v1/social/providers', session.access_token).then((data) => setProviders(data.providers)).finally(() => setLoading(false));
  }, [session?.access_token]);

  return <Screen><Eyebrow>SOCIAL CONNECTIONS</Eyebrow><Title>قنواتك، بصلاحيات أقل وأمان أعلى.</Title><Muted>أسرار OAuth وتوكنات المزود لا تدخل حزمة التطبيق. واجهة الهاتف تعتمد على حالة الجاهزية التي يقررها الخادم.</Muted><Pressable style={styles.planner} onPress={() => router.push('/planner')}><Text style={styles.plannerText}>فتح مخطط المحتوى</Text></Pressable>{loading ? <ActivityIndicator color={colors.red} /> : null}{providers.map((provider) => <Card key={provider.id}><Text style={styles.name}>{provider.name}</Text><Text style={[styles.state, provider.oauthConfigured ? styles.ready : styles.wait]}>{provider.oauthConfigured ? 'OAuth جاهز' : 'يحتاج إعداد واعتماد'}</Text><Muted>{provider.publishingEnabled ? 'النشر المباشر مفعّل من الخادم.' : 'النشر المباشر غير مفعّل حتى اكتمال الاعتماد.'}</Muted><Text style={styles.cap}>{provider.capabilities.join(' • ')}</Text></Card>)}</Screen>;
}

const styles = StyleSheet.create({ planner: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }, plannerText: { color: colors.white, fontWeight: '900' }, name: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' }, state: { alignSelf: 'flex-end', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden', fontSize: 11, fontWeight: '900' }, ready: { color: colors.success, backgroundColor: '#103126' }, wait: { color: colors.warning, backgroundColor: '#302711' }, cap: { color: colors.textMuted, textAlign: 'right', fontSize: 12 } });
