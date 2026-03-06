/**
 * AWS File Domain Entity
 * Represents a snapshot file metadata stored in AWS S3
 */

export interface IAwsFileProps {
  modelName: string;
  fileName: string;
  s3Key: string;
  s3Url: string;
  recordCount: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AwsFileEntity {
  private modelName: string;
  private fileName: string;
  private s3Key: string;
  private s3Url: string;
  private recordCount: number;
  private metadata?: Record<string, any>;
  private createdAt?: Date;
  private updatedAt?: Date;

  constructor(props: IAwsFileProps) {
    this.modelName = props.modelName;
    this.fileName = props.fileName;
    this.s3Key = props.s3Key;
    this.s3Url = props.s3Url;
    this.recordCount = props.recordCount;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create new AWS file entity
   */
  public static create(props: IAwsFileProps): AwsFileEntity {
    return new AwsFileEntity(props);
  }

  // Getters
  public getModelName(): string {
    return this.modelName;
  }

  public getFileName(): string {
    return this.fileName;
  }

  public getS3Key(): string {
    return this.s3Key;
  }

  public getS3Url(): string {
    return this.s3Url;
  }

  public getRecordCount(): number {
    return this.recordCount;
  }

  public getMetadata(): Record<string, any> | undefined {
    return this.metadata;
  }

  public getCreatedAt(): Date | undefined {
    return this.createdAt;
  }

  public getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  /**
   * Update file metadata
   */
  public updateMetadata(
    fileName: string,
    s3Key: string,
    s3Url: string,
    recordCount: number,
    metadata?: Record<string, any>
  ): void {
    this.fileName = fileName;
    this.s3Key = s3Key;
    this.s3Url = s3Url;
    this.recordCount = recordCount;
    this.metadata = metadata;
    this.updatedAt = new Date();
  }

  /**
   * Convert to plain object
   */
  public toObject(): IAwsFileProps {
    return {
      modelName: this.modelName,
      fileName: this.fileName,
      s3Key: this.s3Key,
      s3Url: this.s3Url,
      recordCount: this.recordCount,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
