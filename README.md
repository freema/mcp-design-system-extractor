# MCP Design System Extractor

A Model Context Protocol (MCP) server that extracts component information from Storybook design systems. Connects to Storybook instances (including https://storybook.js.org distributions) and extracts HTML, styles, and component metadata.

## Key Dependencies

- **Puppeteer**: Uses headless Chrome for dynamic JavaScript component rendering
- **Chrome/Chromium**: Required for Puppeteer (automatically handled in Docker)
- Works with built Storybook distributions from https://storybook.js.org

[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/freema/mcp-design-system-extractor)](https://archestra.ai/mcp-catalog/freema__mcp-design-system-extractor)
<a href="https://glama.ai/mcp/servers/@freema/mcp-design-system-extractor">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@freema/mcp-design-system-extractor/badge" alt="Design System Extractor MCP server" />
</a>

## Features

- 🔍 **List Components**: Get all available components from your Storybook
- 📄 **Extract HTML**: Get the rendered HTML of any component variant with dynamic JavaScript support
- 🔎 **Search Components**: Find components by name, title, or category
- 🎛️ **Component Props**: Get component props/API documentation including types and defaults
- 🔗 **Component Dependencies**: Analyze which components are used within other components
- 📐 **Layout Components**: Get all layout components (Grid, Container, Stack, etc.) with examples
- 🎨 **Theme Information**: Extract design system theme (colors, spacing, typography, breakpoints)
- 🎯 **Search by Purpose**: Find components by their purpose (form inputs, navigation, feedback)
- 🧩 **Composition Examples**: Get examples of how components are combined together
- 📝 **External CSS Analysis**: Fetch and analyze CSS files to extract design tokens and variables

## Quick Start

```bash
npm install && npm run build
npm run setup  # Interactive setup for Claude Desktop
```

Or set manually:
```bash
export STORYBOOK_URL=http://localhost:6006
```

## Usage

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup instructions.

## Available Tools

### Core Tools

1. **list_components**
   - Lists all available components from the Storybook instance
   - Returns components with their names, categories, and associated stories
   - Use `category: "all"` or omit category parameter to list all components
   - Filter by specific category path (e.g., "Components/Buttons", "Layout")
   - Supports pagination with `page` and `pageSize` parameters (default: 50 per page)

2. **get_component_html**
   - Extracts HTML from a specific component story in Storybook
   - Requires story ID format: "component-name--story-name" (e.g., "button--primary")
   - Use list_components or get_component_variants first to find valid story IDs
   - Optional CSS style extraction for understanding component styling
   - Supports dynamic JavaScript-rendered content

3. **get_component_variants**
   - Gets all story variants/states for a specific component
   - Returns all stories (variants) for a component with their IDs, names, and parameters
   - Component name must match exactly as shown in list_components (case-sensitive)

4. **search_components**
   - Search components by name, title, or category using case-insensitive partial matching
   - Name is component name only (e.g., "Button")
   - Title is full story path (e.g., "Components/Forms/Button")  
   - Category is the grouping (e.g., "Components/Forms")
   - Use `query: "*"` to list all components
   - Search in specific fields: "name", "title", "category", or "all" (default)
   - Supports pagination with `page` and `pageSize` parameters (default: 50 per page)

### Component Analysis Tools

5. **get_component_props**
   - Extracts component props/API documentation from Storybook's argTypes configuration
   - Includes prop names, types, default values, required status, and control options
   - Requires story ID format: "component-name--story-name"

6. **get_component_dependencies**
   - Analyzes rendered HTML to find which other components a given component internally uses
   - Detects React components, web components, and CSS class patterns
   - Helps understand component relationships and composition
   - Requires story ID format: "component-name--story-name"

### Design System Tools

7. **get_layout_components**
   - Gets all layout components (Grid, Container, Stack, Box) with usage examples
   - Optional HTML examples for each layout component
   - Useful for understanding page structure and composition patterns

8. **get_theme_info**
   - Gets design system theme information (colors, spacing, typography, breakpoints)
   - Extracts CSS custom properties/variables from the design system
   - Categorizes tokens by type for better organization
   - Optional parameter to include all CSS custom properties found

### Discovery Tools

9. **get_component_by_purpose**
   - Search for components by their purpose or function
   - Available purposes: "form inputs" (input fields, selects, checkboxes), "navigation" (menus, breadcrumbs, tabs), "feedback" (alerts, toasts, modals), "data display" (tables, cards, lists), "layout" (grids, containers, dividers), "buttons" (all button types), "progress" (loaders, spinners), "media" (images, videos, carousels)
   - Flexible pattern matching for finding components by use case
   - Supports pagination with `page` and `pageSize` parameters (default: 50 per page)

10. **get_component_composition_examples**
    - Gets examples of how components are combined together in real-world patterns and layouts
    - Returns HTML examples showing the component used with other components in forms, cards, layouts, or complex UI patterns
    - Helps understand how components work together in practice
    - Optional limit parameter to control number of examples returned

11. **get_external_css** ⚠️ **TOKEN-OPTIMIZED**
    - **DEFAULT**: Returns ONLY design tokens + file stats (avoids token limits)
    - **Does NOT return CSS content** by default (prevents 25K token limit errors)
    - Extracts & categorizes tokens: colors, spacing, typography, shadows, breakpoints
    - Use `includeFullCSS: true` only when you specifically need CSS content
    - Security-protected: only accepts URLs from the same domain as your Storybook
    - **Perfect for design token extraction without hitting response size limits**

## Example Usage

```typescript
// List all components (recommended first step)
await listComponents({ category: "all" });

// Search for all components using wildcard
await searchComponents({ query: "*", searchIn: "all" });

// Search for specific components
await searchComponents({ query: "button", searchIn: "name" });

// Get all variants of a specific component
await getComponentVariants({ componentName: "Button" });

// Get HTML for a specific button variant (use exact story ID from above)
await getComponentHTML({ 
  componentId: "button--primary",
  includeStyles: true 
});

// Get component props documentation
await getComponentProps({
  componentId: "button--primary"
});

// Find components by purpose
await getComponentByPurpose({
  purpose: "form inputs"
});

// Get layout components with examples
await getLayoutComponents({
  includeExamples: true
});

// Extract theme information
await getThemeInfo({
  includeAll: false
});

// Analyze component dependencies
await getComponentDependencies({
  componentId: "card--default"
});

// Get composition examples
await getComponentCompositionExamples({
  componentId: "button--primary",
  limit: 3
});

// RECOMMENDED: Extract design tokens only (small response, avoids token limits)
await getExternalCSS({
  cssUrl: "https://my-storybook.com/assets/main.css"
  // extractTokens: true (default), includeFullCSS: false (default)
});

// ONLY when you specifically need CSS content (may hit token limits)
await getExternalCSS({
  cssUrl: "./assets/tokens.css",
  includeFullCSS: true,
  maxContentSize: 10000
});

// Search with pagination
await searchComponents({
  query: "button",
  page: 1,
  pageSize: 10
});
```

### AI Assistant Usage Tips

When using with Claude or other AI assistants:

1. **Start with discovery**: Use `list_components` with `category: "all"` or `search_components` with `query: "*"` to see all available components
2. **Get story IDs**: Use `get_component_variants` to find exact story IDs needed for other tools
3. **Use exact IDs**: Story IDs must be in format "component-name--story-name" (e.g., "button--primary")
4. **Explore by purpose**: Use `get_component_by_purpose` to find components by their function
5. **Debug issues**: Tools now include debug information when no results are found

## How It Works

Connects to Storybook via `/index.json` and `/iframe.html` endpoints. Uses Puppeteer with headless Chrome for dynamic JavaScript rendering. Extracts component HTML, styles, props, dependencies, and design tokens with smart caching and timeout protection.

## Troubleshooting

- Ensure Storybook is running and `STORYBOOK_URL` is correct
- Use exact story ID format: "component-name--story-name"
- Try `list_components` first to see available components
- Check `/index.json` endpoint directly in browser
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed troubleshooting

## Requirements

- Node.js 18+
- Chrome/Chromium (for Puppeteer)
- Running Storybook instance

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development instructions.

## License

MIT