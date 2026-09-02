import { Tabs } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 66, paddingTop: 8 }, tabBarActiveTintColor: colors.red, tabBarInactiveTintColor: colors.textMuted, tabBarLabelStyle: { fontSize: 11, fontWeight: '700', paddingBottom: 8 } }}>
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="trends" options={{ title: 'الترندات' }} />
      <Tabs.Screen name="create" options={{ title: 'إنشاء' }} />
      <Tabs.Screen name="projects" options={{ title: 'المشاريع' }} />
      <Tabs.Screen name="store" options={{ title: 'المتجر' }} />
    </Tabs>
  );
}
