export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    resource?: any;
  }>;
}

export interface ListComponentsInput {
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface GetComponentHTMLInput {
  componentId: string;
  includeStyles?: boolean;
}

export interface GetComponentVariantsInput {
  componentName: string;
}

export interface SearchComponentsInput {
  query: string;
  searchIn?: 'name' | 'title' | 'category' | 'all';
  page?: number;
  pageSize?: number;
}

export interface GetComponentPropsInput {
  componentId: string;
}

export interface GetComponentDependenciesInput {
  componentId: string;
}

export interface GetLayoutComponentsInput {
  includeExamples?: boolean;
}

export interface GetThemeInfoInput {
  includeAll?: boolean;
}

export interface GetComponentByPurposeInput {
  purpose: string;
  page?: number;
  pageSize?: number;
}

export interface GetComponentCompositionExamplesInput {
  componentId: string;
  limit?: number;
}
