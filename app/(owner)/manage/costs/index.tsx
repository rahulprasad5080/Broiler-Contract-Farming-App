import { useRouter } from 'expo-router';
import { BatchRecordsListScreen } from '@/components/screens';

export default function OwnerCostsScreen() {
  const router = useRouter();

  return (
    <BatchRecordsListScreen
      mode="costs"
      title="Costs"
      subtitle="Batch-wise cost list"
      createRoute="/(owner)/manage/batches/cost-create"
      onBack={() => router.replace('/(owner)/dashboard')}
    />
  );
}
