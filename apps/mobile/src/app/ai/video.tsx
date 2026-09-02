import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput } from 'react-native';
import { apiRequest, requestId } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Muted, PrimaryButton, Screen } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Project = { id: string; name: string; type: string };
type Bootstrap = { projects: Project[] };
type VideoModel = { modelId: string; name: string; pricingReady: boolean };
type VideoCatalog = { providerConfigured: boolean; models: VideoModel[] };

export default function VideoScreen() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [catalog, setCatalog] = useState<VideoCatalog | null>(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const project = useMemo(() => projects.find((item) => item.type.toLowerCase().includes('video') || item.type.includes('فيديو')) || null, [projects]);

  useEffect(() => {
    if (!session?.access_token) return;
    apiRequest<Bootstrap>('/api/v1/mobile/bootstrap', session.access_token).then((data) => setProjects(data.projects));
  }, [session?.access_token]);
  useEffect(() => {
    if (!session?.access_token || !project) return;
    apiRequest<VideoCatalog>(`/api/v1/video-generations?projectId=${encodeURIComponent(project.id)}`, session.access_token).then(setCatalog).catch(() => setCatalog(null));
  }, [session?.access_token, project]);

  async function generate() {
    const model = catalog?.models.find((item) => item.pricingReady);
    if (!session?.access_token || !project || !model || !prompt.trim()) return;
    setBusy(true); setMessage('');
    try {
      await apiRequest('/api/v1/video-generations', session.access_token, { method: 'POST', body: JSON.stringify({ projectId: project.id, modelId: model.modelId, prompt: prompt.trim(), requestId: requestId('bbmvideo'), settings: { ratio: '1280:720', duration: 5, quality: 'standard' } }) });
      setMessage('بدأ إنشاء الفيديو بأمان. يمكن متابعة الحالة من المشروع.');
    } catch { setMessage('تعذر بدء الفيديو. تحقق من توفر مشروع فيديو، النموذج، الرصيد، واعتماد مزود الفيديو.'); }
    finally { setBusy(false); }
  }

  const model = catalog?.models.find((item) => item.pricingReady);
  return <Screen>{!project ? <Card><Text style={styles.warning}>يلزم مشروع من نوع فيديو قبل التوليد حتى تبقى الأصول والحسابات داخل نطاق المشروع الصحيح.</Text></Card> : null}{project ? <Muted>المشروع: {project.name}</Muted> : null}{catalog && !catalog.providerConfigured ? <Card><Text style={styles.warning}>مزود الفيديو غير مفعّل على الخادم حاليًا، لذلك لن نعرضه كخدمة جاهزة.</Text></Card> : null}<TextInput multiline value={prompt} onChangeText={setPrompt} placeholder="صف مشهد الفيديو التسويقي..." placeholderTextColor={colors.textMuted} style={styles.input} />{busy ? <ActivityIndicator color={colors.red} /> : <PrimaryButton label="إنشاء الفيديو" onPress={generate} disabled={!project || !model || !catalog?.providerConfigured || !prompt.trim()} />}{message ? <Text style={styles.message}>{message}</Text> : null}</Screen>;
}

const styles = StyleSheet.create({ input: { minHeight: 150, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: space.md, color: colors.text, textAlign: 'right', textAlignVertical: 'top', lineHeight: 23 }, warning: { color: colors.warning, textAlign: 'right', lineHeight: 22 }, message: { color: colors.text, textAlign: 'right', lineHeight: 22 } });
