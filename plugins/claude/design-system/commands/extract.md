---
description: Extract HTML from a Storybook component
argument-hint: <component-id>
---

# /design:extract

Extract the rendered HTML from a specific component story.

## Usage

```
/design:extract <component-id>
```

Component ID format: `component-name--story-name` or just `component-name` (uses default variant).

## Examples

```
/design:extract button--primary
/design:extract card--default
/design:extract input
```

## What Happens

1. Calls `get_component_html` in async mode (returns job_id)
2. Polls `job_status` until complete
3. Returns the extracted HTML

Use `variantsOnly: true` to first see available variants.
