import { TreatmentListScreen } from '@/components/screens';

export default function SupervisorTreatmentsListScreen() {
  return (
    <TreatmentListScreen
      title="Treatments"
      subtitle="Treatment history by batch"
      addRoute="/(supervisor)/tasks/treatments/add"
    />
  );
}
