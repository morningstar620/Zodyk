import mongoose from 'mongoose';
import { getMetaObjectDefinitionModel } from './models/meta-object-definition';
import { getMetaObjectEntryModel } from './models/meta-object-entry';
import { getSystemEntityDefinitionModel } from './models/system-entity-definition';
import { getSystemEntityRecordModel } from './models/system-entity-record';

export function getModels() {
  return {
    MetaObjectDefinition: getMetaObjectDefinitionModel(mongoose),
    MetaObjectEntry: getMetaObjectEntryModel(mongoose),
    SystemEntityDefinition: getSystemEntityDefinitionModel(mongoose),
    SystemEntityRecord: getSystemEntityRecordModel(mongoose),
  };
}
