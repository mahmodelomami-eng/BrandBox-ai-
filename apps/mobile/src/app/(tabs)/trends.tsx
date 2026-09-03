import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius } from '@/theme/tokens';

type TrendOpportunity = {
  id: string;
  label: string;
  category: string;
  description: string;
  campaignAngle: string;
};

type TrendsPayload = {
  mode: 'preview' | 'live';
  region: string;
  generatedAt: string;
  opportunities: TrendOpportunity[];
};

function fetchTrends(accessToken: string) {
  return apiRequest<TrendsPayload>('/api/v1/trends?region=LY&language=ar', accessToken);
}

export default function TrendsScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token || '';
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void fetchTrends(accessToken)
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setError('');
      })
      .catch(() => {
        if (active) setError('تعذر تحميل رادار الترندات.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [accessToken]);

  async function retry() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setData(await fetchTrends(accessToken));
    } catch {
      setError('تعذر تحميل رادار الترندات. تحقق من الاتصال ثم أعد المحاولة.');
    } finally {
      setLoading(false);
    }
  }

  function openCampaign(item: TrendOpportunity) {
    const trendContext = [
      `الفرصة: ${item.label}`,
      `الفئة: ${item.category}`,
      `الوصف: ${item.description}`,
      `زاوية الحملة: ${item.campaignAngle}`,
      data?.mode === 'preview' ? 'المصدر: Trend Radar Preview — تعامل معه كإشارة استكشافية لا كحقيقة مباشرة.' : 'المصدر: Trend Radar Live.',
    ].join('\n');

    router.push({
      pathname: '/campaign',
      params: {
        goal: item.campaignAngle.slice(0, 1200),
        trendContext: trendContext.slice(0, 800),
      },
    });
  }

  return (
    <Screen>
      <Eyebrow>TREND RADAR</Eyebrow>
      <Title>اكتشف الفرصة قبل أن تصبح منشورًا.</Title>
      <Muted>الرادار يفصل بين الإشارات المباشرة والقوالب الاستكشافية حتى لا تختلط المعاينة بالترند الحقيقي.</Muted>

      {loading ? <ActivityIndicator color={colors.red} /> : null}
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Pressable disabled={loading} onPress={() => void retry()} style={styles.retry}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </Card>
      ) : null}

      {data ? (
        <>
          <View style={styles.status}>
            <Text style={styles.statusText}>{data.mode === 'live' ? 'LIVE SIGNALS' : 'PREVIEW — ليس بثًا مباشرًا'}</Text>
          </View>
          {!data.opportunities.length ? <Card><Muted>لا توجد فرص متاحة حاليًا لهذا النطاق. لم يتم اختلاق نتائج بديلة.</Muted></Card> : null}
          {data.opportunities.map((item) => (
            <Card key={item.id}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.title}>{item.label}</Text>
              <Muted>{item.description}</Muted>
              <Text style={styles.angle}>زاوية حملة: {item.campaignAngle}</Text>
              <Pressable onPress={() => openCampaign(item)} style={styles.action}>
                <Text style={styles.actionText}>تحويل الفرصة إلى حملة</Text>
              </Pressable>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { alignSelf: 'flex-end', borderRadius: radius.pill, backgroundColor: colors.redSoft, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: colors.red, fontWeight: '900', fontSize: 11 },
  category: { color: colors.info, textAlign: 'right', fontWeight: '800', fontSize: 12 },
  title: { color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'right' },
  angle: { color: colors.text, textAlign: 'right', lineHeight: 21, fontWeight: '700' },
  error: { color: '#FF777D', textAlign: 'right', lineHeight: 22 },
  retry: { minHeight: 42, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.text, fontWeight: '800' },
  action: { minHeight: 46, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.white, fontWeight: '900' },
});
