import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
} from 'sequelize-typescript';
import { PutObjectCommandOutput } from '@aws-sdk/client-s3';

export interface ExportModelToS3Options<M extends Model> {
  model: any;
  modelName: string;
  findOptions?: any;
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

@Table({ tableName: 'aws_files', timestamps: true, underscored: true })
export default class AwsFile extends Model<IAwsFileAttributes> {
  @PrimaryKey
  @Column({ type: DataType.STRING(150), allowNull: false, field: 'model_name' })
  modelName: string;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'file_name' })
  fileName: string;

  @Column({ type: DataType.STRING(512), allowNull: false, field: 's3_key' })
  s3Key: string;

  @Column({ type: DataType.STRING(1024), allowNull: false, field: 's3_url' })
  s3Url: string;

  @Default(0)
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, field: 'record_count' })
  recordCount: number;

  @Column({ type: DataType.JSON, allowNull: true, field: 'metadata' })
  metadata: Record<string, any>;
}
