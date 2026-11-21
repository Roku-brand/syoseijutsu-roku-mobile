import { Redirect } from 'expo-router';
import { InstallationGuide } from '@/components/installation-guide';
import { useGuides } from '@/onboarding/guide-provider';

export default function InstallationGuideRoute() {
  const { kind, finishGuide } = useGuides();
  if (!kind) return <Redirect href="/" />;
  return <InstallationGuide key={kind} kind={kind} onFinish={finishGuide} />;
}
