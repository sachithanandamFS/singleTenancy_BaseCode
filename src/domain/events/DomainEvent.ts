/**
 * Base Domain Event
 * All domain events should extend this interface
 */
export interface IDomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId: number | string;
}

/**
 * Base implementation of a domain event
 */
export abstract class DomainEvent implements IDomainEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly eventName: string,
    public readonly aggregateId: number | string
  ) {
    this.occurredAt = new Date();
  }
}
