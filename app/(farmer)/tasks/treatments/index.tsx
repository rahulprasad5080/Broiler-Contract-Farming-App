import { TreatmentListScreen } from '@/components/screens';

export default function FarmerTreatmentsListScreen() {
  return (
    <TreatmentListScreen
      title="Treatments"
      subtitle="Treatment history for your assigned batches"
      addRoute="/(farmer)/tasks/treatments/add"
    />
  );
}
