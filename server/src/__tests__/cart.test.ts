import { createTestClient } from './helpers';

interface Cart {
  id: string;
  itemCount: number;
  totalCents: number;
  lines: {
    id: string;
    qty: number;
    lineTotalCents: number;
    product: { id: string; priceCents: number };
  }[];
}

const CART_FIELDS = `id itemCount totalCents lines { id qty lineTotalCents product { id priceCents } }`;
const CART = `query { cart { ${CART_FIELDS} } }`;
const ADD = `mutation ($productId: ID!, $qty: Int!, $key: ID!) {
  addToCart(productId: $productId, qty: $qty, idempotencyKey: $key) { ${CART_FIELDS} }
}`;
const REMOVE = `mutation ($productId: ID!, $key: ID!) {
  removeFromCart(productId: $productId, idempotencyKey: $key) { ${CART_FIELDS} }
}`;
const SET_QTY = `mutation ($productId: ID!, $qty: Int!, $key: ID!) {
  setCartQty(productId: $productId, qty: $qty, idempotencyKey: $key) { ${CART_FIELDS} }
}`;

describe('cart', () => {
  it('starts empty', async () => {
    const { ok } = createTestClient();
    expect(await ok(CART)).toEqual({
      cart: { id: 'cart-mock-user', itemCount: 0, totalCents: 0, lines: [] },
    });
  });

  it('adds, merges lines, sets a quantity and removes', async () => {
    const { ok } = createTestClient();
    await ok(ADD, { productId: 'p1', qty: 2, key: 'k1' });
    await ok(ADD, { productId: 'p2', qty: 1, key: 'k2' });
    const { addToCart: afterAdd } = await ok<{ addToCart: Cart }>(ADD, {
      productId: 'p1',
      qty: 1,
      key: 'k3',
    });

    expect(afterAdd.lines.map((line) => [line.id, line.qty])).toEqual([
      ['p1', 3],
      ['p2', 1],
    ]);
    expect(afterAdd.itemCount).toBe(4);
    const [p1, p2] = afterAdd.lines;
    expect(p1?.lineTotalCents).toBe(3 * p1!.product.priceCents);
    expect(afterAdd.totalCents).toBe(p1!.lineTotalCents + p2!.lineTotalCents);

    const { setCartQty } = await ok<{ setCartQty: Cart }>(SET_QTY, {
      productId: 'p1',
      qty: 5,
      key: 'k4',
    });
    expect(setCartQty.lines[0]?.qty).toBe(5);

    const { removeFromCart } = await ok<{ removeFromCart: Cart }>(REMOVE, {
      productId: 'p1',
      key: 'k5',
    });
    expect(removeFromCart.lines.map((line) => line.id)).toEqual(['p2']);

    const { setCartQty: emptied } = await ok<{ setCartQty: Cart }>(SET_QTY, {
      productId: 'p2',
      qty: 0,
      key: 'k6',
    });
    expect(emptied.lines).toEqual([]);

    // The cart query sees the same state as the mutation results.
    expect((await ok<{ cart: Cart }>(CART)).cart).toEqual(emptied);
  });

  describe('idempotency', () => {
    it('applies a repeated addToCart once', async () => {
      const { ok } = createTestClient();
      const first = await ok<{ addToCart: Cart }>(ADD, {
        productId: 'p1',
        qty: 2,
        key: 'same-key',
      });
      const retry = await ok<{ addToCart: Cart }>(ADD, {
        productId: 'p1',
        qty: 2,
        key: 'same-key',
      });
      expect(first.addToCart.lines[0]?.qty).toBe(2);
      expect(retry).toEqual(first);

      // A new key is a new user action.
      const next = await ok<{ addToCart: Cart }>(ADD, {
        productId: 'p1',
        qty: 2,
        key: 'other-key',
      });
      expect(next.addToCart.lines[0]?.qty).toBe(4);
    });

    it('does not replay an old removeFromCart or setCartQty over newer changes', async () => {
      const { ok } = createTestClient();
      await ok(ADD, { productId: 'p1', qty: 1, key: 'a1' });
      await ok(REMOVE, { productId: 'p1', key: 'r1' });
      await ok(ADD, { productId: 'p1', qty: 3, key: 'a2' });
      const { removeFromCart } = await ok<{ removeFromCart: Cart }>(REMOVE, {
        productId: 'p1',
        key: 'r1',
      });
      expect(removeFromCart.lines[0]?.qty).toBe(3);

      await ok(SET_QTY, { productId: 'p1', qty: 7, key: 's1' });
      await ok(SET_QTY, { productId: 'p1', qty: 2, key: 's2' });
      const { setCartQty } = await ok<{ setCartQty: Cart }>(SET_QTY, {
        productId: 'p1',
        qty: 7,
        key: 's1',
      });
      expect(setCartQty.lines[0]?.qty).toBe(2);
    });

    it('does not use up the key when the request is rejected', async () => {
      const { gql, ok } = createTestClient();
      const rejected = await gql(ADD, { productId: 'p1', qty: 0, key: 'k1' });
      expect(rejected.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');

      const { addToCart } = await ok<{ addToCart: Cart }>(ADD, {
        productId: 'p1',
        qty: 1,
        key: 'k1',
      });
      expect(addToCart.lines[0]?.qty).toBe(1);
    });
  });

  it('rejects unknown products and bad quantities with a code', async () => {
    const { gql } = createTestClient();
    const cases: [string, Record<string, unknown>, string][] = [
      [ADD, { productId: 'nope', qty: 1, key: 'k1' }, 'NOT_FOUND'],
      [ADD, { productId: 'r1', qty: 1, key: 'k2' }, 'NOT_FOUND'],
      [SET_QTY, { productId: 'p1', qty: -1, key: 'k3' }, 'BAD_USER_INPUT'],
      [ADD, { productId: 'p1', qty: 1, key: '' }, 'BAD_USER_INPUT'],
    ];
    for (const [mutation, variables, code] of cases) {
      const result = await gql(mutation, variables);
      expect(result.errors?.[0]?.extensions?.code).toBe(code);
    }
  });

  it('treats removing a product that is not in the cart as a no-op', async () => {
    const { ok } = createTestClient();
    const { removeFromCart } = await ok<{ removeFromCart: Cart }>(REMOVE, {
      productId: 'p9',
      key: 'k1',
    });
    expect(removeFromCart.lines).toEqual([]);
  });

  it('keeps a separate cart per server instance', async () => {
    const a = createTestClient();
    const b = createTestClient();
    await a.ok(ADD, { productId: 'p1', qty: 1, key: 'k1' });
    expect((await b.ok<{ cart: Cart }>(CART)).cart.lines).toEqual([]);
  });
});
