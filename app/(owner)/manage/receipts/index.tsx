import { TopAppBar } from '@/components/ui/TopAppBar';
import { useRouter } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';

export default function ReceiptsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Receipts"
        subtitle="All incoming receipts"
        onBack={() => router.replace('/(owner)/dashboard')}
      />
      <View style={styles.content}>
        <Text style={styles.helloText}>Hello</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helloText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B5C36',
  },
});
