import { useLocalSearchParams } from 'expo-router';

import { ProductScreen } from '@/features/catalog';

export default function ProductRoute() {
  const { id } = useLocalSearchParams<'/product/[id]'>();
  return <ProductScreen id={id} />;
}
