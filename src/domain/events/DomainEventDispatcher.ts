/**
 * Domain Event Dispatcher
 * Simple in-memory event dispatcher for handling domain events
 */
export type EventHandler<T> = (event: T) => void | Promise<void>;

export class DomainEventDispatcher {
  private static instance: DomainEventDispatcher;
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventDispatcher {
    if (!DomainEventDispatcher.instance) {
      DomainEventDispatcher.instance = new DomainEventDispatcher();
    }
    return DomainEventDispatcher.instance;
  }

  /**
   * Register an event handler for a specific event type
   */
  public register<T>(eventName: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  /**
   * Dispatch an event to all registered handlers
   */
  public async dispatch<T>(event: T & { eventName: string }): Promise<void> {
    const handlers = this.handlers.get(event.eventName);
    if (!handlers || handlers.length === 0) {
      return;
    }

    // Execute all handlers
    const promises = handlers.map((handler) => handler(event));
    await Promise.all(promises);
  }

  /**
   * Clear all handlers (useful for testing)
   */
  public clearAll(): void {
    this.handlers.clear();
  }

  /**
   * Clear handlers for a specific event
   */
  public clear(eventName: string): void {
    this.handlers.delete(eventName);
  }
}
