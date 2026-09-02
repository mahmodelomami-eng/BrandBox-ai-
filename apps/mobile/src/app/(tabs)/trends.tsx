import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius } from '@/theme/tokens';

type TrendsPayload = {
  mode: 'preview' | 'live';
  region: string;
  generatedAt: string;
  opportunities: Array<{ id: string; label: string; category: string; description: string; campaignAngle: string }>;
};

export default function TrendsScreen() {
  const { session } = useAuth();
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!session?.access_token) return;
    apiRequest<TrendsPayload>('/api/v1/trends?region=LY&language=ar', session.access_token).then(setData).catch(() => setError(true));
  }, [session?.access_token]);

  return <Screen><Eyebrow>TREND RADAR</Eyebrow><Title>اكتشف الفرصة قبل أن تصبح منشورًا.</Title><Muted>الرادار يفصل بين الإشارات المباشرة والقوالب الاستكشافية حتى لا تختلط المعاينة بالترند الحقيقي.</Muted>{!data && !error ? <ActivityIndicator color={colors.red} /> : null}{error ? <Card><Text style={styles.error}>تعذر تحميل رادار الترندات.</Text></Card> : null}{data ? <><View style={styles.status}><Text style={styles.statusText}>{data.mode === 'live' ? 'LIVE SIGNALS' : 'PREVIEW — ليس بثًا مباشرًا'}</Text></View>{data.opportunities.map((item) => <Card key={item.id}><Text style={styles.category}>{item.category}</Text><Text style={styles.title}>{item.label}</Text><Muted>{item.description}</Muted><Text style={styles.angle}>زاوية حملة: {item.campaignAngle}</Text></Card>)}</> : null}</Screen>;
}

const styles = StyleSheet.create({ status: { alignSelf: 'flex-end', borderRadius: radius.pill, backgroundColor: colors.redSoft, paddingHorizontal: 10, paddingVertical: 6 }, statusText: { color: colors.red, fontWeight: '900', fontSize: 11 }, category: { color: colors.info, textAlign: 'right', fontWeight: '800', fontSize: 12 }, title: { color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'right' }, angle: { color: colors.text, textAlign: 'right', lineHeight: 21, fontWeight: '700' }, error: { color: '#FF777D', textAlign: 'right' } });
