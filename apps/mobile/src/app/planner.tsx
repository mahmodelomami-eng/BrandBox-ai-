import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

const channels = [
  { id: 'meta', label: 'Facebook / Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
] as const;

type SocialPost = { id: string; content: string; target_providers: string[]; status: string; scheduled_at: string | null; created_at: string };

export default function PlannerScreen() {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    if (!session?.access_token) return;
    try {
      const data = await apiRequest<{ posts: SocialPost[] }>('/api/v1/social/posts', session.access_token);
      setPosts(data.posts || []);
    } catch {
      setMessage('ميزة المخطط تحتاج تطبيق Migration الخاص بالسوشيال على قاعدة البيانات قبل الاستخدام.');
    }
  }

  useEffect(() => { void load(); }, [session?.access_token]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function saveDraft() {
    if (!session?.access_token || !content.trim()) return;
    setBusy(true); setMessage('');
    try {
      await apiRequest('/api/v1/social/posts', session.access_token, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), targetProviders: selected }),
      });
      setContent(''); setSelected([]); setMessage('تم حفظ المسودة داخل Brand Box.');
      await load();
    } catch {
      setMessage('تعذر حفظ المسودة الآن.');
    } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Eyebrow>SOCIAL PLANNER</Eyebrow>
      <Title>خطّط مرة، ثم خصّص لكل قناة.</Title>
      <Muted>المسودات تعمل قبل تفعيل النشر. الجدولة المباشرة ستظل مقفلة على الخادم حتى اعتماد OAuth وصلاحيات النشر لكل منصة.</Muted>
      <TextInput multiline value={content} onChangeText={setContent} maxLength={5000} placeholder="اكتب فكرة المنشور أو النسخة الأولية..." placeholderTextColor={colors.textMuted} style={styles.input} />
      <View style={styles.channels}>{channels.map((channel) => {
        const active = selected.includes(channel.id);
        return <Pressable key={channel.id} onPress={() => toggle(channel.id)} style={[styles.channel, active && styles.channelActive]}><Text style={[styles.channelText, active && styles.channelTextActive]}>{channel.label}</Text></Pressable>;
      })}</View>
      {busy ? <ActivityIndicator color={colors.red} /> : <PrimaryButton label="حفظ كمسودة" onPress={saveDraft} disabled={!content.trim()} />}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Text style={styles.section}>المسودات الأخيرة</Text>
      {posts.slice(0, 10).map((post) => <Card key={post.id}><Text numberOfLines={4} style={styles.post}>{post.content}</Text><Muted>{post.target_providers.length ? post.target_providers.join(' • ') : 'بدون قناة محددة'} • {post.status}</Muted></Card>)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 170, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: space.md, color: colors.text, textAlign: 'right', textAlignVertical: 'top', lineHeight: 23 },
  channels: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  channel: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface },
  channelActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  channelText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  channelTextActive: { color: colors.red },
  message: { color: colors.text, textAlign: 'right', lineHeight: 22 },
  section: { color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'right', marginTop: 6 },
  post: { color: colors.text, textAlign: 'right', lineHeight: 22, fontWeight: '700' },
});
