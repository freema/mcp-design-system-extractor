# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases before 1.3.0 are described on the
[GitHub releases page](https://github.com/freema/mcp-design-system-extractor/releases).

## [1.3.0] - 2026-11-06

### Added

- Every tool now declares an `outputSchema` and returns matching
  `structuredContent`, so clients can consume results as data instead of
  re-parsing the JSON in the text block. The text block is unchanged.
  `list_components` and `search_components` wrap their array as
  `{ components, pagination }` in the structured payload, because
  `structuredContent` must be an object. ([#13])

### Changed

- **Node.js 22.12 or newer is now required** (`engines` was `>=20.0.0`).
  Puppeteer 25 declares `node >=22.12.0`, and Node 20 reached end of life in
  April 2026. CI now runs on Node 22 and 24, and the build targets Node 22.
- Failed tool calls now set `isError: true`. Previously a client would read the
  error text as a successful result. ([#13])
- Error messages always include the underlying cause on a `Details:` line.
  Before, it was only shown with `NODE_ENV=development`, and the generic
  category text on its own could point at the wrong problem. ([#12])
- `server.json` uses the current MCP Registry schema (`2025-12-11`).

### Fixed

- `parseCSSRules` leaked the `;` separator into every property name after the
  first, so `color: red; padding: 4px` produced a `"; padding"` key. ([#12])
- `get_theme_info` classified tokens by value before looking at their name, so
  `--breakpoint-md: 960px` and `--radius-sm: 2px` were both reported as
  spacing. Name-based rules now run first. ([#12])

### Security

- `@modelcontextprotocol/sdk` 1.29.0 → 1.32.2, `zod` 4.4.3 → 4.6.7
  ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)),
  `puppeteer` 25.3.0 → 25.16.0, `node-html-parser` 9.0.0 → 9.0.6.
- Transitive runtime dependencies refreshed, including `proxy-addr` 2.0.8
  ([GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h)),
  `body-parser`, `fast-uri`, `hono`, `qs` and `ip-address`.
  `npm audit --omit=dev` reports no known vulnerabilities.

### Internal

- Test coverage raised from about 5% to 87% of statements, with the thresholds
  in `vitest.config.ts` ratcheted to match. ([#12])
- npm releases are published from GitHub Actions through trusted publishing
  (OIDC), without a long-lived token. ([#14])
- Development tooling refreshed within its current major versions (TypeScript
  5.9, ESLint 10.14, typescript-eslint 8.72, Vitest 4.1.12, tsup 8.5.1,
  Prettier 3.9.10).

[1.3.0]: https://github.com/freema/mcp-design-system-extractor/compare/v1.2.0...v1.3.0
[#12]: https://github.com/freema/mcp-design-system-extractor/pull/12
[#13]: https://github.com/freema/mcp-design-system-extractor/pull/13
[#14]: https://github.com/freema/mcp-design-system-extractor/pull/14
