import { act, screen, userEvent, waitFor } from '@testing-library/react-native';

import { CartDocument, ProductCardFieldsFragmentDoc } from '@pantry/shared';

import { trackedEvents } from '@/test/analytics';
import { makeProduct } from '@/test/fixtures';
import { api } from '@/test/msw/api';
import { createFakeCart, type FakeCartOptions } from '@/test/msw/cartServer';
import { server } from '@/test/msw/server';
import { setTestNetwork } from '@/test/network';
import { renderWithProviders } from '@/test/render';

import { AddToCartButton } from '../components/AddToCartButton';
import { CartScreen } from '../components/CartScreen';

const pasta = makeProduct(1, { name: 'Pasta', priceCents: 200 });
const rice = makeProduct(2, { name: 'Rice', priceCents: 150 });

function serve(options: FakeCartOptions = {}) {
  const fake = createFakeCart({ products: [pasta, rice], ...options });
  server.use(...fake.handlers);
  return fake;
}

async function renderCart() {
  await renderWithProviders(<CartScreen />);
  return userEvent.setup();
}

const press = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.press(screen.getByRole('button', { name }));

/** A promise a test settles by hand, to hold the server's answer. */
function gate() {
  let open = () => {};
  const promise = new Promise<void>((resolve) => (open = resolve));
  return { promise, open };
}

