// In-memory cart for the single mock user. One instance per server process.
import type { Catalog, ProductItem } from './catalog';
import { apiError } from './errors';

export interface CartLineState {
  product: ProductItem;
  qty: number;
}

export const MAX_QTY = 99;

export class CartStore {
  /** Insertion order is the display order. */
  private readonly lines = new Map<string, CartLineState>();
  /**
   * Keys of mutations that were already applied. A repeated key is a retry of the same user action
   * (for example after a lost response), so it must not be applied again.
   * A real service would store these with a TTL; the mock keeps them for the life of the process.
   */
  private readonly appliedKeys = new Set<string>();

  constructor(private readonly catalog: Catalog) {}

  getLines(): CartLineState[] {
    return [...this.lines.values()];
  }

  add(productId: string, qty: number, idempotencyKey: string): void {
    if (!Number.isInteger(qty) || qty < 1) {
      throw apiError('BAD_USER_INPUT', '`qty` must be at least 1');
    }
    const product = this.requireProduct(productId);
    this.once(idempotencyKey, () => {
      const current = this.lines.get(productId)?.qty ?? 0;
      this.lines.set(productId, { product, qty: Math.min(current + qty, MAX_QTY) });
    });
  }

  remove(productId: string, idempotencyKey: string): void {
    this.once(idempotencyKey, () => {
      this.lines.delete(productId);
    });
  }

  setQty(productId: string, qty: number, idempotencyKey: string): void {
    if (!Number.isInteger(qty) || qty < 0) {
      throw apiError('BAD_USER_INPUT', '`qty` must be 0 or more');
    }
    const product = this.requireProduct(productId);
    this.once(idempotencyKey, () => {
      if (qty === 0) this.lines.delete(productId);
      else this.lines.set(productId, { product, qty: Math.min(qty, MAX_QTY) });
    });
  }

  private requireProduct(productId: string): ProductItem {
    const product = this.catalog.productsById.get(productId);
    if (!product) throw apiError('NOT_FOUND', `Product "${productId}" does not exist`);
    return product;
  }

  /** Validation runs before this, so a rejected request does not use up its key. */
  private once(idempotencyKey: string, apply: () => void): void {
    if (idempotencyKey.length === 0) {
      throw apiError('BAD_USER_INPUT', '`idempotencyKey` must not be empty');
    }
    if (this.appliedKeys.has(idempotencyKey)) return;
    apply();
    this.appliedKeys.add(idempotencyKey);
  }
}
