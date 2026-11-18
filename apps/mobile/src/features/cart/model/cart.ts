// The cart as quantities per product, and the operations that change it (ADR 0013). Pure.
//
// Every operation is an absolute quantity (`setCartQty`), never a relative "add 1". Applying the
// same operation twice gives the same cart, so the cart on screen (the server cart with the queued
// operations on top) is right whether or not the server already applied an operation whose
// response was lost.

/** The server caps a line at this quantity (server/src/cart.ts); the projection does the same. */
export const MAX_QTY = 99;

/** One line, in display order. A cart has at most one line per product. */
export type CartLine = { productId: string; qty: number };

/** What the user asked for. Kept on the operation for messages ("could not add ..."). */
export type CartIntent =
  | { kind: 'add'; productId: string; qty: number }
  | { kind: 'remove'; productId: string }
  | { kind: 'set'; productId: string; qty: number };

export type CartIntentKind = CartIntent['kind'];

/** One change, as sent to the server: set `productId` to `qty` (0 removes the line). */
export type CartOp = {
  productId: string;
  /** The target quantity, 0–99. */
  qty: number;
  /** One per user action. The server applies a key once, so a retry is safe. */
  key: string;
  intent: CartIntentKind;
  /** When the user acted, in ms since the epoch. */
  createdAt: number;
};

const isQty = (value: number, min: number) => Number.isInteger(value) && value >= min;

/** Whether the intent is valid: `add` at least 1, `set` 0 or more, whole numbers, an id. */
export function isValidIntent(intent: CartIntent): boolean {
  if (intent.productId.length === 0) return false;
  switch (intent.kind) {
    case 'add':
      return isQty(intent.qty, 1);
    case 'set':
      return isQty(intent.qty, 0);
    case 'remove':
      return true;
  }
}

export function qtyOf(lines: readonly CartLine[], productId: string): number {
  return lines.find((line) => line.productId === productId)?.qty ?? 0;
}

/** The quantity the user wants, given what they saw (`current`). */
export function targetQty(current: number, intent: CartIntent): number {
  switch (intent.kind) {
    case 'add':
      return Math.min(current + intent.qty, MAX_QTY);
    case 'set':
      return Math.min(intent.qty, MAX_QTY);
    case 'remove':
      return 0;
  }
}

/**
 * The cart reducer: `lines` with `op` applied, by the server's rules. An existing line keeps its
 * place, a new one goes last, 0 removes the line.
 */
export function applyOp(
  lines: readonly CartLine[],
  op: Pick<CartOp, 'productId' | 'qty'>,
): CartLine[] {
  const qty = Math.min(op.qty, MAX_QTY);
  const exists = lines.some((line) => line.productId === op.productId);
  if (qty <= 0) return lines.filter((line) => line.productId !== op.productId);
  if (!exists) return [...lines, { productId: op.productId, qty }];
  return lines.map((line) => (line.productId === op.productId ? { ...line, qty } : line));
}

/**
 * The cart to show: the server cart with the queued operations applied in order (ADR 0005, rule 4).
 * Stable when the server cart is refetched after it applied an operation that is still queued.
 */
export function projectCart(
  serverLines: readonly CartLine[],
  ops: readonly Pick<CartOp, 'productId' | 'qty'>[],
): CartLine[] {
  return ops.reduce<CartLine[]>((lines, op) => applyOp(lines, op), [...serverLines]);
}
