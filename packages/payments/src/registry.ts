import {
  GatewayNotFoundError,
  GatewayNotReadyError,
} from './errors';
import type { GatewayConfig, GatewayId, PaymentGateway, PaymentGatewayDefinition } from './types';

const definitions = new Map<string, PaymentGatewayDefinition>();

export function registerPaymentGateway(definition: PaymentGatewayDefinition): void {
  definitions.set(definition.id, definition);
}

export function listPaymentGateways(): PaymentGatewayDefinition[] {
  return Array.from(definitions.values());
}

export function getPaymentGatewayDefinition(
  id: GatewayId,
): PaymentGatewayDefinition | undefined {
  return definitions.get(id);
}

export function hasPaymentGateway(id: GatewayId): boolean {
  return definitions.has(id);
}

export function createPaymentGateway(
  id: GatewayId,
  config: GatewayConfig,
): PaymentGateway {
  const definition = definitions.get(id);
  if (!definition) {
    throw new GatewayNotFoundError(id);
  }
  if (!definition.ready) {
    throw new GatewayNotReadyError(id);
  }
  return definition.create(config);
}

/** Test helper */
export function resetPaymentGatewayRegistryForTests(): void {
  definitions.clear();
}
