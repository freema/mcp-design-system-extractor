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

export interface ComponentProps {
  storyId: string;
  props: Record<string, PropDefinition>;
  defaultProps?: Record<string, any>;
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
  control?: {
    type: string;
    options?: any[];
  };
}

export interface ComponentDependencies {
  storyId: string;
  dependencies: string[];
  internalComponents: string[];
  externalComponents: string[];
}

export interface ThemeInfo {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, any>;
  breakpoints: Record<string, string>;
  shadows: Record<string, string>;
  radii: Record<string, string>;
}

export interface ComponentByPurpose {
  purpose: string;
  components: ComponentInfo[];
  description?: string;
}

export interface ComponentComposition {
  storyId: string;
  examples: CompositionExample[];
}

export interface CompositionExample {
  name: string;
  description: string;
  html: string;
  components: string[];
  props?: Record<string, any>;
}
