import { router } from 'expo-router';

import { AssistantScreen } from '@/features/assistant';

export default function AssistantRoute() {
  // Closing goes back to the previous screen. With no history (the modal was the first screen),
  // it goes home instead of doing nothing.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return <AssistantScreen onClose={close} />;
}
