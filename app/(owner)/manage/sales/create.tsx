import { useRouter } from 'expo-router';
import { SalesEntryScreen } from '@/components/screens';

export default function OwnerSalesCreateScreen() {
  const router = useRouter();

  return (
    <SalesEntryScreen
      title="Create Sale"
      subtitle="Owner can record sales"
      onBack={() => router.replace('/(owner)/manage/sales')}
      onSaved={() => router.replace('/(owner)/manage/sales')}
    />
  );
}
