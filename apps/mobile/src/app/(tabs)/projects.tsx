import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors } from '@/theme/tokens';

type Bootstrap = { projects: Array<{ id: string; name: string; type: string; industry: string | null; updatedAt: string }> };

export default function ProjectsScreen() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Bootstrap['projects']>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session?.access_token) return;
    apiRequest<Bootstrap>('/api/v1/mobile/bootstrap', session.access_token)
      .then((payload) => setProjects(payload.projects))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  return <Screen><Eyebrow>MARKETING PROJECTS</Eyebrow><Title>مشاريعك في مكان واحد.</Title><Muted>المشروع هو الحاوية الموحدة للنص والصور والفيديو والهوية والحملة.</Muted>{loading ? <ActivityIndicator color={colors.red} /> : null}{!loading && !projects.length ? <Card><Text style={styles.empty}>لا توجد مشاريع بعد. أنشئ مشروعك الأول من منصة Brand Box أو من Composer القادم.</Text></Card> : null}{projects.map((project) => <Card key={project.id}><Text style={styles.name}>{project.name}</Text><Muted>{project.industry || project.type}</Muted><Text style={styles.meta}>{new Date(project.updatedAt).toLocaleDateString('ar-LY')}</Text></Card>)}</Screen>;
}

const styles = StyleSheet.create({ name: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' }, meta: { color: colors.textMuted, fontSize: 12, textAlign: 'right' }, empty: { color: colors.textMuted, textAlign: 'right', lineHeight: 22 } });
