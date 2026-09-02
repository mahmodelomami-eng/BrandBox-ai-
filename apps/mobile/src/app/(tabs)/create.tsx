import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Eyebrow, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

const tools = [
  { title: 'Campaign Composer', desc: 'حوّل هدف المشروع أو فرصة ترند إلى استراتيجية ومسودات مخصصة للقنوات.', path: '/campaign' as const, badge: 'CAMPAIGN' },
  { title: 'المساعد الذكي', desc: 'أفكار، كتابة، تخطيط ومحتوى داخل Brand Box.', path: '/ai/chat' as const, badge: 'CHAT' },
  { title: 'توليد الصور', desc: 'صور إعلانية ومفاهيم بصرية من نماذج المنصة.', path: '/ai/image' as const, badge: 'IMAGE' },
  { title: 'توليد الفيديو', desc: 'فيديو تسويقي مرتبط بمشروع فيديو.', path: '/ai/video' as const, badge: 'VIDEO' },
];

export default function CreateScreen() {
  return (
    <Screen>
      <Eyebrow>AI STUDIO</Eyebrow>
      <Title>ابدأ من النتيجة التي تريدها.</Title>
      <Muted>Campaign Composer يجمع المشروع والهوية والقنوات في تدفق واحد، بينما تبقى أدوات AI الفردية متاحة للعمل المباشر.</Muted>
      <View style={styles.grid}>
        {tools.map((tool) => (
          <Pressable key={tool.title} onPress={() => router.push(tool.path)}>
            <Card>
              <Text style={styles.badge}>{tool.badge}</Text>
              <Text style={styles.title}>{tool.title}</Text>
              <Muted>{tool.desc}</Muted>
              <Text style={styles.open}>فتح ←</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.md },
  badge: { alignSelf: 'flex-end', color: colors.red, backgroundColor: colors.redSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, fontWeight: '900', fontSize: 11 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'right' },
  open: { color: colors.red, fontWeight: '800', textAlign: 'right' },
});
