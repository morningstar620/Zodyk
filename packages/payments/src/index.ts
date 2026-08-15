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
  createSubscription,
  cancelSubscription,
} from './services';
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
