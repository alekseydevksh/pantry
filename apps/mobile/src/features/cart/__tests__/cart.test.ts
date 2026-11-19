import {
  applyOp,
  cartTotals,
  isValidIntent,
  MAX_QTY,
  projectCart,
  qtyOf,
  targetQty,
  type CartIntent,
  type CartLine,
} from '../model/cart';

const lines = (...entries: [string, number][]): CartLine[] =>
  entries.map(([productId, qty]) => ({ productId, qty }));

describe('applyOp (the cart reducer)', () => {
  it.each<[string, CartLine[], { productId: string; qty: number }, CartLine[]]>([
    [
      'adds a new line at the end',
      lines(['p1', 1]),
      { productId: 'p2', qty: 3 },
      lines(['p1', 1], ['p2', 3]),
    ],
    [
      'changes a line in place',
      lines(['p1', 1], ['p2', 1]),
      { productId: 'p1', qty: 5 },
      lines(['p1', 5], ['p2', 1]),
    ],
    [
      'removes a line at 0',
      lines(['p1', 1], ['p2', 1]),
      { productId: 'p1', qty: 0 },
      lines(['p2', 1]),
    ],
    [
      'ignores removing a missing line',
      lines(['p1', 1]),
      { productId: 'p9', qty: 0 },
      lines(['p1', 1]),
    ],
    [
      'caps the quantity like the server',
      [],
      { productId: 'p1', qty: 150 },
      lines(['p1', MAX_QTY]),
    ],
  ])('%s', (_case, before, op, after) => {
    expect(applyOp(before, op)).toStrictEqual(after);
  });

  it('does not change the lines it is given', () => {
    const before = lines(['p1', 1]);
    applyOp(before, { productId: 'p1', qty: 2 });

    expect(before).toStrictEqual(lines(['p1', 1]));
  });

  it('gives the same cart when an operation is applied twice (idempotent)', () => {
    const op = { productId: 'p1', qty: 2 };

    expect(applyOp(applyOp(lines(['p1', 1]), op), op)).toStrictEqual(applyOp(lines(['p1', 1]), op));
  });
});

describe('projectCart', () => {
  it('applies the queued operations on top of the server cart, in order', () => {
    const server = lines(['p1', 1], ['p2', 2]);
    const ops = [
      { productId: 'p2', qty: 0 },
      { productId: 'p3', qty: 1 },
      { productId: 'p1', qty: 4 },
    ];

    expect(projectCart(server, ops)).toStrictEqual(lines(['p1', 4], ['p3', 1]));
  });

  it('is the same over a server cart that already applied a queued operation', () => {
    const ops = [{ productId: 'p1', qty: 2 }];

    expect(projectCart(lines(['p1', 2]), ops)).toStrictEqual(projectCart(lines(['p1', 1]), ops));
  });
});

describe('intents', () => {
  it.each<[CartIntent, boolean]>([
    [{ kind: 'add', productId: 'p1', qty: 1 }, true],
    [{ kind: 'add', productId: 'p1', qty: 0 }, false],
    [{ kind: 'add', productId: 'p1', qty: 1.5 }, false],
    [{ kind: 'add', productId: '', qty: 1 }, false],
    [{ kind: 'set', productId: 'p1', qty: 0 }, true],
    [{ kind: 'set', productId: 'p1', qty: -1 }, false],
    [{ kind: 'set', productId: 'p1', qty: Number.NaN }, false],
    [{ kind: 'remove', productId: 'p1' }, true],
  ])('isValidIntent(%j) is %s', (intent, valid) => {
    expect(isValidIntent(intent)).toBe(valid);
  });

  it.each<[number, CartIntent, number]>([
    [2, { kind: 'add', productId: 'p1', qty: 3 }, 5],
    [98, { kind: 'add', productId: 'p1', qty: 5 }, MAX_QTY],
    [2, { kind: 'set', productId: 'p1', qty: 7 }, 7],
    [2, { kind: 'set', productId: 'p1', qty: 500 }, MAX_QTY],
    [2, { kind: 'remove', productId: 'p1' }, 0],
  ])('targetQty from %d with %j is %d', (current, intent, expected) => {
    expect(targetQty(current, intent)).toBe(expected);
  });

  it('qtyOf is 0 for a product that is not in the cart', () => {
    expect(qtyOf(lines(['p1', 3]), 'p1')).toBe(3);
    expect(qtyOf(lines(['p1', 3]), 'p2')).toBe(0);
  });
});

describe('cartTotals', () => {
  const prices: Record<string, number> = { a: 150, b: 99 };
  const priceOf = (productId: string) => prices[productId];

  it('counts the items and adds up quantity × price', () => {
    expect(
      cartTotals(
        [
          { productId: 'a', qty: 2 },
          { productId: 'b', qty: 3 },
        ],
        priceOf,
      ),
    ).toEqual({ itemCount: 5, totalCents: 2 * 150 + 3 * 99 });
  });

  it('counts a product with no known price but adds nothing for it', () => {
    expect(cartTotals([{ productId: 'unknown', qty: 4 }], priceOf)).toEqual({
      itemCount: 4,
      totalCents: 0,
    });
  });

  it('is zero for an empty cart', () => {
    expect(cartTotals([], priceOf)).toEqual({ itemCount: 0, totalCents: 0 });
  });
});
