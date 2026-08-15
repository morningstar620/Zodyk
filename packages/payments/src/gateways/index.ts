import { registerPaymentGateway } from '../registry';
import { cashfreeGatewayDefinition } from './stubs';
import { customGatewayDefinition } from './custom';
import { paypalGatewayDefinition, payuGatewayDefinition, phonepeGatewayDefinition } from './stubs';
import { razorpayGatewayDefinition } from './razorpay';
import { stripeGatewayDefinition } from './stripe';

let registered = false;

export function registerBuiltinGateways(): void {
  if (registered) return;
  registered = true;
  registerPaymentGateway(stripeGatewayDefinition);
  registerPaymentGateway(razorpayGatewayDefinition);
  registerPaymentGateway(paypalGatewayDefinition);
  registerPaymentGateway(cashfreeGatewayDefinition);
  registerPaymentGateway(phonepeGatewayDefinition);
  registerPaymentGateway(payuGatewayDefinition);
  registerPaymentGateway(customGatewayDefinition);
}

export {
  stripeGatewayDefinition,
  razorpayGatewayDefinition,
  customGatewayDefinition,
  paypalGatewayDefinition,
  cashfreeGatewayDefinition,
  phonepeGatewayDefinition,
  payuGatewayDefinition,
};
