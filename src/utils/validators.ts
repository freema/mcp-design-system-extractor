import { z } from 'zod';
import {
  ListComponentsInput,
  GetComponentHTMLInput,
  GetComponentVariantsInput,
  SearchComponentsInput,
  GetComponentPropsInput,
  GetComponentDependenciesInput,
  GetLayoutComponentsInput,
  GetThemeInfoInput,
  GetComponentByPurposeInput,
  GetComponentCompositionExamplesInput,
} from '../types/tools.js';

const ListComponentsInputSchema = z.object({
  category: z.string().optional(),
});

const GetComponentHTMLInputSchema = z.object({
  componentId: z.string(),
  includeStyles: z.boolean().optional(),
});

const GetComponentVariantsInputSchema = z.object({
  componentName: z.string(),
});

const SearchComponentsInputSchema = z.object({
  query: z.string(),
  searchIn: z.enum(['name', 'title', 'category', 'all']).optional(),
});

const GetComponentPropsInputSchema = z.object({
  componentId: z.string(),
});

const GetComponentDependenciesInputSchema = z.object({
  componentId: z.string(),
});

const GetLayoutComponentsInputSchema = z.object({
  includeExamples: z.boolean().optional(),
});

const GetThemeInfoInputSchema = z.object({
  includeAll: z.boolean().optional(),
});

const GetComponentByPurposeInputSchema = z.object({
  purpose: z.string(),
});

const GetComponentCompositionExamplesInputSchema = z.object({
  componentId: z.string(),
  limit: z.number().optional(),
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
    componentId: parsed.componentId,
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
    query: parsed.query,
  };
  if (parsed.searchIn !== undefined) {
    result.searchIn = parsed.searchIn;
  }
  return result;
}

export function validateGetComponentPropsInput(input: any): GetComponentPropsInput {
  return GetComponentPropsInputSchema.parse(input);
}

export function validateGetComponentDependenciesInput(input: any): GetComponentDependenciesInput {
  return GetComponentDependenciesInputSchema.parse(input);
}

export function validateGetLayoutComponentsInput(input: any): GetLayoutComponentsInput {
  const parsed = GetLayoutComponentsInputSchema.parse(input);
  const result: GetLayoutComponentsInput = {};
  if (parsed.includeExamples !== undefined) {
    result.includeExamples = parsed.includeExamples;
  }
  return result;
}

export function validateGetThemeInfoInput(input: any): GetThemeInfoInput {
  const parsed = GetThemeInfoInputSchema.parse(input);
  const result: GetThemeInfoInput = {};
  if (parsed.includeAll !== undefined) {
    result.includeAll = parsed.includeAll;
  }
  return result;
}

export function validateGetComponentByPurposeInput(input: any): GetComponentByPurposeInput {
  return GetComponentByPurposeInputSchema.parse(input);
}

export function validateGetComponentCompositionExamplesInput(
  input: any
): GetComponentCompositionExamplesInput {
  const parsed = GetComponentCompositionExamplesInputSchema.parse(input);
  const result: GetComponentCompositionExamplesInput = {
    componentId: parsed.componentId,
  };
  if (parsed.limit !== undefined) {
    result.limit = parsed.limit;
  }
  return result;
}
