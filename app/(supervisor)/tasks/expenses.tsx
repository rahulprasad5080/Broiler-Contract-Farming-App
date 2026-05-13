import { ExpenseEntryScreen } from "@/components/screens";

export default function SupervisorExpenseEntryRoute() {
  return (
    <ExpenseEntryScreen
      title="Expense Entry"
      subtitle="Record farmer expenses; company expenses appear only when permission is enabled."
    />
  );
}
