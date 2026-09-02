import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

const tools = [
  { title: 'المساعد الذكي', desc: 'أفكار، كتابة، تخطيط حملات ومحتوى.', path: '/ai/chat' as const, badge: 'CHAT' },
  { title: 'توليد الصور', desc: 'صور إعلانية ومفاهيم بصرية من نماذج المنصة.', path: '/ai/image' as const, badge: 'IMAGE' },
  { title: 'توليد الفيديو', desc: 'فيديو تسويقي مرتبط بمشروع فيديو.', path: '/ai/video' as const, badge: 'VIDEO' },
];

export default function CreateScreen() {
  return (
    <Screen>
      <Eyebrow>AI STUDIO</Eyebrow>
      <Title>ماذا تريد أن تنشئ اليوم؟</Title>
      <Muted>كل عملية تستخدم نفس محرك Brand Box ونفس رصيد النقاط في المنصة.</Muted>
      <View style={styles.grid}>
        {tools.map((tool) => (
          <Pressable key={tool.title} onPress={() => router.push(tool.path)}>
            <Card>
              <Text style={styles.badge}>{tool.badge}</Text>
              <Text style={styles.title}>{tool.title}</Text>
              <Muted>{tool.desc}</Muted>
              <Text style={styles.open}>فتح الأداة ←</Text>
            </Card>
          </Pressable>
        ))}
      </View>
      <View style={styles.note}><Text style={styles.noteTitle}>Campaign Composer</Text><Muted>الخطوة التالية تربط الترند + المشروع + Brand Kit + القنوات في تدفق واحد لإنتاج حملة كاملة.</Muted></View>
    </Screen>
  );
}

const styles = StyleSheet.create({ grid: { gap: space.md }, badge: { alignSelf: 'flex-end', color: colors.red, backgroundColor: colors.redSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, fontWeight: '900', fontSize: 11 }, title: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'right' }, open: { color: colors.red, fontWeight: '800', textAlign: 'right' }, note: { padding: space.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md }, noteTitle: { color: colors.text, fontWeight: '900', textAlign: 'right' } });
