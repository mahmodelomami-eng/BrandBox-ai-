import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Workspace = {
  project: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    industry: string | null;
    targetAudience: string | null;
    language: string;
    tone: string;
    updatedAt: string;
  };
  brandKit: null | {
    scope: 'account';
    brandName: string;
    tagline: string;
    description: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    toneOfVoice: string;
    updatedAt: string;
  };
  stats: { generations: number; assets: number; socialPosts: number };
  recentGenerations: Array<{
    id: string;
    type: string;
    model: string;
    prompt: string | null;
    status: string;
    resultUrl: string | null;
    resultContent: string | null;
    creditsConsumed: number;
    createdAt: string;
  }>;
  recentAssets: Array<{
    id: string;
    name: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    createdAt: string;
  }>;
  recentSocialPosts: Array<{
    id: string;
    content: string | null;
    targetProviders: string[];
    status: string;
    scheduledAt: string | null;
    publishedAt: string | null;
    createdAt: string;
  }>;
};

type WorkspaceRequest = {
  projectId: string;
  data: Workspace | null;
  error: string;
  settled: boolean;
};

const statusLabel: Record<string, string> = {
  draft: 'مسودة',
  scheduled: 'مجدول',
  publishing: 'قيد النشر',
  published: 'منشور',
  failed: 'يحتاج مراجعة',
  cancelled: 'ملغي',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function safeColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : colors.border;
}

