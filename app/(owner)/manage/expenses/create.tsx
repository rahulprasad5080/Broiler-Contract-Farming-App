import { useRouter, useLocalSearchParams, type Href } from "expo-router";
import { ExpenseEntryScreen } from "@/components/screens";

export default function OwnerExpenseCreateRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const redirectPath = typeof returnTo === 'string' && returnTo.length > 0
    ? returnTo
    : '/(owner)/manage/expenses';

  const handleBackOrSaved = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(redirectPath as Href);
    }
  };

  return (
    <ExpenseEntryScreen
      title="Create Expense"
      subtitle="Company expenses affect farmer earnings only."
      onBack={handleBackOrSaved}
      onSaved={handleBackOrSaved}
    />
  );
}
