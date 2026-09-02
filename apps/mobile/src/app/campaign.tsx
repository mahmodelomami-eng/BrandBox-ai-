import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest, requestId } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type SocialProvider = 'meta' | 'tiktok' | 'youtube' | 'linkedin';

type Project = {
  id: string;
  name: string;
  type: string;
  industry: string | null;
};

type Bootstrap = {
  projects: Project[];
};

type CampaignDraft = {
  provider: SocialProvider;
  content: string;
};

type Campaign = {
  name: string;
  objective: string;
  coreIdea: string;
  pillars: string[];
  cta: string;
  drafts: CampaignDraft[];
};

type ComposeResult = {
  success: boolean;
  generationId: string;
  creditsConsumed: number;
  remainingBalance: number;
  parseStatus?: 'structured' | 'needs_review';
  campaign?: Campaign | null;
  rawContent?: string;
  retryable?: boolean;
  errorMessage?: string;
};

const channels: Array<{ id: SocialProvider; label: string }> = [
  { id: 'meta', label: 'Facebook / Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
];

const providerLabel: Record<SocialProvider, string> = {
  meta: 'Facebook / Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
};

export default function CampaignComposerScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token || '';
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [goal, setGoal] = useState('');
  const [offer, setOffer] = useState('');
  const [trendContext, setTrendContext] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<SocialProvider[]>(['meta']);
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void apiRequest<Bootstrap>('/api/v1/mobile/bootstrap', accessToken)
      .then((payload) => {
        if (!active) return;
        setProjects(payload.projects || []);
        setProjectId((current) => current || payload.projects?.[0]?.id || '');
      })
      .catch(() => {
        if (active) setMessage('تعذر تحميل المشاريع.');
      });
    return () => { active = false; };
  }, [accessToken]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === projectId) || null,
    [projects, projectId]
  );

  function toggleChannel(provider: SocialProvider) {
    setSelectedChannels((current) => current.includes(provider)
      ? current.filter((item) => item !== provider)
      : [...current, provider]);
  }

  async function compose() {
    if (!accessToken || !projectId || goal.trim().length < 5 || !selectedChannels.length) return;
    setBusy(true);
    setMessage('');
    setResult(null);
    try {
      const payload = await apiRequest<ComposeResult>('/api/v1/mobile/campaigns/compose', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          goal: goal.trim(),
          offer: offer.trim(),
          trendContext: trendContext.trim(),
          targetProviders: selectedChannels,
          requestId: requestId('bbmcampaign'),
        }),
      });
      setResult(payload);
      if (payload.retryable) {
        setMessage('الحملة قيد المعالجة. أعد المحاولة من نفس المشروع بعد لحظات.');
      } else if (payload.parseStatus === 'needs_review') {
        setMessage('تم التوليد، لكن تنسيق الحملة يحتاج مراجعة قبل تحويله إلى مسودات. لم يتم نشر أو حفظ أي شيء تلقائيًا.');
      }
    } catch {
      setMessage('تعذر إنشاء الحملة. تحقق من الرصيد وحالة خدمة الذكاء الاصطناعي.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDrafts() {
    if (!accessToken || !projectId || !result?.campaign?.drafts.length || !result.generationId) return;
    setSaving(true);
    setMessage('');
    const deterministicRequestId = `campaign_${result.generationId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    try {
      const saved = await apiRequest<{ posts: unknown[]; replayed: boolean }>('/api/v1/social/posts/batch', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          requestId: deterministicRequestId,
          drafts: result.campaign.drafts,
        }),
      });
      setMessage(saved.replayed ? 'المسودات محفوظة مسبقًا في مخطط المحتوى.' : `تم حفظ ${saved.posts.length} مسودة في مخطط المحتوى.`);
    } catch {
      setMessage('تم الاحتفاظ بنتيجة الحملة على الشاشة، لكن تعذر حفظ المسودات الآن. لم يتم النشر.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Eyebrow>CAMPAIGN COMPOSER</Eyebrow>
      <Title>حوّل الهدف إلى حملة قابلة للتنفيذ.</Title>
      <Muted>اختر مشروعًا وهدفًا وقنوات. Brand Box يبني الاستراتيجية والمسودات باستخدام نفس رصيد AI، ثم تراجعها قبل أي نشر.</Muted>

      <Text style={styles.section}>المشروع</Text>
      <View style={styles.projectList}>
        {projects.map((project) => {
          const active = project.id === projectId;
          return (
            <Pressable key={project.id} onPress={() => setProjectId(project.id)} style={[styles.projectChip, active && styles.projectChipActive]}>
              <Text style={[styles.projectChipText, active && styles.projectChipTextActive]}>{project.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {!projects.length ? <Card><Muted>أنشئ مشروعًا أولًا حتى تبقى الحملة والأصول والمسودات مرتبطة بسياق واضح.</Muted></Card> : null}
      {activeProject ? <Muted>{activeProject.industry || activeProject.type}</Muted> : null}

      <Text style={styles.section}>هدف الحملة</Text>
      <TextInput
        multiline
        value={goal}
        onChangeText={setGoal}
        maxLength={1200}
        placeholder="مثال: إطلاق خدمة جديدة وزيادة طلبات التجربة خلال أسبوعين..."
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.section}>العرض أو الرسالة الأساسية</Text>
      <TextInput
        multiline
        value={offer}
        onChangeText={setOffer}
        maxLength={800}
        placeholder="اختياري: العرض، الميزة، السعر أو الرسالة التي يجب إبرازها..."
        placeholderTextColor={colors.textMuted}
        style={styles.compactInput}
      />

      <Text style={styles.section}>سياق ترند أو فرصة</Text>
      <TextInput
        multiline
        value={trendContext}
        onChangeText={setTrendContext}
        maxLength={800}
        placeholder="اختياري: الصق فكرة أو فرصة من Trend Radar. تعامل كمرجع للحملة وليس كحقيقة تلقائية."
        placeholderTextColor={colors.textMuted}
        style={styles.compactInput}
      />

      <Text style={styles.section}>القنوات</Text>
      <View style={styles.channels}>
        {channels.map((channel) => {
          const active = selectedChannels.includes(channel.id);
          return (
            <Pressable key={channel.id} onPress={() => toggleChannel(channel.id)} style={[styles.channel, active && styles.channelActive]}>
              <Text style={[styles.channelText, active && styles.channelTextActive]}>{channel.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {busy ? <ActivityIndicator color={colors.red} /> : (
        <PrimaryButton
          label="إنشاء الحملة"
          onPress={compose}
          disabled={!projectId || goal.trim().length < 5 || !selectedChannels.length}
        />
      )}

      {message ? <Card><Text style={styles.message}>{message}</Text></Card> : null}

      {result?.campaign ? (
        <>
          <Card>
            <Eyebrow>CAMPAIGN STRATEGY</Eyebrow>
            <Text style={styles.campaignName}>{result.campaign.name}</Text>
            <Text style={styles.label}>الهدف</Text>
            <Text style={styles.body}>{result.campaign.objective}</Text>
            <Text style={styles.label}>الفكرة المحورية</Text>
            <Text style={styles.body}>{result.campaign.coreIdea}</Text>
            <Text style={styles.label}>محاور المحتوى</Text>
            {result.campaign.pillars.map((pillar, index) => <Text key={`${pillar}-${index}`} style={styles.body}>• {pillar}</Text>)}
            <Text style={styles.label}>CTA</Text>
            <Text style={styles.body}>{result.campaign.cta}</Text>
            <Muted>استهلاك: {result.creditsConsumed} نقطة • المتبقي: {result.remainingBalance}</Muted>
          </Card>

          <Text style={styles.section}>مسودات القنوات</Text>
          {result.campaign.drafts.map((draft) => (
            <Card key={draft.provider}>
              <Text style={styles.provider}>{providerLabel[draft.provider]}</Text>
              <Text style={styles.body}>{draft.content}</Text>
            </Card>
          ))}

          {saving ? <ActivityIndicator color={colors.red} /> : (
            <PrimaryButton label="حفظ المسودات في المخطط" onPress={saveDrafts} />
          )}
          <Muted>الحفظ لا يعني النشر. النشر المباشر يبقى مقفلاً حتى ربط واعتماد كل منصة.</Muted>
        </>
      ) : null}

      {result?.parseStatus === 'needs_review' && result.rawContent ? (
        <Card>
          <Text style={styles.label}>نتيجة تحتاج مراجعة</Text>
          <Text style={styles.body}>{result.rawContent}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'right', marginTop: 4 },
  projectList: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  projectChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 9 },
  projectChipActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  projectChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  projectChipTextActive: { color: colors.red },
  input: { minHeight: 130, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: space.md, color: colors.text, textAlign: 'right', textAlignVertical: 'top', lineHeight: 23 },
  compactInput: { minHeight: 96, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: space.md, color: colors.text, textAlign: 'right', textAlignVertical: 'top', lineHeight: 23 },
  channels: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  channel: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface },
  channelActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  channelText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  channelTextActive: { color: colors.red },
  message: { color: colors.text, textAlign: 'right', lineHeight: 22 },
  campaignName: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'right' },
  label: { color: colors.red, fontSize: 12, fontWeight: '900', textAlign: 'right', marginTop: 4 },
  body: { color: colors.text, fontSize: 14, lineHeight: 23, textAlign: 'right' },
  provider: { color: colors.info, fontWeight: '900', textAlign: 'right' },
});
