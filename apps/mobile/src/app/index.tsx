import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.red} size="large" /></View>;
  return <Redirect href={session ? '/(tabs)' : '/sign-in'} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' } });
