import { DataTypes, Model, ModelStatic, FindOptions, Optional } from "sequelize";
import { sequelize } from "../db/config.js";
import { PutObjectCommandOutput } from "@aws-sdk/client-s3";

export interface ExportModelToS3Options<M extends Model> {
  model: ModelStatic<M>;
  modelName: string;
  findOptions?: FindOptions;
  directory?: string;
  fileName?: string;
  transform?: (records: M[]) => unknown;
}

export interface ExportModelToS3Result {
  response: PutObjectCommandOutput;
  url: string;
  key: string;
  fileName: string;
  recordCount: number;
}

export interface IAwsFileAttributes {
  modelName: string;
  fileName: string;
  s3Key: string;
  s3Url: string;
  recordCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export type IAwsFileCreationAttributes = Optional<
  IAwsFileAttributes,
  "recordCount" | "createdAt" | "updatedAt" | "metadata"
>;

class AwsFile
  extends Model<IAwsFileAttributes, IAwsFileCreationAttributes>
  implements IAwsFileAttributes
{
  public modelName!: string;
  public fileName!: string;
  public s3Key!: string;
  public s3Url!: string;
  public recordCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public metadata?: Record<string, any>;
}

AwsFile.init(
  {
    modelName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      primaryKey: true,
      field: "model_name",
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "file_name",
    },
    s3Key: {
      type: DataTypes.STRING(512),
      allowNull: false,
      field: "s3_key",
    },
    s3Url: {
      type: DataTypes.STRING(1024),
      allowNull: false,
      field: "s3_url",
    },
    recordCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: "record_count",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    metadata:{
      type: DataTypes.JSON,
      allowNull: true,
      field: "metadata",
    }
  },
  {
    sequelize,
    tableName: "aws_files",
    modelName: "AwsFile",
    timestamps: true,
    paranoid: false,
    underscored: true,
  }
);

export default AwsFile;
