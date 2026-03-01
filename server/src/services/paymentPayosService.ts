import { getPayos } from '../utils/payos.js';

export const PACKAGE_DEMO: Record<string, { amount: number; xuReceived: number }> = {
  'Gói 100': { amount: 10000, xuReceived: 100 },
  'Gói 500': { amount: 50000, xuReceived: 500 },
  'Gói 1000': { amount: 100000, xuReceived: 1000 },
  'Gói 5000': { amount: 500000, xuReceived: 5000 },
  'Gói 10000': { amount: 1000000, xuReceived: 10000 },
};

export interface CreatePaymentLinkParams {
  uid: string;
  packageName: string;
}

export interface CreatePaymentLinkResult {
  orderCode: number;
  checkoutUrl: string;
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  amount: number;
  description: string;
  qrCode?: string;
  packageName: string;
  xuReceived: number;
  uid: string;
}

export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<CreatePaymentLinkResult | null> {
  const pkg = PACKAGE_DEMO[params.packageName];
  if (!pkg) return null;

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const returnUrl = `${baseUrl}/test-payos?result=success`;
  const cancelUrl = `${baseUrl}/test-payos?result=cancel`;
  const orderCode = Math.floor(Date.now() / 1000) % 1000000;

  const payos = getPayos();
  const res = await payos.paymentRequests.create({
    orderCode,
    amount: pkg.amount,
    description: `Nạp ${params.packageName} - ${pkg.xuReceived}xu`,
    cancelUrl,
    returnUrl,
    items: [{ name: params.packageName, quantity: 1, price: pkg.amount }],
  });

  return {
    orderCode: res.orderCode,
    checkoutUrl: res.checkoutUrl,
    bin: res.bin,
    accountNumber: res.accountNumber,
    accountName: res.accountName,
    amount: res.amount,
    description: res.description,
    qrCode: res.qrCode,
    packageName: params.packageName,
    xuReceived: pkg.xuReceived,
    uid: params.uid,
  };
}

export interface CreatePaymentLinkGameParams {
  amount: number;
  coins: number;
  userId: string;
}

export interface CreatePaymentLinkGameResult {
  checkoutUrl: string;
  orderCode: number;
  coins: number;
}

export async function createPaymentLinkGame(
  params: CreatePaymentLinkGameParams
): Promise<CreatePaymentLinkGameResult> {
  const baseUrl = process.env.GAME_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const orderCode = Math.floor(Date.now() / 1000) % 1000000;
  const returnUrl = `${baseUrl}/payment-return.html?orderCode=${orderCode}`;
  const cancelUrl = `${baseUrl}/payment-return.html?orderCode=${orderCode}&cancel=1`;

  const payos = getPayos();
  const res = await payos.paymentRequests.create({
    orderCode,
    amount: params.amount,
    description: `Nạp ${params.coins} xu`,
    cancelUrl,
    returnUrl,
    items: [{ name: `${params.coins} xu`, quantity: 1, price: params.amount }],
  });

  return {
    checkoutUrl: res.checkoutUrl,
    orderCode: res.orderCode,
    coins: params.coins,
  };
}

export async function getOrderByOrderCode(orderCode: number) {
  const payos = getPayos();
  const order = await payos.paymentRequests.get(orderCode);
  return order;
}
