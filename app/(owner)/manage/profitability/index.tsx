import { useRouter } from 'expo-router';
import { BatchRecordsListScreen } from '@/components/screens';

export default function OwnerProfitabilityScreen() {
  const router = useRouter();

  return (
    <BatchRecordsListScreen
      mode="profitability"
      title="Profitability"
      subtitle="Batch-wise P&L summary"
      onBack={() => router.replace('/(owner)/dashboard')}
    />
  );
}
