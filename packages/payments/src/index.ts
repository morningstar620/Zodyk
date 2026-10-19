import { registerBuiltinGateways } from './gateways';

registerBuiltinGateways();

export * from './types';
export * from './errors';
export * from './registry';
export * from './utils';
export {
  getPaymentsConfig,
  clearPaymentsConfigCache,
  requirePaymentsConfig,
  getActivePaymentGateway,
  getPaymentsSettingsPublic,
  savePaymentsSettings,
  encryptGatewayCredentials,
} from './config';
export {
  createPayment,
  getPayment,
  listPayments,
  refundPayment,
  handleWebhook,
  applyPaymentEvent,
  listPaymentEvents,
  createSubscription,
  listSubscriptions,
  getSubscription,
  cancelSubscription,
} from './services';
export {
  createProduct,
  updateProduct,
  listProducts,
  getProduct,
  createPrice,
  updatePrice,
  listPrices,
  getPaymentLink,
  startPaymentLinkCheckout,
} from './catalog';
export { getInvoicePdf } from './invoice';
export { getPaymentMetrics, summarizeBilling } from './metrics';
export { normalizeStripeEvent } from './gateways/stripe';
export {
  registerBuiltinGateways,
  stripeGatewayDefinition,
  razorpayGatewayDefinition,
  customGatewayDefinition,
  paypalGatewayDefinition,
  cashfreeGatewayDefinition,
  phonepeGatewayDefinition,
  payuGatewayDefinition,
} from './gateways';
