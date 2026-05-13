import { ExpenseEntryScreen } from "@/components/screens";

export default function FarmerExpenseEntryRoute() {
  return (
    <ExpenseEntryScreen
      title="Farmer Expense Entry"
      subtitle="Add farmer-paid expenses only. These affect farmer P&L, not company profitability."
    />
  );
}
