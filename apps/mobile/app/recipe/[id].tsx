import { useLocalSearchParams } from 'expo-router';

import { RecipeScreen } from '@/features/catalog';

export default function RecipeRoute() {
  const { id } = useLocalSearchParams<'/recipe/[id]'>();
  return <RecipeScreen id={id} />;
}
