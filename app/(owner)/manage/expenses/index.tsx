import { useRouter } from "expo-router";
import { BatchRecordsListScreen } from "@/components/screens";

export default function OwnerExpenseEntryRoute() {
  const router = useRouter();

  return (
    <BatchRecordsListScreen
      mode="expenses"
      title="Expenses"
      subtitle="Batch-wise expense list"
      createRoute="/(owner)/manage/expenses/create"
      onBack={() => router.replace('/(owner)/dashboard')}
    />
  );
}
