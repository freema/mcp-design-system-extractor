# MCP Design System Extractor

A Model Context Protocol (MCP) server that extracts component information from Storybook design systems. This server connects to a running Storybook instance and extracts HTML, styles, and component metadata directly from the Storybook iframe.

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

## Installation

```bash
npm install
npm run build
```

## Quick Setup

Use the interactive setup script to configure Claude Desktop:

```bash
npm run setup
```

This will:
- Build the project if needed
- Let you choose your Storybook URL (local or custom)
- Test the connection
- Configure Claude Desktop automatically

## Manual Configuration

Alternatively, set the Storybook URL via environment variable:

```bash
export STORYBOOK_URL=http://localhost:6006
```

Default: `http://localhost:6006`

## Usage

### With Claude Desktop

**Recommended:** Use the setup script:
```bash
npm run setup
```

**Manual:** Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "design-system-extractor": {
      "command": "node",
      "args": ["/path/to/mcp-design-system-extractor/dist/index.js"],
      "env": {
        "STORYBOOK_URL": "http://localhost:6006"
      }
    }
  }
}
```

### Development

```bash
# Start in development mode
npm run dev

# Run with MCP Inspector
npm run inspector:dev
```

## Available Tools

### Core Tools

1. **list_components**
   - Lists all available components from the Storybook instance
   - Returns components with their names, categories, and associated stories
   - Use `category: "all"` or omit category parameter to list all components
   - Filter by specific category path (e.g., "Components/Buttons", "Layout")

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

10. **get_component_composition_examples**
    - Gets examples of how components are combined together in real-world patterns and layouts
    - Returns HTML examples showing the component used with other components in forms, cards, layouts, or complex UI patterns
    - Helps understand how components work together in practice
    - Optional limit parameter to control number of examples returned

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
```

### AI Assistant Usage Tips

When using with Claude or other AI assistants:

1. **Start with discovery**: Use `list_components` with `category: "all"` or `search_components` with `query: "*"` to see all available components
2. **Get story IDs**: Use `get_component_variants` to find exact story IDs needed for other tools
3. **Use exact IDs**: Story IDs must be in format "component-name--story-name" (e.g., "button--primary")
4. **Explore by purpose**: Use `get_component_by_purpose` to find components by their function
5. **Debug issues**: Tools now include debug information when no results are found

## How It Works

The server connects to Storybook using these endpoints:
- `/index.json` or `/stories.json` - Component metadata
- `/iframe.html?id=component--story` - Rendered components

Key features:
- **Dynamic Content Support**: Uses happy-dom to execute JavaScript and render dynamic content
- **Smart Caching**: Caches responses for 5 minutes to improve performance
- **Retry Logic**: Automatically retries failed requests up to 3 times
- **Timeout Protection**: 10-second timeout on all network requests
- **Better Error Messages**: Provides helpful suggestions when connections fail

It extracts:
- Component HTML structure (including dynamically rendered content)
- CSS classes and inline styles
- Component props and API documentation
- Component dependencies and relationships
- Design system tokens and theme information

## Troubleshooting

### Common Issues

**Empty results from list_components or search_components:**
- Ensure your Storybook is running and accessible at the configured URL
- Check that `STORYBOOK_URL` environment variable is set correctly
- Try accessing `/index.json` or `/stories.json` directly in your browser
- Verify your Storybook has stories configured and published
- Check the debug information returned in the tool response

**"Found 0 components" with category filtering:**
- Use `category: "all"` or omit the category parameter to see all components first
- Check available categories from the initial `list_components` call
- Category names are case-sensitive and must match exactly

**Wildcard search not working:**
- Use `query: "*"` (with quotes) to list all components in search_components
- Ensure the query parameter is provided as a string

**Component HTML extraction fails:**
- Ensure you're using the exact story ID format: "component-name--story-name"
- Use `get_component_variants` first to find valid story IDs
- Check that the story exists and is published in Storybook

**Connection issues:**
- Verify Storybook is running (typically on port 6006)
- Check CORS configuration in your Storybook
- Ensure network connectivity to the Storybook URL
- Try a different URL format (with/without trailing slash)

## Requirements

- Node.js 18+
- Running Storybook instance
- Network access to Storybook URL

## Development

```bash
# Install dependencies
npm install

# Run TypeScript checks
npm run typecheck

# Run linting
npm run lint

# Build for production
npm run build

# Clean build files
npm run clean
```

## License

MIT
