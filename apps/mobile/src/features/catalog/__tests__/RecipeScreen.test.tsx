import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { FeedDocument, RecipeDocument } from '@pantry/shared';

import { makeCatalog, makeProduct, makeRecipeDetails } from '@/test/fixtures';
import { api } from '@/test/msw/api';
import { feedOf, recipesOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { createTestClient, renderWithProviders } from '@/test/render';

import { RecipeScreen } from '../components/RecipeScreen';

describe('RecipeScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows placeholders while it loads, then the whole recipe', async () => {
    const recipe = makeRecipeDetails(3, {
      name: 'Tomato Basil Spaghetti',
      cookTimeMin: 20,
      servings: 4,
    });
    // The server answers when the test says so, so the test can look at the loading state.
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      api.query(RecipeDocument, async () => {
        await gate;
        return { recipe };
      }),
    );

    await renderWithProviders(<RecipeScreen id="r3" />);

    expect(screen.getByLabelText('Loading the recipe')).toBeOnTheScreen();
    expect(screen.queryByText('Tomato Basil Spaghetti')).not.toBeOnTheScreen();

    release();

    expect(await screen.findByRole('header', { name: 'Tomato Basil Spaghetti' })).toBeOnTheScreen();
    expect(screen.getByText('20 min · 4 servings')).toBeOnTheScreen();
    expect(screen.getByText('Description of recipe 3.')).toBeOnTheScreen();
    expect(screen.getByText('Suitable for: Vegetarian')).toBeOnTheScreen();
    expect(screen.getByText('Contains: Gluten, Dairy')).toBeOnTheScreen();
    expect(screen.getByText('Ingredients cost €15.44')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading the recipe')).not.toBeOnTheScreen();
  });

  it('shows the steps, numbered, and the ingredients linked to products', async () => {
    server.use(
      recipesOf([
        makeRecipeDetails(3, {
          steps: ['Boil the water.', 'Add the pasta.'],
          ingredients: [
            { quantity: '200 g', product: makeProduct(5, { name: 'Spaghetti', unit: '500 g' }) },
            { quantity: '2 pcs', product: makeProduct(6, { name: 'Garlic', inStock: false }) },
          ],
        }),
      ]),
    );

    await renderWithProviders(<RecipeScreen id="r3" />);

    expect(await screen.findByText('Step 1')).toBeOnTheScreen();
    expect(screen.getByText('Boil the water.')).toBeOnTheScreen();
    expect(screen.getByText('Step 2')).toBeOnTheScreen();
    expect(screen.getByText('Add the pasta.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '200 g Spaghetti' })).toBeOnTheScreen();
    expect(screen.getByText('500 g · €1.05')).toBeOnTheScreen();
    // An ingredient that is out of stock says so.
    expect(screen.getByRole('button', { name: '2 pcs Garlic' })).toBeOnTheScreen();
    expect(screen.getByText('Out of stock')).toBeOnTheScreen();
  });

  it('opens the product screen from an ingredient', async () => {
    server.use(recipesOf([makeRecipeDetails(3)]));
    const push = jest.spyOn(router, 'push').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderWithProviders(<RecipeScreen id="r3" />);

    await user.press(await screen.findByRole('button', { name: '200 g Product 101' }));

    expect(push).toHaveBeenCalledWith({ pathname: '/product/[id]', params: { id: 'p101' } });
  });

  it('says when a recipe has no listed allergens', async () => {
    server.use(recipesOf([makeRecipeDetails(3, { allergens: [], diets: [] })]));

    await renderWithProviders(<RecipeScreen id="r3" />);

    expect(await screen.findByText('No listed allergens')).toBeOnTheScreen();
    expect(screen.queryByText(/Suitable for/)).not.toBeOnTheScreen();
  });

  it('shows the recipe in Polish', async () => {
    server.use(recipesOf([makeRecipeDetails(3, { servings: 2, diets: ['VEGAN'] })]));

    await renderWithProviders(<RecipeScreen id="r3" />, { language: 'pl' });

    expect(await screen.findByText('23 min · 2 porcje')).toBeOnTheScreen();
    expect(screen.getByText('Odpowiednie dla: Wegańskie')).toBeOnTheScreen();
    expect(screen.getByText('Zawiera: Gluten, Nabiał')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Składniki' })).toBeOnTheScreen();
  });
});

describe('RecipeScreen: opened from the feed', () => {
  it('shows the fields the feed already has at once, and loads the rest', async () => {
    // The feed was loaded, so `Recipe:r3` is in the cache with the fields of its card.
    const client = createTestClient();
    const catalog = makeCatalog(6);
    server.use(feedOf(catalog));
    await client.query({ query: FeedDocument, variables: { first: 20 } });

    // The details are slow, so the test can look at the screen in between.
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      api.query(RecipeDocument, async () => {
        await gate;
        return { recipe: makeRecipeDetails(3) };
      }),
    );

    await renderWithProviders(<RecipeScreen id="r3" />, { client });

    // At once: the name and the meta line, from the cache. The rest is still loading.
    expect(screen.getByRole('header', { name: 'Recipe 3' })).toBeOnTheScreen();
    expect(screen.getByText('23 min · 4 servings')).toBeOnTheScreen();
    expect(screen.queryByText('Description of recipe 3.')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Loading the recipe')).toBeOnTheScreen();

    release();

    expect(await screen.findByText('Description of recipe 3.')).toBeOnTheScreen();
    expect(screen.getByText('Step 1')).toBeOnTheScreen();
  });

  it('shows a recipe that was opened before without asking the server again', async () => {
    const client = createTestClient();
    const requests: string[] = [];
    server.use(
      api.query(RecipeDocument, ({ variables }) => {
        requests.push(String(variables.id));
        return { recipe: makeRecipeDetails(3) };
      }),
    );
    await client.query({ query: RecipeDocument, variables: { id: 'r3' } });

    await renderWithProviders(<RecipeScreen id="r3" />, { client });

    expect(screen.getByText('Description of recipe 3.')).toBeOnTheScreen();
    expect(requests).toEqual(['r3']);
  });
});

describe('RecipeScreen: when it cannot show the recipe', () => {
  afterEach(() => jest.restoreAllMocks());

  it('says so when there is no such recipe, and offers a way back to Home', async () => {
    server.use(recipesOf([makeRecipeDetails(3)]));
    const replace = jest.spyOn(router, 'replace').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderWithProviders(<RecipeScreen id="r999" />);

    expect(await screen.findByRole('header', { name: 'Recipe not found' })).toBeOnTheScreen();
    expect(screen.getByText('This recipe is not available any more.')).toBeOnTheScreen();
    // Nothing to retry: the server answered.
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Back to Home' }));

    expect(replace).toHaveBeenCalledWith('/');
  });

  it('shows an error with a retry that works', async () => {
    server.use(
      api.query(RecipeDocument, ({ callCount }) =>
        // The retry link makes three attempts, so the first three calls are one failed request.
        callCount <= 3 ? api.networkError() : { recipe: makeRecipeDetails(3) },
      ),
    );
    const user = userEvent.setup();
    await renderWithProviders(<RecipeScreen id="r3" />);

    expect(await screen.findByText('Could not load the recipe')).toBeOnTheScreen();
    expect(screen.queryByText('Description of recipe 3.')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Description of recipe 3.')).toBeOnTheScreen();
    expect(screen.queryByText('Could not load the recipe')).not.toBeOnTheScreen();
  });

  it('keeps the header from the feed when the details fail to load', async () => {
    const client = createTestClient();
    server.use(feedOf(makeCatalog(6)));
    await client.query({ query: FeedDocument, variables: { first: 20 } });
    server.use(api.query(RecipeDocument, () => api.networkError()));

    await renderWithProviders(<RecipeScreen id="r3" />, { client });

    expect(await screen.findByText('Could not load the recipe')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Recipe 3' })).toBeOnTheScreen();
  });
});
