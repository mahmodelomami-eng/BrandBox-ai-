import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Project = {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  industry: string | null;
  targetAudience?: string | null;
  language?: string;
  tone?: string;
  updatedAt: string;
};

type Bootstrap = { projects: Project[] };
type CreateProjectPayload = { project: Project };

const projectTypes = ['صورة', 'محادثة', 'فيديو', 'صوت'] as const;

function fetchProjects(accessToken: string) {
  return apiRequest<Bootstrap>('/api/v1/mobile/bootstrap', accessToken);
}

export default function ProjectsScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token || '';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof projectTypes)[number]>('صورة');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void fetchProjects(accessToken)
      .then((payload) => {
        if (!active) return;
        setProjects(payload.projects || []);
        setError('');
      })
      .catch(() => {
        if (active) setError('تعذر تحميل المشاريع. لم يتم تغيير أي بيانات.');
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
      const payload = await fetchProjects(accessToken);
      setProjects(payload.projects || []);
    } catch {
      setError('تعذر تحميل المشاريع. تحقق من الاتصال ثم أعد المحاولة.');
    } finally {
      setLoading(false);
    }
  }

  function resetCreateForm() {
    setName('');
    setType('صورة');
    setIndustry('');
    setDescription('');
    setCreating(false);
  }

  async function createProject() {
    if (!accessToken || saving || name.trim().length < 2) return;
    setSaving(true);
    setError('');
    try {
      const payload = await apiRequest<CreateProjectPayload>('/api/v1/mobile/projects', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          type,
          industry: industry.trim(),
          description: description.trim(),
        }),
      });
      setProjects((current) => [payload.project, ...current.filter((item) => item.id !== payload.project.id)]);
      resetCreateForm();
    } catch {
      setError('تعذر إنشاء المشروع. راجع الاسم والبيانات ثم أعد المحاولة. لم يتم إنشاء نسخة جزئية.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Eyebrow>MARKETING PROJECTS</Eyebrow>
      <Title>مشاريعك في مكان واحد.</Title>
      <Muted>المشروع هو الحاوية الموحدة للنص والصور والفيديو والهوية والحملة، ويمكن إنشاؤه من الهاتف مباشرة.</Muted>

      {!creating ? <PrimaryButton label="+ مشروع جديد" onPress={() => setCreating(true)} /> : null}

      {creating ? (
        <Card>
          <Text style={styles.formTitle}>مشروع جديد</Text>
          <Text style={styles.label}>اسم المشروع</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={120}
            placeholder="مثال: حملة إطلاق Brand Box"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>نوع المشروع</Text>
          <View style={styles.types}>
            {projectTypes.map((item) => {
              const active = item === type;
              return (
                <Pressable key={item} onPress={() => setType(item)} style={[styles.type, active && styles.typeActive]}>
                  <Text style={[styles.typeText, active && styles.typeTextActive]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>المجال</Text>
          <TextInput
            value={industry}
            onChangeText={setIndustry}
            maxLength={160}
            placeholder="اختياري: تعليم، مطاعم، تقنية..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>وصف مختصر</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={1200}
            placeholder="اختياري: الهدف والسياق الأساسي للمشروع..."
            placeholderTextColor={colors.textMuted}
            style={styles.description}
          />

          {saving ? <ActivityIndicator color={colors.red} /> : <PrimaryButton label="إنشاء المشروع" onPress={createProject} disabled={name.trim().length < 2} />}
          <Pressable disabled={saving} onPress={resetCreateForm} style={styles.cancel}><Text style={styles.cancelText}>إلغاء</Text></Pressable>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Pressable disabled={loading} onPress={() => void retry()} style={styles.retry}>
            <Text style={styles.retryText}>إعادة تحميل المشاريع</Text>
          </Pressable>
        </Card>
      ) : null}

      {loading ? <ActivityIndicator color={colors.red} /> : null}
      {!loading && !error && !projects.length ? (
        <Card><Text style={styles.empty}>لا توجد مشاريع بعد. أنشئ مشروعك الأول هنا، ثم استخدمه في Campaign Composer وأدوات AI.</Text></Card>
      ) : null}

      {projects.map((project) => (
        <Pressable
          key={project.id}
          onPress={() => router.push({ pathname: '/project/[projectId]', params: { projectId: project.id } })}
        >
          <Card>
            <Text style={styles.name}>{project.name}</Text>
            <Muted>{project.industry || project.type}</Muted>
            <View style={styles.metaRow}>
              <Text style={styles.kind}>{project.type}</Text>
              <Text style={styles.meta}>{new Date(project.updatedAt).toLocaleDateString('ar-LY')}</Text>
            </View>
            <Text style={styles.open}>فتح مساحة المشروع ←</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  formTitle: { color: colors.text, fontSize: 19, fontWeight: '900', textAlign: 'right' },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 12, color: colors.text, textAlign: 'right' },
  description: { minHeight: 94, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 12, color: colors.text, textAlign: 'right', textAlignVertical: 'top' },
  types: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  type: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceRaised },
  typeActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  typeText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  typeTextActive: { color: colors.red },
  cancel: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: '800' },
  error: { color: '#FF777D', textAlign: 'right', lineHeight: 22 },
  retry: { minHeight: 42, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.text, fontWeight: '800' },
  name: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  metaRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: space.sm, alignItems: 'center' },
  kind: { color: colors.info, fontSize: 11, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
  open: { color: colors.red, fontWeight: '900', fontSize: 12, textAlign: 'right', marginTop: 4 },
  empty: { color: colors.textMuted, textAlign: 'right', lineHeight: 22 },
});