describe('CartScreen', () => {
  it('shows the server cart with its total', async () => {
    serve({
      lines: [
        { productId: 'p1', qty: 2 },
        { productId: 'p2', qty: 1 },
      ],
    });

    await renderCart();

    expect(await screen.findByText('Pasta')).toBeOnTheScreen();
    expect(screen.getByText('Rice')).toBeOnTheScreen();
    expect(screen.getByText('3 items')).toBeOnTheScreen();
    expect(screen.getByText('Total: €5.50')).toBeOnTheScreen();
  });

  it('shows the cart in Polish, with the plural forms of the item count', async () => {
    serve({
      lines: [
        { productId: 'p1', qty: 2 },
        { productId: 'p2', qty: 3 },
      ],
    });
    await renderWithProviders(<CartScreen />, { language: 'pl' });

    expect(await screen.findByText('5 produktów')).toBeOnTheScreen();
    expect(screen.getByText(/^Razem: 8,50\s€$/)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Koszyk' })).toBeOnTheScreen();
  });

  it('says so when the cart is empty', async () => {
    serve();

    await renderCart();

    expect(await screen.findByText('Your cart is empty.')).toBeOnTheScreen();
  });

  it('shows an inline error with a retry when the cart cannot be loaded', async () => {
    const fake = createFakeCart({ products: [pasta], lines: [{ productId: 'p1', qty: 1 }] });
    let failing = true;
    server.use(
      api.query(CartDocument, ({ callCount }) => {
        if (failing) return api.graphqlError(`down ${callCount}`);
        return { cart: { __typename: 'Cart', id: 'cart', itemCount: 0, totalCents: 0, lines: [] } };
      }),
      ...fake.handlers.slice(1),
    );
    const user = await renderCart();

    expect(await screen.findByText('Could not load the cart')).toBeOnTheScreen();
    failing = false;
    await press(user, 'Try again');

    expect(await screen.findByText('Your cart is empty.')).toBeOnTheScreen();
  });

  it('changes the quantity at once, and the server confirms it', async () => {
    const answer = gate();
    const fake = serve({ lines: [{ productId: 'p1', qty: 1 }], hold: () => answer.promise });
    const user = await renderCart();
    await screen.findByText('Pasta');

    await press(user, 'Add one more Pasta');

    // The server has not answered: the screen already shows the change.
    expect(screen.getByLabelText('2 in the cart')).toBeOnTheScreen();
    expect(screen.getByText('Total: €4.00')).toBeOnTheScreen();
    expect(fake.lines()).toEqual({ p1: 1 });

    await act(async () => answer.open());

    await waitFor(() => expect(fake.lines()).toEqual({ p1: 2 }));
    expect(screen.getByLabelText('2 in the cart')).toBeOnTheScreen();
    expect(screen.getByText('Total: €4.00')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText(/waiting to sync/)).not.toBeOnTheScreen());
    // Every write is `setCartQty` with an absolute quantity.
    expect(fake.requests).toEqual([
      { productId: 'p1', qty: 2, idempotencyKey: expect.any(String) },
    ]);
  });

  it('removes a line when the quantity goes to zero, and with the remove button', async () => {
    const fake = serve({
      lines: [
        { productId: 'p1', qty: 1 },
        { productId: 'p2', qty: 2 },
      ],
    });
    const user = await renderCart();
    await screen.findByText('Pasta');

    await press(user, 'Remove one Pasta');
    await press(user, 'Remove Rice from the cart');

    await waitFor(() => expect(fake.lines()).toEqual({}));
    expect(await screen.findByText('Your cart is empty.')).toBeOnTheScreen();
  });

  it('rolls the change back and shows a toast when the server refuses it', async () => {
    const fake = serve({
      lines: [{ productId: 'p1', qty: 1 }],
      failWith: () => refusal(),
    });
    const user = await renderCart();
    await screen.findByText('Pasta');

    await press(user, 'Add one more Pasta');

    expect(await screen.findByText('Could not update Pasta in your cart.')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByLabelText('1 in the cart')).toBeOnTheScreen());
    expect(screen.getByText('Total: €2.00')).toBeOnTheScreen();
    expect(fake.lines()).toEqual({ p1: 1 });
    // A refusal is not sent again.
    expect(fake.requests).toHaveLength(1);
  });

  it('keeps a change made offline, sends it when the network returns, and the server cart matches', async () => {
    const fake = serve({ lines: [{ productId: 'p1', qty: 1 }] });
    const user = await renderCart();
    await screen.findByText('Pasta');

    await act(() => setTestNetwork('offline'));
    await press(user, 'Add one more Pasta');
    await press(user, 'Add one more Pasta');

    expect(screen.getByLabelText('3 in the cart')).toBeOnTheScreen();
    expect(screen.getByText('1 change waiting to sync')).toBeOnTheScreen();
    expect(fake.requests).toHaveLength(0);

    await act(() => setTestNetwork('online'));

    await waitFor(() => expect(fake.lines()).toEqual({ p1: 3 }));
    // The two taps were merged into one operation before anything was sent.
    expect(fake.requests).toHaveLength(1);
    await waitFor(() => expect(screen.queryByText(/waiting to sync/)).not.toBeOnTheScreen());
    expect(screen.getByLabelText('3 in the cart')).toBeOnTheScreen();
  });
});

/** The answer of a server that refuses the operation for good. */
function refusal() {
  return new Response(
    JSON.stringify({
      data: null,
      errors: [{ message: 'refused', extensions: { code: 'NOT_FOUND' } }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('AddToCartButton', () => {
  it('adds the product, shows the count at once, and tracks the add', async () => {
    const fake = serve();
    // The product is in the cache, like after the product screen loaded it.
    const { client } = await renderWithProviders(<AddToCartButton id="p1" />);
    client.writeFragment({
      fragment: ProductCardFieldsFragmentDoc,
      data: pasta,
    });
    const user = userEvent.setup();

    await press(user, 'Add to cart');

    expect(await screen.findByText('1 in your cart')).toBeOnTheScreen();
    await waitFor(() => expect(fake.lines()).toEqual({ p1: 1 }));
    expect(
      trackedEvents()
        .named('add_to_cart')
        .map((event) => event.props),
    ).toEqual([{ productId: 'p1', qty: 1 }]);
  });

  it('cannot be pressed for a product that is out of stock', async () => {
    serve();
    const { client } = await renderWithProviders(<AddToCartButton id="p1" />);
    client.writeFragment({
      fragment: ProductCardFieldsFragmentDoc,
      data: makeProduct(1, { inStock: false }),
    });

    expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled();
  });
});
