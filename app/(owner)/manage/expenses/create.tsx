import { useRouter } from "expo-router";
import { ExpenseEntryScreen } from "@/components/screens";

export default function OwnerExpenseCreateRoute() {
  const router = useRouter();

  return (
    <ExpenseEntryScreen
      title="Create Expense"
      subtitle="Company expenses affect farmer earnings only."
      onBack={() => router.replace('/(owner)/manage/expenses')}
    />
  );
}
