# Design System Extractor Plugin for Claude Code

Extract components, HTML, styles, and themes from Storybook design systems for AI-assisted UI development.

## What's Included

- **MCP Server** - Connects Claude Code to Storybook instances
- **Skills** - Auto-triggers when building UIs with design systems
- **Agents** - `ui-builder` for component-based development
- **Commands** - `/design:list`, `/design:extract`, `/design:theme`

## Installation

```bash
claude plugin install design-system
```

**Required environment variable:**
```
STORYBOOK_URL=http://localhost:6006
```

## Commands

### /design:list

List all components in the design system:

```
/design:list
/design:list buttons
/design:list --category=forms
```

### /design:extract

Extract HTML from a component:

```
/design:extract button--primary
/design:extract card--default
```

### /design:theme

Get design system theme (colors, spacing, typography):

```
/design:theme
/design:theme colors
```

## Agents

Spawn the UI builder for focused development:

```
spawn ui-builder to create a login form using the design system
spawn ui-builder to build a dashboard layout with cards
```

## Usage Examples

- "Show me all button variants"
- "Extract the HTML for the primary button"
- "What colors are in the design system?"
- "Build a form using the design system components"

## Links

- [Repository](https://github.com/freema/mcp-design-system-extractor)
- [npm](https://www.npmjs.com/package/mcp-design-system-extractor)
