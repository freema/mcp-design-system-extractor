import { describe, it, expect } from 'vitest';

import { isRenderedStory } from '../../src/utils/puppeteer-client.js';

describe('isRenderedStory', () => {
  it('accepts a small rendered component', () => {
    // The regression that mattered: this is 76 characters, and the old
    // `length > 100` check rejected it. get_component_html then polled until
    // the caller's timeout fired, so buttons — and badges, chips, icons,
    // inputs, anything compact — could never be extracted at all.
    const button = '<button class="btn btn-primary" style="padding: 8px 16px;">Click me</button>';
    expect(button.length).toBeLessThan(100);
    expect(isRenderedStory(button)).toBe(true);
  });

  it('accepts markup far below the old threshold', () => {
    expect(isRenderedStory('<span class="badge">3</span>')).toBe(true);
    expect(isRenderedStory('<hr/>')).toBe(true);
  });

  it('accepts a large rendered component', () => {
    expect(isRenderedStory(`<div>${'x'.repeat(500)}</div>`)).toBe(true);
  });

  it('rejects empty or whitespace-only content', () => {
    expect(isRenderedStory('')).toBe(false);
    expect(isRenderedStory('   \n\t ')).toBe(false);
  });

  it("rejects Storybook's no-preview placeholder", () => {
    expect(isRenderedStory('<div class="sb-nopreview">...</div>')).toBe(false);
    expect(isRenderedStory('<div>No Preview</div>')).toBe(false);
  });

  it('rejects a placeholder even when it is long', () => {
    expect(isRenderedStory(`<div class="sb-nopreview">${'x'.repeat(500)}</div>`)).toBe(false);
  });
});
