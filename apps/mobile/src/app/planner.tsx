import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest, BrandBoxApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

const channels = [
  { id: 'meta', label: 'Facebook / Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
] as const;

type ConnectionHealth = 'connected' | 'expiring' | 'refresh_due' | 'reauth_required' | 'revoked' | 'error';

type ProviderAccount = {
  id: string;
  name: string;
  health: ConnectionHealth;
};

type Provider = {
  id: string;
  name: string;
  publishingEnabled: boolean;
  accounts: ProviderAccount[];
};

type Delivery = {
  id: string;
  provider: string;
  status: string;
  scheduled_at: string;
  attempt_count: number;
  error_code: string | null;
};

type SocialPost = {
  id: string;
  content: string;
  target_providers: string[];
  status: string;
  scheduled_at: string | null;
  error_summary: string | null;
  created_at: string;
  deliveries: Delivery[];
};

function fetchPosts(accessToken: string) {
  return apiRequest<{ posts: SocialPost[] }>('/api/v1/social/posts', accessToken);
}

function fetchProviders(accessToken: string) {
  return apiRequest<{ providers: Provider[] }>('/api/v1/social/providers', accessToken);
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const statusLabel: Record<string, string> = {
  draft: 'مسودة',
  scheduled: 'مجدول',
  publishing: 'قيد النشر',
  published: 'منشور',
  failed: 'يحتاج مراجعة',
  cancelled: 'ملغي',
  queued: 'في الصف',
};

export default function PlannerScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token || '';
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyPost, setBusyPost] = useState('');
  const [editPostId, setEditPostId] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSelected, setEditSelected] = useState<string[]>([]);
  const [schedulePostId, setSchedulePostId] = useState('');
  const [scheduleDate, setScheduleDate] = useState(tomorrowDate());
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [message, setMessage] = useState('');

  async function reload() {
    if (!accessToken) return;
    const [postData, providerData] = await Promise.all([
      fetchPosts(accessToken),
      fetchProviders(accessToken),
    ]);
    setPosts(postData.posts || []);
    setProviders(providerData.providers || []);
  }

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void Promise.all([fetchPosts(accessToken), fetchProviders(accessToken)])
      .then(([postData, providerData]) => {
        if (!active) return;
        setPosts(postData.posts || []);
        setProviders(providerData.providers || []);
      })
      .catch(() => {
        if (active) setMessage('تعذر تحميل المخطط أو حالة الحسابات المتصلة.');
      });
    return () => { active = false; };
  }, [accessToken]);

  const eligibleAccounts = useMemo(() => {
    const result = new Map<string, ProviderAccount>();
    for (const provider of providers) {
      if (!provider.publishingEnabled) continue;
      const account = provider.accounts.find((item) => item.health === 'connected' || item.health === 'expiring');
      if (account) result.set(provider.id, account);
    }
    return result;
  }, [providers]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleEditProvider(id: string) {
    setEditSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function saveDraft() {
    if (!accessToken || !content.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      await apiRequest('/api/v1/social/posts', accessToken, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), targetProviders: selected }),
      });
      setContent('');
      setSelected([]);
      setMessage('تم حفظ المسودة. الحفظ لا يعني الجدولة أو النشر.');
      await reload();
    } catch {
      setMessage('تعذر حفظ المسودة الآن.');
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(post: SocialPost) {
    if (!['draft', 'cancelled', 'failed'].includes(post.status)) {
      setMessage(post.status === 'scheduled'
        ? 'ألغِ الجدولة أولًا قبل تعديل المسودة.'
        : 'هذا المحتوى دخل مرحلة النشر ولا يمكن تعديله من المخطط.');
      return;
    }
    setSchedulePostId('');
    setEditPostId(post.id);
    setEditContent(post.content);
    setEditSelected([...post.target_providers]);
    setMessage('');
  }

  function closeEdit() {
    setEditPostId('');
    setEditContent('');
    setEditSelected([]);
  }

  async function saveEdit(post: SocialPost) {
    if (!accessToken || busyPost || editPostId !== post.id || !editContent.trim()) return;
    setBusyPost(post.id);
    setMessage('');
    try {
      await apiRequest(`/api/v1/social/posts/${post.id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({
          content: editContent.trim(),
          targetProviders: editSelected,
        }),
      });
      closeEdit();
      setMessage('تم حفظ التعديلات كمسودة للمراجعة. لم تتم الجدولة أو النشر.');
      await reload();
    } catch (error) {
      if (error instanceof BrandBoxApiError && error.code === 'CANCEL_SOCIAL_SCHEDULE_BEFORE_EDIT') {
        setMessage('ألغِ الجدولة أولًا ثم افتح المسودة للتعديل.');
      } else if (error instanceof BrandBoxApiError && error.code === 'SOCIAL_POST_NOT_EDITABLE') {
        setMessage('لا يمكن تعديل محتوى دخل مرحلة النشر أو تم نشره.');
      } else {
        setMessage('تعذر حفظ التعديلات. لم تتغير حالة النشر.');
      }
    } finally {
      setBusyPost('');
    }
  }

  function scheduleIso() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate) || !/^\d{2}:\d{2}$/.test(scheduleTime)) return '';
    const date = new Date(`${scheduleDate}T${scheduleTime}:00`);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  async function schedulePost(post: SocialPost) {
    if (!accessToken || busyPost || editPostId === post.id) return;
    const scheduledAt = scheduleIso();
    if (!scheduledAt) {
      setMessage('اختر تاريخًا ووقتًا صحيحين. يتحقق الخادم من أن الموعد آمن ومسموح قبل إنشاء Jobs.');
      return;
    }
    if (!post.target_providers.length) {
      setMessage('حدد قناة واحدة على الأقل في المسودة قبل الجدولة.');
      return;
    }

    const targets = post.target_providers.map((provider) => ({
      provider,
      connectionId: eligibleAccounts.get(provider)?.id || '',
    }));
    if (targets.some((target) => !target.connectionId)) {
      setMessage('إحدى القنوات المحددة غير جاهزة للنشر بعد. اربط الحساب واعتمد صلاحية النشر أولًا.');
      return;
    }

    setBusyPost(post.id);
    setMessage('');
    try {
      await apiRequest(`/api/v1/social/posts/${post.id}/schedule`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ scheduledAt, targets }),
      });
      setSchedulePostId('');
      setMessage('تمت الجدولة وإنشاء Job مستقل وآمن لكل قناة.');
      await reload();
    } catch {
      setMessage('لم تُنفذ الجدولة. تحقق الخادم من الموعد والحسابات والصلاحيات ولم يعتمد الطلب.');
    } finally {
      setBusyPost('');
    }
  }

  async function cancelPost(post: SocialPost) {
    if (!accessToken || busyPost) return;
    setBusyPost(post.id);
    setMessage('');
    try {
      await apiRequest(`/api/v1/social/posts/${post.id}/schedule`, accessToken, { method: 'DELETE' });
      setMessage('تم إلغاء الجدولة قبل دخول المنشور مرحلة النشر. يمكنك الآن فتحه للتعديل ثم جدولته من جديد.');
      await reload();
    } catch {
      setMessage('تعذر الإلغاء. قد يكون المنشور دخل مرحلة النشر بالفعل.');
    } finally {
      setBusyPost('');
    }
  }

  function confirmCancel(post: SocialPost) {
    Alert.alert(
      'إلغاء الجدولة',
      'سيتم إلغاء Jobs التي لم تبدأ بعد. لن يتم التراجع عن منشور دخل مرحلة النشر.',
      [
        { text: 'رجوع', style: 'cancel' },
        { text: 'إلغاء الجدولة', style: 'destructive', onPress: () => void cancelPost(post) },
      ]
    );
  }

  return (
    <Screen>
      <Eyebrow>SOCIAL PLANNER</Eyebrow>
      <Title>راجع المسودة، ثم جدولها بثقة.</Title>
      <Muted>الحفظ والتعديل لا يعنيان الجدولة أو النشر. المحتوى يبقى تحت مراجعتك، والجدولة خطوة مستقلة تمر عبر حسابات وصلاحيات معتمدة.</Muted>

      <TextInput
        multiline
        value={content}
        onChangeText={setContent}
        maxLength={5000}
        placeholder="اكتب فكرة المنشور أو النسخة الأولية..."
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <View style={styles.channels}>
        {channels.map((channel) => {
          const active = selected.includes(channel.id);
          const ready = eligibleAccounts.has(channel.id);
          return (
            <Pressable key={channel.id} onPress={() => toggle(channel.id)} style={[styles.channel, active && styles.channelActive]}>
              <Text style={[styles.channelText, active && styles.channelTextActive]}>{channel.label}</Text>
              <Text style={[styles.readiness, ready ? styles.ready : styles.wait]}>{ready ? 'جاهز' : 'غير مفعل'}</Text>
            </Pressable>
          );
        })}
      </View>

      {busy ? <ActivityIndicator color={colors.red} /> : <PrimaryButton label="حفظ كمسودة" onPress={saveDraft} disabled={!content.trim()} />}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.section}>المحتوى الأخير</Text>
      {posts.slice(0, 20).map((post) => {
        const editing = editPostId === post.id;
        const scheduling = schedulePostId === post.id;
        const canReview = ['draft', 'cancelled', 'failed'].includes(post.status);
        const canSchedule = canReview;
        const canCancel = post.status === 'scheduled';
        return (
          <Card key={post.id}>
            <View style={styles.postHeader}>
              <Text style={styles.status}>{statusLabel[post.status] || post.status}</Text>
              {!editing ? <Text numberOfLines={4} style={styles.post}>{post.content}</Text> : null}
            </View>

            {editing ? (
              <View style={styles.editBox}>
                <Text style={styles.editTitle}>مراجعة المسودة</Text>
                <TextInput
                  multiline
                  value={editContent}
                  onChangeText={setEditContent}
                  maxLength={5000}
                  placeholder="راجع النص قبل الجدولة..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.editInput}
                />
                <Text style={styles.scheduleLabel}>القنوات المستهدفة</Text>
                <View style={styles.channels}>
                  {channels.map((channel) => {
                    const active = editSelected.includes(channel.id);
                    return (
                      <Pressable
                        key={channel.id}
                        onPress={() => toggleEditProvider(channel.id)}
                        style={[styles.channel, active && styles.channelActive]}
                      >
                        <Text style={[styles.channelText, active && styles.channelTextActive]}>{channel.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  disabled={busyPost === post.id || !editContent.trim()}
                  onPress={() => void saveEdit(post)}
                  style={[styles.reviewSaveButton, (!editContent.trim() || busyPost === post.id) && styles.disabledButton]}
                >
                  {busyPost === post.id ? <ActivityIndicator color={colors.white} /> : <Text style={styles.scheduleButtonText}>حفظ التعديلات كمسودة</Text>}
                </Pressable>
                <Pressable disabled={busyPost === post.id} onPress={closeEdit}><Text style={styles.cancelLink}>إغلاق بدون حفظ</Text></Pressable>
                <Muted>حفظ التعديل لا ينشئ Jobs ولا يغير أي حساب متصل ولا ينشر المحتوى.</Muted>
              </View>
            ) : (
              <Muted>{post.target_providers.length ? post.target_providers.join(' • ') : 'بدون قناة محددة'}</Muted>
            )}

            {post.scheduled_at ? <Text style={styles.scheduleText}>موعد النشر: {new Date(post.scheduled_at).toLocaleString('ar-LY')}</Text> : null}
            {post.error_summary ? <Text style={styles.errorText}>{post.error_summary}</Text> : null}

            {post.deliveries?.length ? (
              <View style={styles.deliveries}>
                {post.deliveries.map((delivery) => (
                  <View key={delivery.id} style={styles.delivery}>
                    <Text style={styles.deliveryProvider}>{delivery.provider}</Text>
                    <Text style={styles.deliveryStatus}>{statusLabel[delivery.status] || delivery.status}{delivery.attempt_count ? ` • محاولة ${delivery.attempt_count}` : ''}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {scheduling && !editing ? (
              <View style={styles.scheduleBox}>
                <Text style={styles.scheduleLabel}>التاريخ</Text>
                <TextInput value={scheduleDate} onChangeText={setScheduleDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.smallInput} />
                <Text style={styles.scheduleLabel}>الوقت المحلي</Text>
                <TextInput value={scheduleTime} onChangeText={setScheduleTime} placeholder="HH:mm" placeholderTextColor={colors.textMuted} style={styles.smallInput} />
                <Pressable disabled={busyPost === post.id} onPress={() => void schedulePost(post)} style={styles.scheduleButton}>
                  {busyPost === post.id ? <ActivityIndicator color={colors.white} /> : <Text style={styles.scheduleButtonText}>تأكيد الجدولة</Text>}
                </Pressable>
                <Pressable onPress={() => setSchedulePostId('')}><Text style={styles.cancelLink}>إغلاق</Text></Pressable>
              </View>
            ) : null}

            {!editing && !scheduling && canReview ? (
              <View style={styles.actionRow}>
                <Pressable onPress={() => beginEdit(post)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>مراجعة وتعديل</Text>
                </Pressable>
                {canSchedule ? (
                  <Pressable onPress={() => { setEditPostId(''); setSchedulePostId(post.id); }} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>جدولة</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {canCancel ? (
              <>
                <Muted>لتعديل هذا المحتوى يجب إلغاء الجدولة أولًا. لا يتم الإلغاء تلقائيًا أثناء التحرير.</Muted>
                <Pressable disabled={busyPost === post.id} onPress={() => confirmCancel(post)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>إلغاء الجدولة</Text>
                </Pressable>
              </>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 170, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: space.md, color: colors.text, textAlign: 'right', textAlignVertical: 'top', lineHeight: 23 },
  channels: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  channel: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, gap: 3 },
  channelActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  channelText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  channelTextActive: { color: colors.red },
  readiness: { fontSize: 10, fontWeight: '800', textAlign: 'right' },
  ready: { color: colors.success },
  wait: { color: colors.warning },
  message: { color: colors.text, textAlign: 'right', lineHeight: 22 },
  section: { color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'right', marginTop: 6 },
  postHeader: { gap: 7 },
  post: { color: colors.text, textAlign: 'right', lineHeight: 22, fontWeight: '700' },
  status: { alignSelf: 'flex-end', color: colors.red, fontWeight: '900', fontSize: 11 },
  scheduleText: { color: colors.textMuted, textAlign: 'right', fontSize: 12 },
  errorText: { color: '#FF777D', textAlign: 'right', fontSize: 12 },
  deliveries: { gap: 7 },
  delivery: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 10, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, padding: 9 },
  deliveryProvider: { color: colors.text, fontWeight: '800', fontSize: 11 },
  deliveryStatus: { color: colors.textMuted, fontWeight: '700', fontSize: 10 },
  editBox: { gap: 9, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 12 },
  editTitle: { color: colors.text, textAlign: 'right', fontWeight: '900', fontSize: 14 },
  editInput: { minHeight: 130, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12, color: colors.text, textAlign: 'right', textAlignVertical: 'top', lineHeight: 22 },
  scheduleBox: { gap: 8, paddingTop: 6 },
  scheduleLabel: { color: colors.textMuted, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  smallInput: { minHeight: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 12, color: colors.text, textAlign: 'right' },
  scheduleButton: { minHeight: 46, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  reviewSaveButton: { minHeight: 46, borderRadius: radius.md, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.5 },
  scheduleButtonText: { color: colors.white, fontWeight: '900' },
  cancelLink: { color: colors.textMuted, textAlign: 'center', fontWeight: '700', padding: 6 },
  actionRow: { flexDirection: 'row-reverse', gap: 8 },
  secondaryButton: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.text, fontWeight: '800' },
  cancelButton: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: '#5C2A2E', backgroundColor: '#241215', alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: '#FF777D', fontWeight: '900' },
});
