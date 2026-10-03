import { StyleSheet, Text, View } from 'react-native';

import { env } from '@/config/env';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stage Zero</Text>
      <Text style={styles.line}>API: {env.apiUrl || 'не задан'}</Text>
      <Text style={styles.line}>Моки: {env.useMocks ? 'включены' : 'выключены'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 12,
  },
  line: {
    fontSize: 16,
    marginTop: 4,
  },
});
