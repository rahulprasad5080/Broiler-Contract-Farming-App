import { DailyEntryScreen } from '@/components/screens';

export default function SupervisorDailyEntryFormScreen() {
  return (
    <DailyEntryScreen
      title="Daily Entry"
      subtitle="Review and submit daily flock data"
      listPath="/(supervisor)/tasks/daily"
    />
  );
}
