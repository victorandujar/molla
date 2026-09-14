// Provider boundary: the first MVP is pay-at-pickup. No card data is accepted.
export interface PaymentProvider {
  mode: 'pickup' | 'online';
  prepare(
    orderId: string,
    totalCents: number,
  ): Promise<{ status: 'DUE_AT_PICKUP' | 'PENDING'; checkoutUrl?: string }>;
}
export const paymentProvider: PaymentProvider = {
  mode: 'pickup',
  async prepare() {
    return { status: 'DUE_AT_PICKUP' };
  },
};
// A future online provider must reconcile signed, idempotent webhooks before
// marking payment received. Reservation capacity remains managed by store.ts.
