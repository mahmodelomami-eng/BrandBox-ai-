import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type ConnectionHealth = 'connected' | 'expiring' | 'refresh_due' | 'reauth_required' | 'revoked' | 'error';

type ConnectedAccount = {
  id: string;
  providerAccountId: string;
  name: string;
  type: string | null;
  avatarUrl: string | null;
  status: string;
  health: ConnectionHealth;
  refreshable: boolean;
  credentialExpiresAt: string | null;
  lastSyncAt: string | null;
};

type Provider = {
  id: string;
  name: string;
  oauthConfigured: boolean;
  publishingEnabled: boolean;
  connectionCount: number;
  usableConnectionCount: number;
  capabilities: string[];
  accounts: ConnectedAccount[];
};

type StartResult = {
  authorizationUrl: string;
  expiresAt: string;
  requestedScopes: string[];
};

const healthLabel: Record<ConnectionHealth, string> = {
  connected: 'متصل',
  expiring: 'ينتهي قريبًا',
  refresh_due: 'يحتاج تحديث',
  reauth_required: 'يحتاج إعادة ربط',
  revoked: 'ملغي',
  error: 'يحتاج مراجعة',
};

export default function SocialScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token || '';
  const params = useLocalSearchParams<{ provider?: string; status?: string; reason?: string }>();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState('');
  const [busyConnection, setBusyConnection] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void apiRequest<{ providers: Provider[] }>('/api/v1/social/providers', accessToken)
      .then((data) => {
        if (!active) return;
        setProviders(data.providers || []);
        if (params.status === 'connected') {
          setMessage('تم ربط الحساب بنجاح. يمكنك مراجعة حالة الاتصال أدناه.');
        } else if (params.status === 'error') {
          setMessage('لم يكتمل ربط الحساب. لم يتم حفظ توكن غير مكتمل أو نشر أي محتوى.');
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

  async function reloadProviders() {
    if (!accessToken) return;
    const data = await apiRequest<{ providers: Provider[] }>('/api/v1/social/providers', accessToken);
    setProviders(data.providers || []);
  }

  async function connect(provider: Provider) {
    if (!accessToken || !provider.oauthConfigured || busyProvider || busyConnection) return;
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

  async function refreshConnection(account: ConnectedAccount) {
    if (!accessToken || busyConnection || busyProvider) return;
    setBusyConnection(account.id);
    setMessage('');
    try {
      await apiRequest(`/api/v1/social/connections/${account.id}/refresh`, accessToken, { method: 'POST' });
      await reloadProviders();
      setMessage('تم تحديث الاتصال وحفظ بيانات الاعتماد الجديدة بشكل مشفر على الخادم.');
    } catch {
      await reloadProviders().catch(() => undefined);
      setMessage('تعذر تجديد الاتصال تلقائيًا. إذا ظهرت حالة إعادة الربط، استخدم زر إعادة الربط الخاص بالمنصة.');
    } finally {
      setBusyConnection('');
    }
  }

  async function disconnectConnection(account: ConnectedAccount) {
    if (!accessToken || busyConnection || busyProvider) return;
    setBusyConnection(account.id);
    setMessage('');
    try {
      await apiRequest(`/api/v1/social/connections/${account.id}`, accessToken, { method: 'DELETE' });
      await reloadProviders();
      setMessage('تم فصل الحساب من Brand Box وإزالة بيانات اعتماده المحلية.');
    } catch {
      setMessage('تعذر فصل الحساب الآن. لم يتم تغيير بيانات الاتصال.');
    } finally {
      setBusyConnection('');
    }
  }

  function confirmDisconnect(account: ConnectedAccount) {
    Alert.alert(
      'فصل الحساب',
      `هل تريد فصل ${account.name} من Brand Box؟ لن يؤدي هذا إلى حذف الحساب من المنصة الأصلية.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'فصل', style: 'destructive', onPress: () => void disconnectConnection(account) },
      ]
    );
  }

  return (
    <Screen>
      <Eyebrow>SOCIAL CONNECTIONS</Eyebrow>
      <Title>إدارة دورة حياة حساباتك المتصلة.</Title>
      <Muted>Brand Box يراقب انتهاء الاتصال ويجدد التوكن على الخادم عندما تسمح المنصة بذلك. لا تصل بيانات الاعتماد المشفرة إلى الهاتف.</Muted>

      <Pressable style={styles.planner} onPress={() => router.push('/planner')}>
        <Text style={styles.plannerText}>فتح مخطط المحتوى</Text>
      </Pressable>

      {message ? <Card><Text style={styles.message}>{message}</Text></Card> : null}
      {loading ? <ActivityIndicator color={colors.red} /> : null}

      {providers.map((provider) => {
        const hasAccounts = provider.connectionCount > 0;
        const usable = provider.usableConnectionCount > 0;
        return (
          <Card key={provider.id}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{provider.name}</Text>
              <Text style={[styles.state, usable ? styles.ready : provider.oauthConfigured ? styles.configured : styles.wait]}>
                {usable ? `${provider.usableConnectionCount} جاهز` : hasAccounts ? 'يحتاج صيانة' : provider.oauthConfigured ? 'جاهز للربط' : 'يحتاج إعداد المطور'}
              </Text>
            </View>

            <Muted>
              {provider.publishingEnabled
                ? 'صلاحيات النشر المطلوبة موجودة ومفعّلة من الخادم.'
                : 'الاتصال منفصل عن صلاحية النشر؛ النشر يبقى مقفلاً حتى اعتماد الصلاحيات المطلوبة.'}
            </Muted>

            {provider.accounts.map((account) => {
              const canRefresh = account.refreshable && (account.health === 'expiring' || account.health === 'refresh_due');
              const reconnectNeeded = account.health === 'reauth_required' || account.health === 'revoked' || account.health === 'error';
              return (
                <View key={account.id} style={styles.account}>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountIdentity}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountType}>{account.type || 'social_account'}</Text>
                    </View>
                    <Text style={[styles.health, account.health === 'connected' ? styles.healthGood : account.health === 'expiring' ? styles.healthWarn : styles.healthAction]}>
                      {healthLabel[account.health]}
                    </Text>
                  </View>

                  {account.credentialExpiresAt ? (
                    <Text style={styles.expiry}>صلاحية الاتصال: {new Date(account.credentialExpiresAt).toLocaleDateString('ar-LY')}</Text>
                  ) : null}

                  <View style={styles.accountActions}>
                    {canRefresh ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={Boolean(busyConnection) || Boolean(busyProvider)}
                        onPress={() => void refreshConnection(account)}
                        style={styles.smallPrimary}
                      >
                        {busyConnection === account.id
                          ? <ActivityIndicator color={colors.white} />
                          : <Text style={styles.smallPrimaryText}>تحديث الاتصال</Text>}
                      </Pressable>
                    ) : null}
                    {reconnectNeeded && provider.oauthConfigured ? (
                      <Pressable accessibilityRole="button" onPress={() => void connect(provider)} style={styles.smallSecondary}>
                        <Text style={styles.smallSecondaryText}>إعادة الربط</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={Boolean(busyConnection) || Boolean(busyProvider)}
                      onPress={() => confirmDisconnect(account)}
                      style={styles.disconnect}
                    >
                      <Text style={styles.disconnectText}>فصل</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <Text style={styles.cap}>{provider.capabilities.join(' • ')}</Text>

            <Pressable
              accessibilityRole="button"
              disabled={!provider.oauthConfigured || Boolean(busyProvider) || Boolean(busyConnection)}
              onPress={() => void connect(provider)}
              style={({ pressed }) => [
                styles.connect,
                (!provider.oauthConfigured || Boolean(busyProvider) || Boolean(busyConnection)) && styles.connectDisabled,
                pressed && provider.oauthConfigured && !busyProvider && !busyConnection && styles.pressed,
              ]}
            >
              {busyProvider === provider.id
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.connectText}>{hasAccounts ? 'ربط حساب إضافي / إعادة الربط' : provider.oauthConfigured ? 'ربط الحساب' : 'بانتظار إعداد المطور'}</Text>}
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
  account: { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, padding: 12, gap: 9 },
  accountHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  accountIdentity: { flex: 1, gap: 3 },
  accountName: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  accountType: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
  health: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden', fontSize: 10, fontWeight: '900' },
  healthGood: { color: colors.success, backgroundColor: '#103126' },
  healthWarn: { color: colors.warning, backgroundColor: '#302711' },
  healthAction: { color: colors.red, backgroundColor: colors.redSoft },
  expiry: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
  accountActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  smallPrimary: { minHeight: 38, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  smallPrimaryText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  smallSecondary: { minHeight: 38, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  smallSecondaryText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  disconnect: { minHeight: 38, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: '#5B2327', alignItems: 'center', justifyContent: 'center' },
  disconnectText: { color: '#FF777D', fontWeight: '800', fontSize: 12 },
  connect: { minHeight: 46, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  connectDisabled: { opacity: 0.45 },
  connectText: { color: colors.white, fontWeight: '900' },
  pressed: { opacity: 0.8 },
});
