import { useRouter } from 'expo-router';
import { DailyEntryListScreen } from '@/components/screens';

export default function OwnerDailyEntryScreen() {
  const router = useRouter();

  return (
    <DailyEntryListScreen
      title="Daily Entries"
      subtitle="Review daily flock logs"
      formPath="/(owner)/manage/daily-entry/form"
      onBack={() => router.replace('/(owner)/dashboard')}
    />
  );
}
