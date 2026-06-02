import { TreatmentListScreen } from '@/components/screens';

export default function OwnerTreatmentsListScreen() {
  return (
    <TreatmentListScreen
      title="Treatments"
      subtitle="Batch-wise treatment history"
      addRoute="/(owner)/manage/treatments/add"
    />
  );
}
