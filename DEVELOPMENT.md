# Development Guide

## Prerequisites

- Node.js 18+
- Network access to Storybook URL
- Chrome/Chromium browser (for Puppeteer)

## Setup

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

## Development Commands

```bash
# Start in development mode
npm run dev

# Run with MCP Inspector
npm run inspector:dev
```

## Configuration

### With Claude Desktop

Use the setup script:
```bash
npm run setup
```

Or manually add to your Claude Desktop configuration:

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

### With Claude Code

Add to your `.claude_code_config.json` in the project root:

```json
{
  "mcpServers": {
    "design-system-extractor": {
      "command": "npm",
      "args": ["run", "dev"],
      "env": {
        "STORYBOOK_URL": "http://localhost:6006"
      }
    }
  }
}
```

Or for production build:

```json
{
  "mcpServers": {
    "design-system-extractor": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "STORYBOOK_URL": "http://localhost:6006"
      }
    }
  }
}
```

## Environment Variables

- `STORYBOOK_URL`: URL of the Storybook instance (default: `http://localhost:6006`)

## Testing

The server connects to Storybook using these endpoints:
- `/index.json` or `/stories.json` - Component metadata
- `/iframe.html?id=component--story` - Rendered components

Verify your Storybook is accessible by visiting these URLs directly in your browser.

## Architecture

Key features:
- **Dynamic Content Support**: Uses Puppeteer with headless Chrome to render JavaScript components
- **Smart Caching**: Caches responses for 5 minutes to improve performance
- **Retry Logic**: Automatically retries failed requests up to 3 times
- **Timeout Protection**: Configurable timeouts for different operations
- **Error Handling**: Comprehensive error categorization and debugging information

## Troubleshooting

### Connection Issues
- Verify Storybook is running (typically on port 6006)
- Check CORS configuration in your Storybook
- Ensure network connectivity to the Storybook URL
- Try accessing endpoints directly in browser

### Component Extraction Issues
- Ensure you're using the exact story ID format: "component-name--story-name"
- Use `get_component_variants` to find valid story IDs
- Check that stories exist and are published in Storybook

### Performance Issues
- Adjust timeout values in `src/utils/timeout-constants.ts`
- Monitor cache hit rates
- Check network latency to Storybook instance