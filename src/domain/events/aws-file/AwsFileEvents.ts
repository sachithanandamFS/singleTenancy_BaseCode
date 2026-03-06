/**
 * Domain Events for AWS File Operations
 * Used for audit trail and extensibility
 */

import { DomainEvent } from "../DomainEvent.js";

/**
 * Event dispatched when AWS file metadata is saved
 */
export class AwsFileSavedEvent extends DomainEvent {
  public readonly modelName: string;
  public readonly fileName: string;
  public readonly recordCount: number;
  public readonly isNew: boolean;
  public readonly savedBy?: number;

  constructor(
    modelName: string,
    fileName: string,
    recordCount: number,
    isNew: boolean,
    savedBy?: number
  ) {
    super("AwsFileSaved", modelName);
    this.modelName = modelName;
    this.fileName = fileName;
    this.recordCount = recordCount;
    this.isNew = isNew;
    this.savedBy = savedBy;
  }
}

/**
 * Event dispatched when AWS file metadata is fetched
 */
export class AwsFilesFetchedEvent extends DomainEvent {
  public readonly totalFiles: number;
  public readonly fetchedBy?: number;

  constructor(totalFiles: number, fetchedBy?: number) {
    super("AwsFilesFetched", "aws-files");
    this.totalFiles = totalFiles;
    this.fetchedBy = fetchedBy;
  }
}
