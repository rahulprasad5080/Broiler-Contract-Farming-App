import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { SalesEntryScreen } from '@/components/screens';

export default function OwnerSalesCreateScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const redirectPath = typeof returnTo === 'string' && returnTo.length > 0
    ? returnTo
    : '/(owner)/manage/sales';

  return (
    <SalesEntryScreen
      title="Create Sale"
      subtitle="Owner can record sales"
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(redirectPath as Href);
        }
      }}
      onSaved={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(redirectPath as Href);
        }
      }}
    />
  );
}
