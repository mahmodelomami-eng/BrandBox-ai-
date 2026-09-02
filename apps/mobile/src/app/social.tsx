import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type ConnectedAccount = {
  id: string;
  providerAccountId: string;
  name: string;
  type: string | null;
  avatarUrl: string | null;
  credentialExpiresAt: string | null;
  lastSyncAt: string | null;
};

type Provider = {
  id: string;
  name: string;
  oauthConfigured: boolean;
  publishingEnabled: boolean;
  connectionCount: number;
  capabilities: string[];
  accounts: ConnectedAccount[];
};

type StartResult = {
  authorizationUrl: string;
  expiresAt: string;
  requestedScopes: string[];
};

export default function SocialScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token || '';
  const params = useLocalSearchParams<{ provider?: string; status?: string; reason?: string }>();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    setLoading(true);
    void apiRequest<{ providers: Provider[] }>('/api/v1/social/providers', accessToken)
      .then((data) => {
        if (!active) return;
        setProviders(data.providers || []);
        if (params.status === 'connected') {
          setMessage('تم ربط الحساب بنجاح. يمكنك مراجعة الحسابات المتصلة أدناه.');
        } else if (params.status === 'error') {
          setMessage('لم يكتمل ربط الحساب. لم يتم حفظ أي توكن غير مكتمل أو نشر أي محتوى.');
        }
      })
      .catch(() => {
        if (active) setMessage('تعذر تحميل حالة حسابات السوشيال.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [accessToken, params.status, params.provider]);

  async function connect(provider: Provider) {
    if (!accessToken || !provider.oauthConfigured || busyProvider) return;
    setBusyProvider(provider.id);
    setMessage('');
    try {
      const result = await apiRequest<StartResult>(`/api/v1/social/oauth/${provider.id}/start`, accessToken, { method: 'POST' });
      await Linking.openURL(result.authorizationUrl);
    } catch {
      setMessage('تعذر بدء الربط. تحقق من إعداد تطبيق المطور واعتماد صلاحيات المنصة.');
    } finally {
      setBusyProvider('');
    }
  }

  return (
    <Screen>
      <Eyebrow>SOCIAL CONNECTIONS</Eyebrow>
      <Title>اربط قنواتك من خلال Brand Box، بدون كشف التوكنات للهاتف.</Title>
      <Muted>المتصفح يفتح صفحة الموافقة الرسمية للمنصة، ثم يعود إلى التطبيق. الأسرار والتوكنات تبقى مشفرة على الخادم فقط.</Muted>

      <Pressable style={styles.planner} onPress={() => router.push('/planner')}>
        <Text style={styles.plannerText}>فتح مخطط المحتوى</Text>
      </Pressable>

      {message ? <Card><Text style={styles.message}>{message}</Text></Card> : null}
      {loading ? <ActivityIndicator color={colors.red} /> : null}

      {providers.map((provider) => {
        const connected = provider.connectionCount > 0;
        return (
          <Card key={provider.id}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{provider.name}</Text>
              <Text style={[styles.state, connected ? styles.ready : provider.oauthConfigured ? styles.configured : styles.wait]}>
                {connected ? `${provider.connectionCount} متصل` : provider.oauthConfigured ? 'جاهز للربط' : 'يحتاج إعداد المطور'}
              </Text>
            </View>

            <Muted>
              {provider.publishingEnabled
                ? 'صلاحيات النشر المطلوبة موجودة ومفعّلة من الخادم.'
                : 'يمكن إدارة الربط، بينما يبقى النشر المباشر مقفلاً حتى اعتماد الصلاحيات المطلوبة.'}
            </Muted>

            {provider.accounts.map((account) => (
              <View key={account.id} style={styles.account}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountType}>{account.type || 'social_account'}</Text>
              </View>
            ))}

            <Text style={styles.cap}>{provider.capabilities.join(' • ')}</Text>

            <Pressable
              accessibilityRole="button"
              disabled={!provider.oauthConfigured || Boolean(busyProvider)}
              onPress={() => void connect(provider)}
              style={({ pressed }) => [
                styles.connect,
                (!provider.oauthConfigured || Boolean(busyProvider)) && styles.connectDisabled,
                pressed && provider.oauthConfigured && !busyProvider && styles.pressed,
              ]}
            >
              {busyProvider === provider.id
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.connectText}>{connected ? 'إعادة الربط' : provider.oauthConfigured ? 'ربط الحساب' : 'بانتظار إعداد المطور'}</Text>}
            </Pressable>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  planner: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  plannerText: { color: colors.white, fontWeight: '900' },
  message: { color: colors.text, textAlign: 'right', lineHeight: 22 },
  headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  name: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right', flex: 1 },
  state: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden', fontSize: 11, fontWeight: '900' },
  ready: { color: colors.success, backgroundColor: '#103126' },
  configured: { color: colors.info, backgroundColor: '#14253A' },
  wait: { color: colors.warning, backgroundColor: '#302711' },
  cap: { color: colors.textMuted, textAlign: 'right', fontSize: 12 },
  account: { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, padding: 10, gap: 3 },
  accountName: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  accountType: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
  connect: { minHeight: 46, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  connectDisabled: { opacity: 0.45 },
  connectText: { color: colors.white, fontWeight: '900' },
  pressed: { opacity: 0.8 },
});
