---
name: design-extraction
description: This skill should be used when the user asks about Storybook, design systems, UI components, extracting HTML, or building interfaces using existing components. Activates for component listing, HTML extraction, theme analysis, or UI assembly.
---

When the user asks about design systems or building UIs with components, use the design-system MCP tools.

## When to Use This Skill

Activate when the user:

- Asks about available components ("What buttons do we have?", "List form components")
- Needs component HTML ("Extract the card component", "Get the modal HTML")
- Wants theme info ("What colors are available?", "Show me the spacing scale")
- Builds UIs ("Create a login form using our components")
- Analyzes components ("What components does the header use?")

## Tools Reference

| Task | Tool |
|------|------|
| List all | `list_components` (use `compact: true`) |
| Search | `search_components` |
| Extract HTML | `get_component_html` (async) |
| Check variants | `get_component_html` with `variantsOnly: true` |
| Get theme | `get_theme_info` |
| Get CSS | `get_external_css` |
| Dependencies | `get_component_dependencies` |
| Job status | `job_status` |

## Async Operations

`get_component_html` is async by default:

```
get_component_html componentId="button--primary"
→ Returns: { job_id: "abc123" }

job_status jobId="abc123"
→ Returns: { status: "completed", result: "<button>..." }
```

## Component ID Format

```
button--primary     # component--story
card--default       # component--story
button              # auto-resolves to default variant
```

## Example Workflows

**List and extract:**
```
list_components compact=true
get_component_html componentId="button" variantsOnly=true
get_component_html componentId="button--primary"
job_status jobId="..."
```

**Build with theme:**
```
get_theme_info
search_components purpose="form inputs"
get_component_html componentId="input--default"
```
