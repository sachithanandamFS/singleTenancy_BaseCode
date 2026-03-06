/**
 * Handlers for AWS File Operations
 * Manages snapshot metadata retrieval and storage with DTOs and domain events
 */

import { Request, Response, NextFunction } from "express";
import { AwsFileRepository } from "../../../repositories/AwsFileRepository.js";
import { AwsFileEntity } from "../../../domain/aws-file/AwsFileEntity.js";
import { DomainEventDispatcher } from "../../../domain/events/DomainEventDispatcher.js";
import { handleSuccess } from "../../../middleware/errorHandler.middleware.js";
import { errorCodes } from "../../../constants/constants.js";
import { AwsFileSaveRequestDTO, AwsFileResponseDTO } from "../../dtos/shared/AwsFileDTO.js";
import { AwsFileSavedEvent, AwsFilesFetchedEvent } from "../../../domain/events/aws-file/AwsFileEvents.js";
import { BaseHandler } from "../shared/BaseHandler.js";

export class AwsFileHandlers extends BaseHandler {
  private readonly repository: AwsFileRepository;
  private readonly eventDispatcher: DomainEventDispatcher;

  constructor() {
    super();
    this.repository = new AwsFileRepository();
    this.eventDispatcher = DomainEventDispatcher.getInstance();
  }

  /**
   * Get all AWS snapshot files
   */
  public getAllSnapshots = this.wrapHandler(
    async (req: Request, res: Response) => {
      const entities = await this.repository.findAll();

      // Serialize all entities using DTO
      const responseDTOs = entities.map((entity: AwsFileEntity) =>
        AwsFileResponseDTO.fromModel(entity.toObject()).toJSON()
      );

      // Dispatch event for audit trail
      this.eventDispatcher.dispatch(
        new AwsFilesFetchedEvent(responseDTOs.length, req.user?.id)
      );

      handleSuccess(
        res,
        "snapshot_fetched",
        responseDTOs,
        errorCodes.resOk,
        req.lang
      );
    },
    "Error fetching AWS snapshots"
  );

  /**
   * Save AWS snapshot file metadata
   */
  public saveSnapshot = this.wrapHandler(
    async (req: Request, res: Response) => {
      // Convert and validate request DTO
      const requestDTO = new AwsFileSaveRequestDTO(req.body);
      requestDTO.validate();

      const entityProps = requestDTO.toEntityProps();
      const entity = AwsFileEntity.create(entityProps);

      // Check if it's a new file or update
      const existing = await this.repository.findOrCreateByModelName(entity.getModelName());
      const isNew = !existing;

      // Save or update entity
      const savedEntity = await this.repository.saveOrUpdate(entity);

      // Dispatch domain event for audit trail
      this.eventDispatcher.dispatch(
        new AwsFileSavedEvent(
          savedEntity.getModelName(),
          savedEntity.getFileName(),
          savedEntity.getRecordCount(),
          isNew,
          req.user?.id
        )
      );

      // Response with null data - message parameter handles notifications
      handleSuccess(
        res,
        isNew ? "snapshot_created" : "snapshot_updated",
        null,
        errorCodes.resCreated,
        req.lang
      );
    },
    "Error saving AWS snapshot"
  );
}
