export interface StorybookStory {
  id: string;
  title: string;
  name: string;
  importPath?: string;
  kind?: string;
  story?: string;
  parameters?: Record<string, any>;
  args?: Record<string, any>;
  argTypes?: Record<string, any>;
}

export interface StorybookIndex {
  v: number;
  stories?: Record<string, StorybookStory>;
  entries?: Record<string, StorybookStory>;
}

export interface ComponentInfo {
  id: string;
  name: string;
  title: string;
  category?: string;
  stories: StorybookStory[];
}

export interface ComponentVariant {
  id: string;
  name: string;
  args?: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface ComponentHTML {
  storyId: string;
  html: string;
  styles?: string[];
  classes?: string[];
}

export interface ComponentStyles {
  storyId: string;
  cssRules: CSSRule[];
  inlineStyles: Record<string, string>;
  classNames: string[];
  customProperties: Record<string, string>;
}

export interface CSSRule {
  selector: string;
  styles: Record<string, string>;
  mediaQuery?: string;
}

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'spacing' | 'typography' | 'shadow' | 'border' | 'other';
  category?: string;
}

export interface ComponentComparison {
  component1: ComponentHTML;
  component2: ComponentHTML;
  differences: {
    htmlDiff: string[];
    stylesDiff: string[];
    classesDiff: {
      added: string[];
      removed: string[];
    };
  };
}

export interface ComponentUsageAnalysis {
  componentName: string;
  totalVariants: number;
  commonProps: Record<string, {
    frequency: number;
    values: string[];
  }>;
  propsUsage: Record<string, number>;
  categories: string[];
}