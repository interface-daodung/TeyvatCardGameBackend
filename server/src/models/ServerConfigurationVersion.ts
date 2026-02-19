import mongoose, { Schema } from 'mongoose';

export interface IVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface IConfiguration {
  CardsData?: Record<string, unknown>;
  MapsData?: Record<string, unknown>;
  CharacterData?: Record<string, unknown>;
  themeData?: Record<string, unknown>;
  itemData?: Record<string, unknown>;
  localizations?: {
    en?: Record<string, unknown>;
    vi?: Record<string, unknown>;
    ja?: Record<string, unknown>;
  };
}

export interface IServerConfigurationVersion extends mongoose.Document {
  version: IVersion;
  configuration: IConfiguration;
  createdAt: Date;
  updatedAt: Date;
}

const versionSchema = new Schema<IVersion>(
  {
    major: { type: Number, required: true, default: 1 },
    minor: { type: Number, required: true, default: 0 },
    patch: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const configurationSchema = new Schema<IConfiguration>(
  {
    CardsData: { type: Schema.Types.Mixed, default: null },
    MapsData: { type: Schema.Types.Mixed, default: null },
    CharacterData: { type: Schema.Types.Mixed, default: null },
    themeData: { type: Schema.Types.Mixed, default: null },
    itemData: { type: Schema.Types.Mixed, default: null },
    localizations: {
      en: { type: Schema.Types.Mixed, default: null },
      vi: { type: Schema.Types.Mixed, default: null },
      ja: { type: Schema.Types.Mixed, default: null },
    },
  },
  { _id: false }
);

const serverConfigurationVersionSchema = new Schema<IServerConfigurationVersion>(
  {
    version: {
      type: versionSchema,
      required: true,
      default: () => ({ major: 1, minor: 0, patch: 0 }),
    },
    configuration: {
      type: configurationSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: 'server_configuration_versions',
  }
);

export const ServerConfigurationVersion = mongoose.model<IServerConfigurationVersion>(
  'ServerConfigurationVersion',
  serverConfigurationVersionSchema
);
