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
import { getMetaObjectDefinitionModel } from './models/meta-object-definition';
import { getMediaAssetModel } from './models/media-asset';
import { getMetaObjectEntryModel } from './models/meta-object-entry';
import { getPageModel } from './models/page';
import { getPlatformSettingsModel } from './models/platform-settings';
import { getRoleModel } from './models/role';
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
    Account: getAccountModel(mongoose),
    Session: getSessionModel(mongoose),
    VerificationToken: getVerificationTokenModel(mongoose),
    PasswordResetToken: getPasswordResetTokenModel(mongoose),
    MfaChallenge: getMfaChallengeModel(mongoose),
    MetaObjectDefinition: getMetaObjectDefinitionModel(mongoose),
    MetaObjectEntry: getMetaObjectEntryModel(mongoose),
    MediaAsset: getMediaAssetModel(mongoose),
    PlatformSettings: getPlatformSettingsModel(mongoose),
    Page: getPageModel(mongoose),
    Theme: getThemeModel(mongoose),
    ThemeFile: getThemeFileModel(mongoose),
    TemplateCustomization: getTemplateCustomizationModel(mongoose),
  };
}

export async function ensureIndexes(): Promise<void> {
  const models = getModels();
  await Promise.all(Object.values(models).map((model) => model.createIndexes()));
}

export { mongoose };
export * from './models/user';
export * from './models/role';
export * from './models/api-token';
export * from './models/audit-log';
export * from './models/account';
export * from './models/auth';
export * from './models/meta-object-definition';
export * from './models/meta-object-entry';
export * from './models/media-asset';
export * from './models/platform-settings';
export * from './models/page';
export * from './models/theme';
export * from './models/theme-file';
export * from './models/template-customization';
