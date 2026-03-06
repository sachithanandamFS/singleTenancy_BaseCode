/**
 * Global Event Listener Registration
 * Registers event listeners once at application startup with module-specific event names
 * This ensures only relevant listeners are triggered for each module's events
 */

import { DomainEventDispatcher } from "./DomainEventDispatcher.js";

let isInitialized = false;

/**
 * Initialize global event listeners for localized modules
 * Registers module-specific event names: LocalizedModuleCreated:gender, LocalizedModuleUpdated:jobRole, etc.
 * Call this once at application startup
 */
export function initializeEventListeners(): void {
  if (isInitialized) {
    return; // Prevent duplicate registration
  }

  const dispatcher = DomainEventDispatcher.getInstance();

  // Register Sample code below in comments
  // const employeeListeners = new EmployeesEventListeners();
  // dispatcher.register("EmployeeEvent", (event: any) =>
  //   employeeListeners.onChanged(event)
  // );

  isInitialized = true;
}
