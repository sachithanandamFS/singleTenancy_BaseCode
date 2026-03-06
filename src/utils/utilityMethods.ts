import {
  DeleteObjectCommandOutput,
  PutObjectCommandOutput,
  S3,
} from "@aws-sdk/client-s3";
import { Model } from "sequelize";
import { AwsFileSaveRequestDTO } from "../application/dtos/shared/AwsFileDTO.js";
import { AwsFileRepository } from "../repositories/AwsFileRepository.js";
import { AwsFileEntity } from "../domain/aws-file/AwsFileEntity.js";
import { logger } from "./logger.js";

interface UploadResult {
  response: PutObjectCommandOutput;
  url: string;
}

const {
  gc_csi_s3_bucket,
  gc_csi_s3_key,
  gc_csi_s3_SECRET,
  gc_csi_s3_REGION,
} = process.env;

class UtilityMethods {
  private getS3Client(): S3 {
    if (!gc_csi_s3_bucket || !gc_csi_s3_REGION) {
      throw new Error("S3 bucket or region not configured");
    }

    if (!gc_csi_s3_key || !gc_csi_s3_SECRET) {
      throw new Error("S3 credentials not configured");
    }

    return new S3({
      region: gc_csi_s3_REGION as string,
      credentials: {
        accessKeyId: gc_csi_s3_key as string,
        secretAccessKey: gc_csi_s3_SECRET as string,
      },
    });
  }

  public async deleteFile(
    dirPath: string,
    fileName: string
  ): Promise<DeleteObjectCommandOutput> {
    const bucket = gc_csi_s3_bucket;
    const s3 = this.getS3Client();

    return s3.deleteObject({
      Bucket: bucket,
      Key: `${dirPath}${fileName}`,
    });
  }

  public async uploadFile(
    dirPath: string,
    fileName: string,
    data: unknown
  ): Promise<UploadResult> {
    const bucket = gc_csi_s3_bucket;
    const region = gc_csi_s3_REGION;
    
    let payload: string;
    try {
      payload = JSON.stringify(data, null, 2);
    } catch (error) {
      throw new Error("json_export_error");
    }

    const key = `${dirPath}${fileName}`.replace(/^\/+/, "");
    const s3 = this.getS3Client();
    const response = await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(payload, "utf-8"),
      ContentType: "application/json",
    });

    // Construct URL from response metadata and S3 parameters
    const url = this.constructS3Url(response, bucket, region, key);

    return { response, url };
  }

  private constructS3Url(
    response: PutObjectCommandOutput,
    bucket: string | undefined,
    region: string | undefined,
    key: string
  ): string {
    // Use response metadata to validate successful upload, then construct URL
    if (!response.$metadata.httpStatusCode || response.$metadata.httpStatusCode < 200 || response.$metadata.httpStatusCode >= 300) {
      throw new Error("s3_upload_failed");
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(
      key
    ).replace(/%2F/g, "/")}`;
  }

  private ensureDirectoryPath(path: string): string {
    const trimmed = path.replace(/^\//, "");
    if (!trimmed.length) {
      return "";
    }
    return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  public async uploadToS3(
    contents: Model[],
    directory: string,
    moduleName: string,
  ): Promise<void> {
    const safeDirectory = this.ensureDirectoryPath(directory);
    const fileName = this.slugify(moduleName) + '.json';

    const payload = {
      details: contents.map((content) =>
        typeof (content as any).toJSON === "function" ? content.toJSON() : content
      ),
    };

    const { response, url } = await this.uploadFile(
      safeDirectory,
      fileName,
      payload
    );

    const s3Key = `${safeDirectory}${fileName}`;

    // Use DTO pattern for AWS file metadata
    const requestDTO = new AwsFileSaveRequestDTO({
      modelName: moduleName,
      fileName,
      s3Key,
      s3Url: url,
      recordCount: contents.length,
      metadata: response,
    });

    // Validate DTO
    requestDTO.validate();

    // Create domain entity and persist via repository
    const entity = AwsFileEntity.create(requestDTO.toEntityProps());
    const repository = new AwsFileRepository();
    await repository.saveOrUpdate(entity);

    logger.info(`Uploaded ${moduleName} snapshot to S3`, {
      module: moduleName,
      fileName,
      directory: s3Key,
      contentCount: contents.length,
    });
    return;
  }
}

export default new UtilityMethods();
