import { DailyEntryListScreen } from '@/components/screens';

export default function SupervisorDailyEntryListScreen() {
  return (
    <DailyEntryListScreen
      title="Daily Entries"
      subtitle="Review daily flock logs"
      formPath="/(supervisor)/tasks/daily/form"
    />
  );
}
