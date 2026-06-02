import { useRouter } from 'expo-router';
import { BatchRecordsListScreen } from '@/components/screens';

export default function OwnerSalesScreen() {
  const router = useRouter();

  return (
    <BatchRecordsListScreen
      mode="sales"
      title="Sales"
      subtitle="Batch-wise sales list"
      createRoute="/(owner)/manage/sales/create"
      createPermission="create:sales"
      onBack={() => router.replace('/(owner)/dashboard')}
    />
  );
}
