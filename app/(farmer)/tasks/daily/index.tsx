import { DailyEntryListScreen } from '@/components/screens';

export default function FarmerDailyEntryListScreen() {
  return (
    <DailyEntryListScreen
      title="Daily Entries"
      subtitle="Review daily flock logs"
      formPath="/(farmer)/tasks/daily/form"
    />
  );
}
