import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { FeedDocument, ProductDocument } from '@pantry/shared';

import { makeCatalog, makeProductDetails } from '@/test/fixtures';
import { api } from '@/test/msw/api';
import { feedOf, productsOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { createTestClient, renderWithProviders } from '@/test/render';

import { ProductScreen } from '../components/ProductScreen';

describe('ProductScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows placeholders while it loads, then the whole product', async () => {
    const product = makeProductDetails(2, {
      name: 'Organic Tomatoes',
      unit: '500 g',
      priceCents: 339,
      diets: ['VEGETARIAN', 'GLUTEN_FREE'],
      allergens: ['SOY'],
    });
    // The server answers when the test says so, so the test can look at the loading state.
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      api.query(ProductDocument, async () => {
        await gate;
        return { product };
      }),
    );

    await renderWithProviders(<ProductScreen id="p2" />);

    expect(screen.getByLabelText('Loading the product')).toBeOnTheScreen();
    expect(screen.queryByText('Organic Tomatoes')).not.toBeOnTheScreen();

    release();

    expect(await screen.findByRole('header', { name: 'Organic Tomatoes' })).toBeOnTheScreen();
    expect(screen.getByText('500 g')).toBeOnTheScreen();
    expect(screen.getByText('€3.39')).toBeOnTheScreen();
    expect(screen.getByText('In stock')).toBeOnTheScreen();
    expect(screen.getByText('Description of product 2.')).toBeOnTheScreen();
    expect(screen.getByText('Suitable for: Vegetarian, Gluten-free')).toBeOnTheScreen();
    expect(screen.getByText('Contains: Soy')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading the product')).not.toBeOnTheScreen();
  });

  it('has an add-to-cart button that cannot be pressed until the cart exists (Phase 3)', async () => {
    server.use(productsOf([makeProductDetails(2)]));
    await renderWithProviders(<ProductScreen id="p2" />);

    const button = await screen.findByRole('button', { name: 'Add to cart' });

    expect(button).toBeDisabled();
  });

  it('says that a product is out of stock, in the header and on the button', async () => {
    server.use(productsOf([makeProductDetails(2, { inStock: false })]));

    await renderWithProviders(<ProductScreen id="p2" />);

    // (Twice: a label under the price, and the text of the button.)
    expect(await screen.findAllByText('Out of stock')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeOnTheScreen();
  });

  it('lists allergens even when there are none, and leaves out diets when there are none', async () => {
    server.use(productsOf([makeProductDetails(2, { allergens: [], diets: [] })]));

    await renderWithProviders(<ProductScreen id="p2" />);

    expect(await screen.findByText('No listed allergens')).toBeOnTheScreen();
    expect(screen.queryByText(/Suitable for/)).not.toBeOnTheScreen();
  });

  it('shows the product in Polish', async () => {
    server.use(
      productsOf([makeProductDetails(2, { diets: ['VEGAN'], allergens: ['NUTS', 'DAIRY'] })]),
    );

    await renderWithProviders(<ProductScreen id="p2" />, { language: 'pl' });

    expect(await screen.findByText('Odpowiednie dla: Wegańskie')).toBeOnTheScreen();
    expect(screen.getByText('Zawiera: Orzechy, Nabiał')).toBeOnTheScreen();
    expect(screen.getByText('Dostępny')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Dodaj do koszyka' })).toBeOnTheScreen();
  });
});

describe('ProductScreen: opened from the feed', () => {
  it('shows the fields the feed already has at once, and loads the rest', async () => {
    // The feed was loaded, so `Product:p2` is in the cache with the fields of its card.
    const client = createTestClient();
    server.use(feedOf(makeCatalog(6)));
    await client.query({ query: FeedDocument, variables: { first: 20 } });

    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      api.query(ProductDocument, async () => {
        await gate;
        return { product: makeProductDetails(2) };
      }),
    );

    await renderWithProviders(<ProductScreen id="p2" />, { client });

    // At once: name, pack size and price from the cache. The rest is still loading.
    expect(screen.getByRole('header', { name: 'Product 2' })).toBeOnTheScreen();
    expect(screen.getByText('€1.02')).toBeOnTheScreen();
    expect(screen.queryByText('Description of product 2.')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Loading the product')).toBeOnTheScreen();

    release();

    expect(await screen.findByText('Description of product 2.')).toBeOnTheScreen();
  });
});

describe('ProductScreen: when it cannot show the product', () => {
  afterEach(() => jest.restoreAllMocks());

  it('says so when there is no such product, and offers a way back to Home', async () => {
    server.use(productsOf([makeProductDetails(2)]));
    const replace = jest.spyOn(router, 'replace').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderWithProviders(<ProductScreen id="p999" />);

    expect(await screen.findByRole('header', { name: 'Product not found' })).toBeOnTheScreen();
    expect(screen.getByText('This product is not available any more.')).toBeOnTheScreen();
    // Nothing to retry: the server answered.
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Back to Home' }));

    expect(replace).toHaveBeenCalledWith('/');
  });

  it('shows an error with a retry that works', async () => {
    server.use(
      api.query(ProductDocument, ({ callCount }) =>
        // The retry link makes three attempts, so the first three calls are one failed request.
        callCount <= 3 ? api.networkError() : { product: makeProductDetails(2) },
      ),
    );
    const user = userEvent.setup();
    await renderWithProviders(<ProductScreen id="p2" />);

    expect(await screen.findByText('Could not load the product')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Description of product 2.')).toBeOnTheScreen();
    expect(screen.queryByText('Could not load the product')).not.toBeOnTheScreen();
  });
});
