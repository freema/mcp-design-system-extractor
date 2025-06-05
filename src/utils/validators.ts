import { z } from 'zod';
import {
  ListComponentsInput,
  GetComponentHTMLInput,
  GetComponentVariantsInput,
  SearchComponentsInput,
  GetComponentStylesInput,
  CompareComponentsInput,
  AnalyzeComponentUsageInput,
  ExportDesignTokensInput
} from '../types/tools.js';

const ListComponentsInputSchema = z.object({
  category: z.string().optional()
});

const GetComponentHTMLInputSchema = z.object({
  componentId: z.string(),
  includeStyles: z.boolean().optional()
});

const GetComponentVariantsInputSchema = z.object({
  componentName: z.string()
});

const SearchComponentsInputSchema = z.object({
  query: z.string(),
  searchIn: z.enum(['name', 'title', 'category', 'all']).optional()
});

const GetComponentStylesInputSchema = z.object({
  componentId: z.string(),
  extractCustomProperties: z.boolean().optional()
});

const CompareComponentsInputSchema = z.object({
  componentId1: z.string(),
  componentId2: z.string(),
  compareStyles: z.boolean().optional()
});

const AnalyzeComponentUsageInputSchema = z.object({
  componentName: z.string(),
  includeProps: z.boolean().optional()
});

const ExportDesignTokensInputSchema = z.object({
  tokenTypes: z.array(z.enum(['color', 'spacing', 'typography', 'shadow', 'border', 'other'])).optional(),
  format: z.enum(['json', 'css', 'scss']).optional()
});

export function validateListComponentsInput(input: any): ListComponentsInput {
  const parsed = ListComponentsInputSchema.parse(input);
  const result: ListComponentsInput = {};
  if (parsed.category !== undefined) {
    result.category = parsed.category;
  }
  return result;
}

export function validateGetComponentHTMLInput(input: any): GetComponentHTMLInput {
  const parsed = GetComponentHTMLInputSchema.parse(input);
  const result: GetComponentHTMLInput = {
    componentId: parsed.componentId
  };
  if (parsed.includeStyles !== undefined) {
    result.includeStyles = parsed.includeStyles;
  }
  return result;
}

export function validateGetComponentVariantsInput(input: any): GetComponentVariantsInput {
  return GetComponentVariantsInputSchema.parse(input);
}

export function validateSearchComponentsInput(input: any): SearchComponentsInput {
  const parsed = SearchComponentsInputSchema.parse(input);
  const result: SearchComponentsInput = {
    query: parsed.query
  };
  if (parsed.searchIn !== undefined) {
    result.searchIn = parsed.searchIn;
  }
  return result;
}

export function validateGetComponentStylesInput(input: any): GetComponentStylesInput {
  const parsed = GetComponentStylesInputSchema.parse(input);
  const result: GetComponentStylesInput = {
    componentId: parsed.componentId
  };
  if (parsed.extractCustomProperties !== undefined) {
    result.extractCustomProperties = parsed.extractCustomProperties;
  }
  return result;
}

export function validateCompareComponentsInput(input: any): CompareComponentsInput {
  const parsed = CompareComponentsInputSchema.parse(input);
  const result: CompareComponentsInput = {
    componentId1: parsed.componentId1,
    componentId2: parsed.componentId2
  };
  if (parsed.compareStyles !== undefined) {
    result.compareStyles = parsed.compareStyles;
  }
  return result;
}

export function validateAnalyzeComponentUsageInput(input: any): AnalyzeComponentUsageInput {
  const parsed = AnalyzeComponentUsageInputSchema.parse(input);
  const result: AnalyzeComponentUsageInput = {
    componentName: parsed.componentName
  };
  if (parsed.includeProps !== undefined) {
    result.includeProps = parsed.includeProps;
  }
  return result;
}

export function validateExportDesignTokensInput(input: any): ExportDesignTokensInput {
  const parsed = ExportDesignTokensInputSchema.parse(input);
  const result: ExportDesignTokensInput = {};
  if (parsed.tokenTypes !== undefined) {
    result.tokenTypes = parsed.tokenTypes;
  }
  if (parsed.format !== undefined) {
    result.format = parsed.format;
  }
  return result;
}