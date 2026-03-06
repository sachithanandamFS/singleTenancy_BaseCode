/**
 * Input Sanitizer Utility
 * Handles sanitization and normalization of incoming request data
 * Keeps handlers clean while ensuring data quality
 */
export class InputSanitizer {
  /**
   * Sanitize a payload based on field type configuration
   */
  public static sanitize<T extends Record<string, any>>(
    payload: T,
    config: Partial<Record<keyof T, "string" | "number" | "boolean">>
  ): T {
    const copy = { ...payload };

    for (const [fieldKey, targetType] of Object.entries(config)) {
      const field = fieldKey as keyof T;
      const value = copy[field];

      if (value === undefined || value === null || !targetType) {
        continue;
      }

      switch (targetType) {
        case "string":
          if (typeof value === "string") {
            copy[field] = value.trim() as T[keyof T];
          }
          break;
        case "number":
          if (typeof value === "number" && Number.isFinite(value)) {
            copy[field] = value as T[keyof T];
            break;
          }
          if (typeof value === "string") {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) {
              copy[field] = parsed as T[keyof T];
            }
          }
          break;
        case "boolean":
          if (typeof value === "boolean") {
            break;
          }
          if (typeof value === "string") {
            const lower = value.toLowerCase();
            if (lower === "true" || lower === "1") {
              copy[field] = true as T[keyof T];
            } else if (lower === "false" || lower === "0") {
              copy[field] = false as T[keyof T];
            }
            break;
          }
          if (typeof value === "number") {
            if (value === 1) {
              copy[field] = true as T[keyof T];
            } else if (value === 0) {
              copy[field] = false as T[keyof T];
            }
          }
          break;
        default:
          break;
      }
    }
    return copy;
  }

  /**
   * Trim all string values in a payload
   */
  public static trimStrings<T extends Record<string, any>>(payload: T): T {
    const copy = { ...payload } as Record<string, any>;

    for (const [key, value] of Object.entries(copy)) {
      if (typeof value === "string") {
        copy[key] = value.trim();
      }
    }

    return copy as T;
  }

  /**
   * Sanitize an array of permissions
   */
  public static sanitizePermissions(
    permissions: Array<{ module_id: any; resp_ids: any[] }>
  ): Array<{ module_id: number; resp_ids: number[] }> {
    return permissions
      .map((perm) => ({
        module_id: Number(perm.module_id),
        resp_ids: perm.resp_ids
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      }))
      .filter((perm) => perm.resp_ids.length > 0);
  }
}
