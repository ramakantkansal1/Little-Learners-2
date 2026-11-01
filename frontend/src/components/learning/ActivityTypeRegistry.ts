import { ActivityType } from "@/types";
import {
  ActivityTypeComponent,
  ActivityTypeRegistryEntry,
} from "./ActivityTypeRegistry.types";

/**
 * Registry for activity type components.
 * Maps ActivityType enum values to their React component implementations.
 */
export class ActivityTypeRegistry {
  private entries = new Map<ActivityType, ActivityTypeRegistryEntry>();

  /**
   * Register an activity type entry.
   */
  register(entry: ActivityTypeRegistryEntry): void {
    this.entries.set(entry.type, entry);
  }

  /**
   * Get the registry entry for an activity type.
   */
  get(type: ActivityType): ActivityTypeRegistryEntry | undefined {
    return this.entries.get(type);
  }

  /**
   * Get the React component for an activity type.
   * Returns undefined if the type is not registered.
   */
  getComponent(type: ActivityType): ActivityTypeComponent | undefined {
    const entry = this.entries.get(type);
    return entry?.component;
  }

  /**
   * Get all registered activity type entries.
   */
  getAllEntries(): ActivityTypeRegistryEntry[] {
    return Array.from(this.entries.values());
  }
}

/**
 * Singleton registry instance.
 */
export const activityTypeRegistry = new ActivityTypeRegistry();

/**
 * Get registry entry for an activity type.
 */
export function getRegistryEntry(
  type: ActivityType,
): ActivityTypeRegistryEntry | undefined {
  return activityTypeRegistry.get(type);
}

/**
 * Create a registry entry with default values.
 */
export function createActivityTypeEntry(
  type: ActivityType,
  label: string,
  icon: string,
  color: string,
  component: ActivityTypeComponent,
  options: {
    supportsAudio?: boolean;
    supportsImages?: boolean;
    defaultConfig?: Record<string, unknown>;
  } = {},
): ActivityTypeRegistryEntry {
  return {
    type,
    label,
    icon,
    color,
    component,
    supportsAudio: options.supportsAudio ?? true,
    supportsImages: options.supportsImages ?? true,
    defaultConfig: options.defaultConfig ?? {},
  };
}

/**
 * Validate activity configuration for a given type.
 */
export function validateActivityConfig(
  type: ActivityType,
  config: Record<string, unknown> | null,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config) {
    return { valid: true, errors: [] };
  }

  // Type-specific validation can be added here
  switch (type) {
    case "counting":
      if (typeof config.maxCount !== "number" || config.maxCount < 1) {
        errors.push("counting activity requires maxCount number >= 1");
      }
      break;
    case "sequencing":
      if (!Array.isArray(config.sequence) || config.sequence.length < 2) {
        errors.push(
          "sequencing activity requires sequence array with at least 2 items",
        );
      }
      break;
    case "sorting":
      if (!Array.isArray(config.categories) || config.categories.length < 2) {
        errors.push(
          "sorting activity requires categories array with at least 2 items",
        );
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Register activity types - safe to call multiple times.
 * Registration entries live in ActivityRenderer.tsx (where components are
 * available) to avoid circular dependencies. This no-op indirection is kept
 * for backwards compatibility with existing imports.
 */
export function registerActivityTypes(): void {
  // No-op here; registrations happen in ActivityRenderer.tsx
}

/**
 * Ensure the singleton registry has been populated by loading the
 * ActivityRenderer registration side-effect. Importing ActivityRenderer is
 * safe here at call time (not module top-level), so pages that only import
 * ActivityTypeRegistry (e.g. admin CurriculumPage) can populate the selector
 * without creating a circular import.
 */
export async function ensureActivityTypesRegistered(): Promise<void> {
  if (activityTypeRegistry.getAllEntries().length > 0) return;
  await import("./ActivityRenderer");
}
