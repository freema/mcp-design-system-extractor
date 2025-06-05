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
  tokenTypes: z.array(z.enum(['color', 'spacing', 'typography', 'shadow', 'border'])).optional(),
  format: z.enum(['json', 'css', 'scss']).optional()
});

export function validateListComponentsInput(input: any): ListComponentsInput {
  return ListComponentsInputSchema.parse(input);
}

export function validateGetComponentHTMLInput(input: any): GetComponentHTMLInput {
  return GetComponentHTMLInputSchema.parse(input);
}

export function validateGetComponentVariantsInput(input: any): GetComponentVariantsInput {
  return GetComponentVariantsInputSchema.parse(input);
}

export function validateSearchComponentsInput(input: any): SearchComponentsInput {
  return SearchComponentsInputSchema.parse(input);
}

export function validateGetComponentStylesInput(input: any): GetComponentStylesInput {
  return GetComponentStylesInputSchema.parse(input);
}

export function validateCompareComponentsInput(input: any): CompareComponentsInput {
  return CompareComponentsInputSchema.parse(input);
}

export function validateAnalyzeComponentUsageInput(input: any): AnalyzeComponentUsageInput {
  return AnalyzeComponentUsageInputSchema.parse(input);
}

export function validateExportDesignTokensInput(input: any): ExportDesignTokensInput {
  return ExportDesignTokensInputSchema.parse(input);
}