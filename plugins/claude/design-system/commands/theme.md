---
description: Get design system theme (colors, spacing, typography)
argument-hint: [section]
---

# /design:theme

Extract design tokens and theme information from the design system.

## Usage

```
/design:theme                # Full theme
/design:theme <section>      # Specific section
```

## Examples

```
/design:theme
/design:theme colors
/design:theme spacing
/design:theme typography
```

## What Happens

Calls `get_theme_info` to extract CSS custom properties and design tokens including colors, spacing, typography, and breakpoints.
