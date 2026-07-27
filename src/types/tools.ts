export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    resource?: any;
  }>;
  /** Matches the tool's declared `outputSchema`. Absent on errors. */
  structuredContent?: Record<string, unknown>;
  /** Set on a failed call so clients do not read the error text as a result. */
  isError?: boolean;
}

export interface ListComponentsInput {
  category?: string;
  compact?: boolean;
  page?: number;
  pageSize?: number;
}

export interface GetComponentHTMLInput {
  componentId: string;
  includeStyles?: boolean;
  variantsOnly?: boolean;
  async?: boolean;
  timeout?: number;
}

export interface SearchComponentsInput {
  query?: string;
  purpose?: string;
  searchIn?: 'name' | 'title' | 'category' | 'all';
  page?: number;
  pageSize?: number;
}

export interface GetComponentDependenciesInput {
  componentId: string;
}

export interface GetThemeInfoInput {
  includeAll?: boolean;
}
