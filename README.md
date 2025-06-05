# MCP Design System Extractor

A Model Context Protocol (MCP) server that extracts component information from Storybook design systems. This server connects to a running Storybook instance and extracts HTML, styles, and component metadata directly from the Storybook iframe.

## Features

- 🔍 **List Components**: Get all available components from your Storybook
- 📄 **Extract HTML**: Get the rendered HTML of any component variant
- 🎨 **Extract Styles**: Analyze CSS classes, inline styles, and design tokens
- 🔎 **Search Components**: Find components by name, title, or category
- 📊 **Compare Components**: Compare HTML and styles between different variants
- 📈 **Usage Analysis**: Analyze how components are used across stories
- 🎨 **Design Tokens**: Extract and export design tokens in various formats

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

### Basic Tools

1. **list_components**
   - Lists all available components
   - Optional category filtering

2. **get_component_html**
   - Extracts HTML from a specific component story
   - Optional style extraction

3. **get_component_variants**
   - Gets all story variants for a component
   - Returns story metadata and arguments

4. **search_components**
   - Search components by name, title, or category
   - Flexible search options

### Advanced Tools

5. **get_component_styles**
   - Extracts CSS classes, inline styles, and custom properties
   - Detailed style analysis

6. **compare_components**
   - Compares HTML and styles between two variants
   - Highlights differences

7. **analyze_component_usage**
   - Analyzes component usage patterns
   - Props frequency and usage statistics

8. **export_design_tokens**
   - Extracts design tokens from CSS custom properties
   - Multiple export formats (JSON, CSS, SCSS)

## Example Usage

```typescript
// List all components
await listComponents();

// Get HTML for a specific button variant
await getComponentHTML({ 
  componentId: "example-button--primary" 
});

// Search for button components
await searchComponents({ 
  query: "button" 
});

// Compare two component variants
await compareComponents({
  componentId1: "example-button--primary",
  componentId2: "example-button--secondary"
});

// Export design tokens as CSS
await exportDesignTokens({
  format: "css",
  tokenTypes: ["color", "spacing"]
});
```

## How It Works

The server connects to Storybook using these endpoints:
- `/index.json` or `/stories.json` - Component metadata
- `/iframe.html?id=component--story` - Rendered components

It extracts HTML from the `#storybook-root` or `#root` element and analyzes:
- Component HTML structure
- CSS classes and inline styles
- CSS custom properties (design tokens)
- Component variants and arguments

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
