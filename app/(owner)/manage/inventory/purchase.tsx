import { useRouter } from 'expo-router';
import { PurchaseEntryScreen } from '@/components/screens';

export default function InventoryPurchaseRoute() {
  const router = useRouter();
  return <PurchaseEntryScreen onBack={() => router.replace('/(owner)/dashboard')} />;
}
