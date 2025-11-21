import { SESSION_ID, USER_ID, METADATA } from '@arizeai/openinference-semantic-conventions';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { describe, it, expect, vi } from 'vitest';
import { OpenInferenceOTLPTraceExporter } from './openInferenceOTLPExporter';
import { applyMetadataMappings, METADATA_MAPPINGS } from './metadata-mapper';

describe('Metadata Preservation', () => {
  describe('applyMetadataMappings', () => {
    it('maps threadId to session.id', () => {
      const result = applyMetadataMappings({ threadId: 'thread-123' });
      expect(result[SESSION_ID]).toBe('thread-123');
      expect(result.threadId).toBe('thread-123');
    });

    it('maps userId to user.id', () => {
      const result = applyMetadataMappings({ userId: 'user-456' });
      expect(result[USER_ID]).toBe('user-456');
      expect(result.userId).toBe('user-456');
    });

    it('collects metadata fields into JSON', () => {
      const result = applyMetadataMappings({ companyId: 'comp-123' });
      expect(result[METADATA]).toBe(JSON.stringify({ companyId: 'comp-123' }));
    });

    it('preserves custom attributes', () => {
      const result = applyMetadataMappings({
        threadId: 'thread-123',
        customField: 'value',
      });
      expect(result.threadId).toBe('thread-123');
      expect(result.customField).toBe('value');
    });

    it('does not override existing OpenInference attributes', () => {
      const result = applyMetadataMappings({
        [SESSION_ID]: 'existing',
        threadId: 'new-thread',
      });
      expect(result[SESSION_ID]).toBe('existing');
    });

    it('handles empty attributes', () => {
      const result = applyMetadataMappings({});
      expect(result).toEqual({});
    });
  });

  describe('OpenInferenceOTLPTraceExporter', () => {
    it('constructor accepts configuration options', () => {
      const exporter1 = new OpenInferenceOTLPTraceExporter();
      expect(exporter1).toBeDefined();

      const exporter2 = new OpenInferenceOTLPTraceExporter({
        preserveCustomAttributes: false,
        autoMapMetadata: false,
      });
      expect(exporter2).toBeDefined();
    });

    it('applies metadata mappings and preserves attributes', () => {
      const mockSpan = {
        attributes: {
          'gen_ai.request.model': 'gpt-4',
          threadId: 'thread-123',
          customField: 'custom-value',
        },
      };

      const mappedAttrs = applyMetadataMappings(mockSpan.attributes);
      expect(mappedAttrs.threadId).toBe('thread-123');
      expect(mappedAttrs.customField).toBe('custom-value');
      expect(mappedAttrs[SESSION_ID]).toBe('thread-123');
    });
  });

  describe('METADATA_MAPPINGS', () => {
    it('exports expected configuration', () => {
      expect(METADATA_MAPPINGS.sessionKeys).toEqual(['threadId']);
      expect(METADATA_MAPPINGS.userKeys).toEqual(['userId', 'userName']);
      expect(METADATA_MAPPINGS.metadataKeys).toContain('companyId');
    });
  });
});
