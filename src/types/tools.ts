export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    resource?: any;
  }>;
}

export interface ListComponentsInput {
  category?: string;
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
}

export interface GetComponentStylesInput {
  componentId: string;
  extractCustomProperties?: boolean;
}

export interface CompareComponentsInput {
  componentId1: string;
  componentId2: string;
  compareStyles?: boolean;
}

export interface AnalyzeComponentUsageInput {
  componentName: string;
  includeProps?: boolean;
}

export interface ExportDesignTokensInput {
  tokenTypes?: ('color' | 'spacing' | 'typography' | 'shadow' | 'border' | 'other')[];
  format?: 'json' | 'css' | 'scss';
}