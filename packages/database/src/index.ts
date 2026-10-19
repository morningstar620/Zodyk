import mongoose from 'mongoose';
import { getAccountModel } from './models/account';
import { getApiTokenModel } from './models/api-token';
import {
  getMfaChallengeModel,
  getPasswordResetTokenModel,
  getSessionModel,
  getVerificationTokenModel,
} from './models/auth';
import { getAuditLogModel } from './models/audit-log';
import { getContentRevisionModel } from './models/content-revision';
import { getMetaObjectDefinitionModel } from './models/meta-object-definition';
import { getMediaAssetModel } from './models/media-asset';
import { getMetaObjectEntryModel } from './models/meta-object-entry';
import { getMenuModel } from './models/menu';
import { getPageModel } from './models/page';
import { getPaymentModel } from './models/payment';
import { getPaymentEventModel } from './models/payment-event';
import { getPriceModel } from './models/price';
import { getProductModel } from './models/product';
import { getPlatformSettingsModel } from './models/platform-settings';
import { getRedirectModel } from './models/redirect';
import { getRoleModel } from './models/role';
import { getSubscriptionIntentModel } from './models/subscription-intent';
import { getSystemEntityDefinitionModel } from './models/system-entity-definition';
import { getSystemEntityRecordModel } from './models/system-entity-record';
import { getTemplateCustomizationModel } from './models/template-customization';
import { getThemeModel } from './models/theme';
import { getThemeFileModel } from './models/theme-file';
import { getUserModel } from './models/user';

let isConnected = false;

export async function connectDatabase(uri: string): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  await mongoose.connect(uri);
  isConnected = true;
  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  await mongoose.disconnect();
  isConnected = false;
}

export function getModels() {
  return {
    User: getUserModel(mongoose),
    Role: getRoleModel(mongoose),
    ApiToken: getApiTokenModel(mongoose),
    AuditLog: getAuditLogModel(mongoose),
    ContentRevision: getContentRevisionModel(mongoose),
    Account: getAccountModel(mongoose),
    Session: getSessionModel(mongoose),
    VerificationToken: getVerificationTokenModel(mongoose),
    PasswordResetToken: getPasswordResetTokenModel(mongoose),
    MfaChallenge: getMfaChallengeModel(mongoose),
    MetaObjectDefinition: getMetaObjectDefinitionModel(mongoose),
    MetaObjectEntry: getMetaObjectEntryModel(mongoose),
    SystemEntityDefinition: getSystemEntityDefinitionModel(mongoose),
    SystemEntityRecord: getSystemEntityRecordModel(mongoose),
    MediaAsset: getMediaAssetModel(mongoose),
    PlatformSettings: getPlatformSettingsModel(mongoose),
    Redirect: getRedirectModel(mongoose),
    Page: getPageModel(mongoose),
    Menu: getMenuModel(mongoose),
    Theme: getThemeModel(mongoose),
    ThemeFile: getThemeFileModel(mongoose),
    TemplateCustomization: getTemplateCustomizationModel(mongoose),
    Payment: getPaymentModel(mongoose),
    PaymentEvent: getPaymentEventModel(mongoose),
    SubscriptionIntent: getSubscriptionIntentModel(mongoose),
    Product: getProductModel(mongoose),
    Price: getPriceModel(mongoose),
  };
}

export async function ensureIndexes(): Promise<void> {
  const models = getModels();
  await Promise.all(Object.values(models).map((model) => model.createIndexes()));
}

export { mongoose };
export * from './repositories';
export * from './revisions';
export * from './scheduling';
export * from './models/user';
export * from './models/role';
export * from './models/api-token';
export * from './models/audit-log';
export * from './models/content-revision';
export * from './models/account';
export * from './models/auth';
export * from './models/meta-object-definition';
export * from './models/meta-object-entry';
export * from './models/system-entity-definition';
export * from './models/system-entity-record';
export * from './models/media-asset';
export * from './models/platform-settings';
export * from './models/redirect';
export * from './models/page';
export * from './models/menu';
export * from './models/theme';
export * from './models/theme-file';
export * from './models/template-customization';
export * from './models/payment';
export * from './models/payment-event';
export * from './models/subscription-intent';
export * from './models/product';
export * from './models/price';
