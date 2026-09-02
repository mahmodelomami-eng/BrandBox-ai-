import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/providers/auth-provider';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="campaign" options={{ title: 'Campaign Composer' }} />
        <Stack.Screen name="social" options={{ title: 'حسابات السوشيال' }} />
        <Stack.Screen name="planner" options={{ title: 'مخطط المحتوى' }} />
        <Stack.Screen name="ai/chat" options={{ title: 'مساعد Brand Box' }} />
        <Stack.Screen name="ai/image" options={{ title: 'توليد الصور' }} />
        <Stack.Screen name="ai/video" options={{ title: 'توليد الفيديو' }} />
      </Stack>
    </AuthProvider>
  );
}