export default function ProjectWorkspaceScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token || '';
  const params = useLocalSearchParams<{ projectId?: string | string[] }>();
  const projectId = firstParam(params.projectId).trim();
  const [request, setRequest] = useState<WorkspaceRequest>({ projectId: '', data: null, error: '', settled: false });

  const currentRequest = request.projectId === projectId ? request : null;
  const data = currentRequest?.data || null;
  const error = !projectId ? 'معرّف المشروع غير صالح.' : currentRequest?.error || '';
  const loading = Boolean(accessToken && projectId && !currentRequest?.settled);

  async function load() {
    if (!accessToken || !projectId) return;
    setRequest({ projectId, data: null, error: '', settled: false });
    try {
      const payload = await apiRequest<Workspace>(`/api/v1/mobile/projects/${encodeURIComponent(projectId)}`, accessToken);
      setRequest({ projectId, data: payload, error: '', settled: true });
    } catch {
      setRequest({
        projectId,
        data: null,
        error: 'تعذر تحميل مساحة المشروع الحالية. لم يتم عرض بيانات قديمة أو جزئية.',
        settled: true,
      });
    }
  }

  useEffect(() => {
    if (!accessToken || !projectId) return;
    let active = true;
    void apiRequest<Workspace>(`/api/v1/mobile/projects/${encodeURIComponent(projectId)}`, accessToken)
      .then((payload) => {
        if (!active) return;
        setRequest({ projectId, data: payload, error: '', settled: true });
      })
      .catch(() => {
        if (!active) return;
        setRequest({
          projectId,
          data: null,
          error: 'تعذر تحميل مساحة المشروع الحالية. لم يتم عرض بيانات قديمة أو جزئية.',
          settled: true,
        });
      });
    return () => { active = false; };
  }, [accessToken, projectId]);

  return (
    <Screen>
      <Eyebrow>PROJECT WORKSPACE</Eyebrow>
      <Title>{data?.project.name || 'مساحة المشروع'}</Title>
      {data ? <Muted>{data.project.industry || data.project.type} • {data.project.language} • {data.project.tone}</Muted> : null}

      {loading ? <ActivityIndicator color={colors.red} /> : null}
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          {projectId ? <Pressable onPress={() => void load()} style={styles.outlineButton}><Text style={styles.outlineText}>إعادة تحميل مساحة المشروع</Text></Pressable> : null}
        </Card>
      ) : null}

      {data ? (
        <>
          {data.project.description ? <Card><Text style={styles.sectionTitle}>سياق المشروع</Text><Muted>{data.project.description}</Muted>{data.project.targetAudience ? <Text style={styles.meta}>الجمهور: {data.project.targetAudience}</Text> : null}</Card> : null}

          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statValue}>{data.stats.generations}</Text><Text style={styles.statLabel}>توليد AI</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{data.stats.assets}</Text><Text style={styles.statLabel}>أصل</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{data.stats.socialPosts}</Text><Text style={styles.statLabel}>منشور</Text></View>
          </View>

          <Card>
            <Text style={styles.sectionTitle}>إجراءات المشروع</Text>
            <Muted>كل إجراء يحافظ على هذا المشروع كسياق، لكن الخادم يعيد التحقق من الملكية قبل أي توليد أو حفظ.</Muted>
            <PrimaryButton
              label="إنشاء حملة لهذا المشروع"
              onPress={() => router.push({ pathname: '/campaign', params: { projectId: data.project.id } })}
            />
            <Pressable onPress={() => router.push('/planner')} style={styles.outlineButton}><Text style={styles.outlineText}>فتح مخطط المحتوى</Text></Pressable>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Brand Kit المستخدم</Text>
              <Text style={styles.scopeBadge}>على مستوى الحساب</Text>
            </View>
            {data.brandKit ? (
              <>
                <Text style={styles.itemTitle}>{data.brandKit.brandName || 'بدون اسم علامة'}</Text>
                {data.brandKit.tagline ? <Muted>{data.brandKit.tagline}</Muted> : null}
                <View style={styles.colors}>
                  {[data.brandKit.primaryColor, data.brandKit.secondaryColor, data.brandKit.accentColor].map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.colorItem}>
                      <View style={[styles.swatch, { backgroundColor: safeColor(item) }]} />
                      <Text style={styles.colorCode}>{item}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.meta}>الخط: {data.brandKit.fontFamily}</Text>
                <Text style={styles.meta}>نبرة الهوية: {data.brandKit.toneOfVoice}</Text>
                <Muted>هذه هوية الحساب المشتركة التي يستخدمها المشروع حاليًا؛ ليست Brand Kit مستقلة خاصة بهذا المشروع.</Muted>
              </>
            ) : <Muted>لم يتم إعداد Brand Kit للحساب بعد. المشروع يعمل بدون ادعاء وجود هوية غير محفوظة.</Muted>}
          </Card>

          <Text style={styles.heading}>آخر التوليدات</Text>
          {!data.recentGenerations.length ? <Card><Muted>لا توجد توليدات مرتبطة بهذا المشروع بعد.</Muted></Card> : null}
          {data.recentGenerations.map((item) => (
            <Card key={item.id}>
              <View style={styles.sectionHeader}>
                <Text style={styles.itemTitle}>{item.type}</Text>
                <Text style={styles.status}>{statusLabel[item.status] || item.status}</Text>
              </View>
              {item.prompt ? <Text style={styles.body}>{item.prompt}</Text> : null}
              {item.resultContent ? <Muted>{item.resultContent}</Muted> : null}
              <Text style={styles.meta}>{item.model} • {item.creditsConsumed} نقطة • {new Date(item.createdAt).toLocaleDateString('ar-LY')}</Text>
            </Card>
          ))}

          <Text style={styles.heading}>آخر الأصول</Text>
          {!data.recentAssets.length ? <Card><Muted>لا توجد أصول محفوظة لهذا المشروع بعد.</Muted></Card> : null}
          {data.recentAssets.map((item) => (
            <Card key={item.id}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Muted>{item.mimeType}</Muted>
              <Text style={styles.meta}>{item.width && item.height ? `${item.width}×${item.height} • ` : ''}{new Date(item.createdAt).toLocaleDateString('ar-LY')}</Text>
            </Card>
          ))}

          <Text style={styles.heading}>المحتوى الاجتماعي</Text>
          {!data.recentSocialPosts.length ? <Card><Muted>لا توجد مسودات أو منشورات اجتماعية مرتبطة بهذا المشروع.</Muted></Card> : null}
          {data.recentSocialPosts.map((item) => (
            <Card key={item.id}>
              <View style={styles.sectionHeader}>
                <Text style={styles.status}>{statusLabel[item.status] || item.status}</Text>
                <Text style={styles.providers}>{item.targetProviders.length ? item.targetProviders.join(' • ') : 'بدون قناة'}</Text>
              </View>
              {item.content ? <Text style={styles.body}>{item.content}</Text> : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: '#FF777D', textAlign: 'right', lineHeight: 22 },
  stats: { flexDirection: 'row-reverse', gap: 8 },
  stat: { flex: 1, minHeight: 82, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 8 },
  statValue: { color: colors.text, fontWeight: '900', fontSize: 22 },
  statLabel: { color: colors.textMuted, fontWeight: '700', fontSize: 11, marginTop: 4 },
  heading: { color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'right', marginTop: space.sm },
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 16, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  scopeBadge: { color: colors.info, fontSize: 10, fontWeight: '900' },
  itemTitle: { color: colors.text, fontWeight: '900', fontSize: 15, textAlign: 'right' },
  body: { color: colors.text, textAlign: 'right', lineHeight: 22 },
  meta: { color: colors.textMuted, fontSize: 11, textAlign: 'right', lineHeight: 19 },
  status: { color: colors.red, fontSize: 11, fontWeight: '900' },
  providers: { color: colors.textMuted, fontSize: 10, fontWeight: '700', flexShrink: 1, textAlign: 'left' },
  colors: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  colorItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, padding: 8 },
  swatch: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  colorCode: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  outlineButton: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  outlineText: { color: colors.text, fontWeight: '900' },
});
