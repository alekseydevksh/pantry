import { act, screen, userEvent, waitFor, within } from '@testing-library/react-native';

import { makeProduct } from '@/test/fixtures';
import { createFakeCart } from '@/test/msw/cartServer';
import { server } from '@/test/msw/server';
import { setTestReducedMotion } from '@/test/reanimated';
import { renderWithProviders } from '@/test/render';

import { AddToCartButton } from '../components/AddToCartButton';
import { CartScreen } from '../components/CartScreen';
import { ProductCardFieldsFragmentDoc } from '@pantry/shared';

const pasta = makeProduct(1, { name: 'Pasta', priceCents: 200 });
const rice = makeProduct(2, { name: 'Rice', priceCents: 150 });

function serve(lines: { productId: string; qty: number }[] = []) {
  const fake = createFakeCart({ products: [pasta, rice], lines });
  server.use(...fake.handlers);
  return fake;
}

describe('cart: removing a line', () => {
  it('removes the line when its row is swiped open', async () => {
    const fake = serve([
      { productId: 'p1', qty: 2 },
      { productId: 'p2', qty: 1 },
    ]);
    const user = userEvent.setup();
    await renderWithProviders(<CartScreen />);
    await screen.findByText('Pasta');
    const row = screen.getAllByTestId('swipe-to-remove')[0]!;

    await user.press(within(row).getByTestId('swipe-to-remove-open'));

    await waitFor(() => expect(fake.lines()).toEqual({ p2: 1 }));
    expect(screen.queryByText('Pasta')).not.toBeOnTheScreen();
    expect(screen.getByText('Rice')).toBeOnTheScreen();
  });

  it('removes the line when the revealed panel is tapped', async () => {
    const fake = serve([{ productId: 'p1', qty: 1 }]);
    const user = userEvent.setup();
    await renderWithProviders(<CartScreen />);
    await screen.findByText('Pasta');

    await user.press(screen.getByTestId('swipe-remove-Pasta', { includeHiddenElements: true }));

    await waitFor(() => expect(fake.lines()).toEqual({}));
  });

  it('can be done without a gesture: every row has a labelled remove button', async () => {
    const fake = serve([
      { productId: 'p1', qty: 2 },
      { productId: 'p2', qty: 1 },
    ]);
    const user = userEvent.setup();
    await renderWithProviders(<CartScreen />);
    await screen.findByText('Pasta');

    // A screen reader reads the label with the product, and the button is a button.
    const remove = screen.getByRole('button', { name: 'Remove Pasta from the cart' });
    await user.press(remove);

    await waitFor(() => expect(fake.lines()).toEqual({ p2: 1 }));
  });

  it('hides the swipe panel from a screen reader, which has the button instead', async () => {
    serve([{ productId: 'p1', qty: 1 }]);
    await renderWithProviders(<CartScreen />);
    await screen.findByText('Pasta');

    // (The panel's own text is "Remove"; the only button a screen reader finds with that name is
    // the row's, whose label also says what it removes.)
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Remove Pasta from the cart' })).toBeOnTheScreen();
  });
});

describe('add to cart: the animation', () => {
  async function renderButton() {
    serve();
    const { client } = await renderWithProviders(<AddToCartButton id="p1" />);
    await act(() => client.writeFragment({ fragment: ProductCardFieldsFragmentDoc, data: pasta }));
    return userEvent.setup();
  }

  const animated = () => screen.getByTestId('add-to-cart-pulse');

  it('plays a short animation after the button is pressed', async () => {
    const user = await renderButton();
    expect(animated()).not.toHaveStyle({ animationDuration: '280ms' });

    await user.press(screen.getByRole('button', { name: 'Add to cart' }));

    expect(animated()).toHaveStyle({ animationDuration: '280ms' });
  });

  it('plays no animation when the user asked for reduced motion, but still adds', async () => {
    setTestReducedMotion(true);
    const user = await renderButton();

    await user.press(screen.getByRole('button', { name: 'Add to cart' }));

    expect(await screen.findByText('1 in your cart')).toBeOnTheScreen();
    expect(animated()).not.toHaveStyle({ animationDuration: '280ms' });
  });
});
