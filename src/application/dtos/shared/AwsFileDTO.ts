/**
 * DTOs for AWS File/Snapshot Management
 * Provides type safety and centralized response/request serialization
 */

export interface AwsFileData {
  modelName: string;
  fileName: string;
  s3Key: string;
  s3Url: string;
  recordCount: number;
  metadata?: Record<string, any>;
}

/**
 * Request DTO for saving/updating AWS file metadata
 */
export class AwsFileSaveRequestDTO {
  modelName: string;
  fileName: string;
  s3Key: string;
  s3Url: string;
  recordCount: number;
  metadata?: Record<string, any>;

  constructor(data: AwsFileData) {
    this.modelName = data.modelName;
    this.fileName = data.fileName;
    this.s3Key = data.s3Key;
    this.s3Url = data.s3Url;
    this.recordCount = data.recordCount;
    this.metadata = data.metadata;
  }

  /**
   * Validate DTO data (structural validation only)
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.modelName || String(this.modelName).trim().length === 0) {
      throw new Error("Model name is required");
    }
    if (!this.fileName || String(this.fileName).trim().length === 0) {
      throw new Error("File name is required");
    }
    if (!this.s3Key || String(this.s3Key).trim().length === 0) {
      throw new Error("S3 key is required");
    }
    if (!this.s3Url || String(this.s3Url).trim().length === 0) {
      throw new Error("S3 URL is required");
    }
    if (typeof this.recordCount !== "number" || this.recordCount < 0) {
      throw new Error("Record count must be a non-negative number");
    }
  }

  /**
   * Convert DTO to entity props
   */
  toEntityProps(): AwsFileData {
    return {
      modelName: this.modelName,
      fileName: this.fileName,
      s3Key: this.s3Key,
      s3Url: this.s3Url,
      recordCount: this.recordCount,
      metadata: this.metadata,
    };
  }
}

/**
 * Response DTO for AWS file metadata
 */
export class AwsFileResponseDTO {
  modelName: string;
  fileName: string;
  s3Key: string;
  s3Url: string;
  recordCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;

  constructor(data: {
    modelName: string;
    fileName: string;
    s3Key: string;
    s3Url: string;
    recordCount: number;
    createdAt?: Date;
    updatedAt?: Date;
    metadata?: Record<string, any>;
  }) {
    this.modelName = data.modelName;
    this.fileName = data.fileName;
    this.s3Key = data.s3Key;
    this.s3Url = data.s3Url;
    this.recordCount = data.recordCount;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.metadata = data.metadata;
  }

  /**
   * Factory method to create DTO from model data
   */
  static fromModel(data: any): AwsFileResponseDTO {
    return new AwsFileResponseDTO({
      modelName: data.modelName,
      fileName: data.fileName,
      s3Key: data.s3Key,
      s3Url: data.s3Url,
      recordCount: data.recordCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      metadata: data.metadata,
    });
  }

  /**
   * Convert to plain object for JSON serialization
   */
  toJSON(): Record<string, any> {
    return {
      modelName: this.modelName,
      fileName: this.fileName,
      s3Key: this.s3Key,
      s3Url: this.s3Url,
      recordCount: this.recordCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }
}
