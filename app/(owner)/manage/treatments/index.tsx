import { TreatmentListScreen } from '@/components/screens';
import { useRouter } from 'expo-router';

export default function OwnerTreatmentsListScreen() {
  const router = useRouter();

  return (
    <TreatmentListScreen
      title="Treatments"
      subtitle="Batch-wise treatment history"
      addRoute="/(owner)/manage/treatments/add"
      onBack={() => router.replace('/(owner)/dashboard')}
    />
  );
}
