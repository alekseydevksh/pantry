import { useLocalSearchParams } from 'expo-router';

import { AddToCartButton } from '@/features/cart';
import { ProductScreen } from '@/features/catalog';

export default function ProductRoute() {
  const { id } = useLocalSearchParams<'/product/[id]'>();
  return <ProductScreen id={id} actions={(productId) => <AddToCartButton id={productId} />} />;
}
