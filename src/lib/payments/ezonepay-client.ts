import { assertEzonePayModeAllowed } from './ezonepay-mode';

type JsonRecord = Record<string, unknown>;

export interface CreatePaymentLinkInput {
  title: string;
  orderReference: string;
  internalReference: string;
  amount: number;
  redirectUrl: string;
  customer?: { firstName: string; lastName: string; phoneNumber: string };
}

export interface EzonePayTransaction {
  id: string;
  orderReference: string;
  amount: number;
  status: number;
  statusName?: string;
  paidUtc?: string;
}

function requiredConfig() {
  assertEzonePayModeAllowed();
  const apiKey = process.env.EZONEPAY_API_KEY;
  const baseUrl = process.env.EZONEPAY_API_BASE_URL;
  if (!apiKey) throw new Error('EZONEPAY_API_KEY_MISSING');
  if (!baseUrl) throw new Error('EZONEPAY_API_BASE_URL_MISSING');
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'https:') throw new Error('EZONEPAY_API_BASE_URL_INVALID');
  return { apiKey, baseUrl: parsed.origin };
}

function unwrap(payload: unknown): JsonRecord {
  if (!payload || typeof payload !== 'object') throw new Error('EZONEPAY_INVALID_RESPONSE');
  const root = payload as JsonRecord;
  const candidate = root.data ?? root.result ?? root;
  if (!candidate || typeof candidate !== 'object') throw new Error('EZONEPAY_INVALID_RESPONSE');
  return candidate as JsonRecord;
}

export class EzonePayClient {
  private static async request(path: string, init?: RequestInit): Promise<JsonRecord> {
    const { apiKey, baseUrl } = requiredConfig();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey, ...(init?.headers || {}) },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`EZONEPAY_HTTP_${response.status}`);
    return unwrap(payload);
  }

  static async createPaymentLink(input: CreatePaymentLinkInput) {
    const payload: JsonRecord = {
      Title: input.title, OrderReference: input.orderReference, IsUniqueOrderReference: true,
      InternalReference: input.internalReference, Amount: input.amount, Currency: 1,
      MaxUsageCount: 1, RedirectUrl: input.redirectUrl,
    };
    if (input.customer) payload.Customer = { FirstName: input.customer.firstName, LastName: input.customer.lastName, PhoneNumber: input.customer.phoneNumber };
    const data = await this.request('/payment-link/new', { method: 'POST', body: JSON.stringify(payload) });
    const link = data.Link ?? data.link;
    const id = data.Id ?? data.id;
    if (typeof link !== 'string' || !link.startsWith('https://')) throw new Error('EZONEPAY_PAYMENT_LINK_MISSING');
    return { id: String(id ?? ''), link };
  }

  static async getOnlineTransaction(transactionId: string): Promise<EzonePayTransaction> {
    if (!/^\d+$/.test(transactionId)) throw new Error('EZONEPAY_TRANSACTION_ID_INVALID');
    const data = await this.request(`/payments/transactions/${transactionId}/online`);
    const amount = Number(data.Amount ?? data.amount);
    const status = Number(data.Status ?? data.status);
    if (!Number.isFinite(amount) || !Number.isInteger(status)) throw new Error('EZONEPAY_TRANSACTION_INVALID');
    const orderReference = String(data.OrderReference ?? data.orderReference ?? '');
    if (!orderReference) throw new Error('EZONEPAY_TRANSACTION_ORDER_REFERENCE_MISSING');
    return { id: String(data.Id ?? data.id ?? transactionId), orderReference, amount, status,
      statusName: String(data.StatusName ?? data.statusName ?? ''), paidUtc: String(data.PaidUtc ?? data.paidUtc ?? '') };
  }
}
