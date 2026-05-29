import React from "react";
import { useRouter } from "expo-router";
import { ExpenseEntryScreen } from "@/components/screens";

export default function OwnerExpenseEntryRoute() {
  const router = useRouter();

  return (
    <ExpenseEntryScreen
      title="Batch Expense Entry"
      subtitle="Company expenses affect farmer earnings only."
      onBack={() => router.replace('/(owner)/dashboard')}
    />
  );
}
