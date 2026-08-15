export class PaymentsError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = 'PaymentsError';
    this.code = code;
    this.status = status;
  }
}

export class GatewayNotConfiguredError extends PaymentsError {
  constructor(gateway?: string) {
    super(
      gateway
        ? `Payment gateway "${gateway}" is not configured. Add credentials in Settings → Payments.`
        : 'No payment gateway is configured. Set PAYMENTS_GATEWAY or configure Settings → Payments.',
      'GATEWAY_NOT_CONFIGURED',
      400,
    );
    this.name = 'GatewayNotConfiguredError';
  }
}

export class GatewayNotReadyError extends PaymentsError {
  constructor(gateway: string) {
    super(
      `Payment gateway "${gateway}" is registered but not fully implemented yet. Contribute an adapter or use Stripe, Razorpay, or Custom.`,
      'GATEWAY_NOT_READY',
      501,
    );
    this.name = 'GatewayNotReadyError';
  }
}

export class GatewayNotFoundError extends PaymentsError {
  constructor(gateway: string) {
    super(
      `Unknown payment gateway "${gateway}". Register it with registerPaymentGateway() or pick a built-in provider.`,
      'GATEWAY_NOT_FOUND',
      404,
    );
    this.name = 'GatewayNotFoundError';
  }
}

export class CapabilityNotSupportedError extends PaymentsError {
  constructor(gateway: string, capability: string) {
    super(
      `Payment gateway "${gateway}" does not support ${capability}.`,
      'CAPABILITY_NOT_SUPPORTED',
      400,
    );
    this.name = 'CapabilityNotSupportedError';
  }
}

export class PaymentNotFoundError extends PaymentsError {
  constructor(id: string) {
    super(`Payment "${id}" was not found.`, 'PAYMENT_NOT_FOUND', 404);
    this.name = 'PaymentNotFoundError';
  }
}

export class WebhookVerificationError extends PaymentsError {
  constructor(message = 'Webhook signature verification failed') {
    super(message, 'WEBHOOK_VERIFICATION_FAILED', 400);
    this.name = 'WebhookVerificationError';
  }
}
