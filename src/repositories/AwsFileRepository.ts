/**
 * AWS File Repository
 * Handles persistence operations for AWS file metadata
 */

import AwsFile from "../models/aws-file.model";
import { AwsFileEntity, IAwsFileProps } from "../domain/aws-file/AwsFileEntity";

export class AwsFileRepository {
  /**
   * Find or create AWS file metadata by model name
   */
  async findOrCreateByModelName(modelName: string): Promise<AwsFileEntity | null> {
    const file = await AwsFile.findOne({
      where: { modelName },
    });
    return file ? this.toDomain(file) : null;
  }

  /**
   * Get all AWS files
   */
  async findAll(): Promise<AwsFileEntity[]> {
    const files = await AwsFile.findAll({
      attributes: [
        "modelName",
        "fileName",
        "s3Key",
        "s3Url",
        "recordCount",
        "metadata",
        "createdAt",
        "updatedAt",
      ],
    });
    return files.map((file: any) => this.toDomain(file));
  }

  /**
   * Save AWS file metadata (create or update)
   */
  async saveOrUpdate(entity: AwsFileEntity): Promise<AwsFileEntity> {
    const props = entity.toObject();
    const existing = await AwsFile.findOne({
      where: { modelName: props.modelName },
    });

    let file;
    if (existing) {
      await existing.update({
        fileName: props.fileName,
        s3Key: props.s3Key,
        s3Url: props.s3Url,
        recordCount: props.recordCount,
        metadata: props.metadata,
      });
      file = existing;
    } else {
      file = await AwsFile.create({
        modelName: props.modelName,
        fileName: props.fileName,
        s3Key: props.s3Key,
        s3Url: props.s3Url,
        recordCount: props.recordCount,
        metadata: props.metadata,
      });
    }

    return this.toDomain(file);
  }

  /**
   * Convert model to domain entity
   */
  private toDomain(model: any): AwsFileEntity {
    return AwsFileEntity.create({
      modelName: model.modelName,
      fileName: model.fileName,
      s3Key: model.s3Key,
      s3Url: model.s3Url,
      recordCount: model.recordCount,
      metadata: model.metadata,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }
}
