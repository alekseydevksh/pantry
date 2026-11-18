import { useFragment } from '@apollo/client/react';

import { ProductHeaderFieldsFragmentDoc } from '@pantry/shared';

import { Button } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

/**
 * The add-to-cart button. The cart arrives in Phase 3 (PLAN 3.10), so for now the button is there
 * but cannot be pressed, and says so to a screen reader (`disabled`). An out-of-stock product has
 * nothing to add, so it says that instead.
 */
export function AddToCartButton({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: ProductHeaderFieldsFragmentDoc,
    from: { __typename: 'Product', id },
  });

  return (
    <Button
      title={complete && !data.inStock ? t('feed.outOfStock') : t('product.addToCart')}
      disabled
      onPress={() => {}}
    />
  );
}
