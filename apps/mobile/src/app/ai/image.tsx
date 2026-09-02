import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput } from 'react-native';
import { apiRequest, requestId } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Muted, PrimaryButton, Screen } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Model = { model_id: string; display_name_ar?: string; display_name_en?: string; minimum_credits: number };
type Catalog = { imageModels: Model[] };
type GenerationResult = { success?: boolean; resultUrl?: string; errorMessage?: string };

export default function ImageScreen() {
  const { session } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [prompt, setPrompt] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    apiRequest<Catalog>('/api/v1/generations?generationType=image', session.access_token).then((data) => setModels(data.imageModels || [])).catch(() => setError('تعذر تحميل نماذج الصور.'));
  }, [session?.access_token]);

  async function generate() {
    if (!session?.access_token || !models[0] || !prompt.trim()) return;
    setBusy(true); setError(''); setResultUrl('');
    try {
      const result = await apiRequest<GenerationResult>('/api/v1/generations', session.access_token, { method: 'POST', body: JSON.stringify({ generationType: 'image', modelId: models[0].model_id, prompt: prompt.trim(), requestId: requestId('bbmimg'), settings: { aspectRatio: '1:1', resolution: '1K', count: 1, style: 'none', useBrandKit: false } }) });
      if (result.resultUrl) setResultUrl(result.resultUrl); else setError('اكتملت العملية دون رابط صورة مباشر. ستظهر النتيجة في سجل المشروع عند توفر الأصل.');
    } catch { setError('تعذر توليد الصورة الآن.'); }
    finally { setBusy(false); }
  }

  return <Screen><Muted>{models[0] ? `النموذج: ${models[0].display_name_ar || models[0].display_name_en || models[0].model_id} • الحد الأدنى ${models[0].minimum_credits} نقطة` : 'جارٍ تحميل نموذج متاح...'}</Muted><TextInput multiline value={prompt} onChangeText={setPrompt} placeholder="صف الصورة التسويقية التي تريدها..." placeholderTextColor={colors.textMuted} style={styles.input} />{busy ? <ActivityIndicator color={colors.red} /> : <PrimaryButton label="إنشاء الصورة" onPress={generate} disabled={!prompt.trim() || !models[0]} />}{error ? <Text style={styles.error}>{error}</Text> : null}{resultUrl ? <Image source={{ uri: resultUrl }} style={styles.image} resizeMode="cover" alt="نتيجة الصورة المولدة بالذكاء الاصطناعي" /> : null}</Screen>;
}

const styles = StyleSheet.create({ input: { minHeight: 150, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: space.md, color: colors.text, textAlign: 'right', textAlignVertical: 'top', lineHeight: 23 }, image: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.surface }, error: { color: '#FF777D', textAlign: 'right', lineHeight: 21 } });
