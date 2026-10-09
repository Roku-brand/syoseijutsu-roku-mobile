import { useRouter } from 'expo-router';
import { UpgradeLanding } from '@/components/upgrade-landing';

// Presentation-only reference design. This route never creates a checkout.
export default function UpgradePreviewScreen() {
  const router = useRouter();
  return <UpgradeLanding
    price="¥320"
    onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
    onPurchase={() => {}}
    onTerms={() => router.push('/legal/terms')}
    onCommerce={() => router.push('/legal/commerce')}
  />;
}
