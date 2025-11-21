import { SESSION_ID, USER_ID, METADATA } from '@arizeai/openinference-semantic-conventions';

/**
 * Mapping configuration for common metadata keys to OpenInference semantic conventions
 */
export const METADATA_MAPPINGS = {
  sessionKeys: ['threadId', 'sessionId'],
  userKeys: ['userId', 'userName'],
  metadataKeys: ['companyId', 'companyName', 'correlation_id'],
} as const;

type SpanAttributes = Record<string, any>;

/**
 * Applies metadata mappings to span attributes, converting common keys to OpenInference conventions.
 *
 * This function:
 * - Maps threadId/sessionId → session.id
 * - Maps userId/userName → user.id
 * - Collects companyId, companyName, correlation_id into metadata JSON
 * - Preserves all original attributes
 * - Does not override existing OpenInference attributes
 *
 * @param attributes - The span attributes to process
 * @returns A new attributes object with mappings applied
 */
export function applyMetadataMappings(attributes?: SpanAttributes): SpanAttributes {
  if (!attributes) {
    return {};
  }

  const result = { ...attributes };
  const metadataFields: Record<string, any> = {};

  // Map session keys if not already present
  if (!result[SESSION_ID]) {
    for (const key of METADATA_MAPPINGS.sessionKeys) {
      if (attributes[key] !== undefined) {
        result[SESSION_ID] = attributes[key];
        break;
      }
    }
  }

  // Map user keys if not already present
  if (!result[USER_ID]) {
    for (const key of METADATA_MAPPINGS.userKeys) {
      if (attributes[key] !== undefined) {
        result[USER_ID] = attributes[key];
        break;
      }
    }
  }

  // Collect metadata fields
  for (const key of METADATA_MAPPINGS.metadataKeys) {
    if (attributes[key] !== undefined) {
      metadataFields[key] = attributes[key];
    }
  }

  // Add metadata JSON string if any metadata fields were found
  if (Object.keys(metadataFields).length > 0 && !result[METADATA]) {
    result[METADATA] = JSON.stringify(metadataFields);
  }

  return result;
}
