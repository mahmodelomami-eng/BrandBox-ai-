import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput } from 'react-native';
import { apiRequest, requestId } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, Muted, PrimaryButton, Screen } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Model = { model_id: string; display_name_ar?: string; display_name_en?: string; minimum_credits: number };
type Catalog = { chatModels: Model[] };

type GenerationResult = { success?: boolean; content?: string; resultContent?: string; errorMessage?: string; remainingBalance?: number };

export default function ChatScreen() {
  const { session } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    apiRequest<Catalog>('/api/v1/generations?generationType=chat', session.access_token).then((data) => setModels(data.chatModels || [])).catch(() => setError('تعذر تحميل نماذج المحادثة.'));
  }, [session?.access_token]);

  async function generate() {
    if (!session?.access_token || !models[0] || !prompt.trim()) return;
    setBusy(true); setError(''); setAnswer('');
    try {
      const result = await apiRequest<GenerationResult>('/api/v1/generations', session.access_token, { method: 'POST', body: JSON.stringify({ generationType: 'chat', modelId: models[0].model_id, prompt: prompt.trim(), requestId: requestId('bbmchat') }) });
      setAnswer(result.content || result.resultContent || 'تمت العملية بنجاح.');
    } catch { setError('تعذر إكمال الطلب الآن. لم يتم تجاوز محرك الرصيد أو صلاحيات الخادم.'); }
    finally { setBusy(false); }
  }

  return <Screen><Muted>{models[0] ? `النموذج: ${models[0].display_name_ar || models[0].display_name_en || models[0].model_id} • الحد الأدنى ${models[0].minimum_credits} نقطة` : 'جارٍ تحميل نموذج متاح...'}</Muted><TextInput multiline value={prompt} onChangeText={setPrompt} placeholder="مثال: جهّز فكرة حملة لإطلاق منتج جديد..." placeholderTextColor={colors.textMuted} style={styles.input} />{busy ? <ActivityIndicator color={colors.red} /> : <PrimaryButton label="توليد" onPress={generate} disabled={!prompt.trim() || !models[0]} />}{error ? <Text style={styles.error}>{error}</Text> : null}{answer ? <Card><Text style={styles.answer}>{answer}</Text></Card> : null}</Screen>;
}

const styles = StyleSheet.create({ input: { minHeight: 170, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: space.md, color: colors.text, textAlign: 'right', textAlignVertical: 'top', fontSize: 15, lineHeight: 23 }, answer: { color: colors.text, textAlign: 'right', lineHeight: 24 }, error: { color: '#FF777D', textAlign: 'right', lineHeight: 21 } });
