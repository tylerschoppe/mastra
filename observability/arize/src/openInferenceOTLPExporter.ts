import { convertGenAISpanAttributesToOpenInferenceSpanAttributes } from '@arizeai/openinference-genai';
import type { Mutable } from '@arizeai/openinference-genai/types';
import type { ExportResult } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { convertMastraMessagesToGenAIMessages } from './gen-ai';
import { applyMetadataMappings } from './metadata-mapper.js';

export class OpenInferenceOTLPTraceExporter extends OTLPTraceExporter {
  private preserveCustomAttributes: boolean;
  private autoMapMetadata: boolean;

  constructor(
    config?: {
      preserveCustomAttributes?: boolean;
      autoMapMetadata?: boolean;
    } & ConstructorParameters<typeof OTLPTraceExporter>[0],
  ) {
    const { preserveCustomAttributes, autoMapMetadata, ...otlpConfig } = config ?? {};
    super(otlpConfig);
    this.preserveCustomAttributes = preserveCustomAttributes ?? true;
    this.autoMapMetadata = autoMapMetadata ?? true;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void) {
    const processedSpans = spans.map(span => {
      // convert Mastra input messages to GenAI messages if present
      if (span.attributes?.['gen_ai.prompt'] && typeof span.attributes['gen_ai.prompt'] === 'string') {
        span.attributes['gen_ai.input.messages'] = convertMastraMessagesToGenAIMessages(
          span.attributes['gen_ai.prompt'],
        );
      }
      // convert Mastra output messages to GenAI messages if present
      if (span.attributes?.['gen_ai.completion'] && typeof span.attributes['gen_ai.completion'] === 'string') {
        span.attributes['gen_ai.output.messages'] = convertMastraMessagesToGenAIMessages(
          span.attributes['gen_ai.completion'],
        );
      }

      // apply metadata mappings before converting to OpenInference
      let attributes = span.attributes;
      if (this.autoMapMetadata) {
        attributes = applyMetadataMappings(attributes);
      }

      // convert to OpenInference format
      const processedAttributes = convertGenAISpanAttributesToOpenInferenceSpanAttributes(attributes);

      // merge or replace attributes based on configuration
      if (processedAttributes) {
        if (this.preserveCustomAttributes) {
          // merge: keep original + add OpenInference attributes
          (span as Mutable<ReadableSpan>).attributes = {
            ...attributes,
            ...processedAttributes,
          };
        } else {
          // replace: legacy behavior
          (span as Mutable<ReadableSpan>).attributes = processedAttributes;
        }
      }
      return span;
    });

    super.export(processedSpans, resultCallback);
  }
}
