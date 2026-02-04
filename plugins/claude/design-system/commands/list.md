---
description: List components in the Storybook design system
argument-hint: [search-query]
---

# /design:list

List all components available in the Storybook design system.

## Usage

```
/design:list                    # All components
/design:list <query>            # Search by name
/design:list --category=<cat>   # Filter by category
```

## Examples

```
/design:list
/design:list button
/design:list --category=forms
/design:list input
```

## What Happens

Calls `list_components` with `compact: true` for minimal output, or `search_components` if a query is provided.
