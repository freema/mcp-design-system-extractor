import { describe, it, expect } from 'vitest';

import { applyPagination, formatPaginationMessage } from '../../../src/utils/pagination.js';

const items = (n: number) => Array.from({ length: n }, (_, i) => `item-${i + 1}`);

describe('applyPagination', () => {
  it('defaults to page 1 with 20 items per page', () => {
    const result = applyPagination(items(50), {});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toBe('item-1');
    expect(result.items[19]).toBe('item-20');
    expect(result.totalItems).toBe(50);
    expect(result.totalPages).toBe(3);
  });

  it('slices the requested page', () => {
    const result = applyPagination(items(50), { page: 2, pageSize: 10 });

    expect(result.items).toEqual(items(50).slice(10, 20));
    expect(result.startIndex).toBe(10);
    expect(result.endIndex).toBe(20);
  });

  it('returns a short last page rather than padding it', () => {
    const result = applyPagination(items(25), { page: 3, pageSize: 10 });

    expect(result.items).toEqual(['item-21', 'item-22', 'item-23', 'item-24', 'item-25']);
    expect(result.endIndex).toBe(25);
    expect(result.totalPages).toBe(3);
  });

  it('rejects a page past the end and names the valid range', () => {
    expect(() => applyPagination(items(25), { page: 4, pageSize: 10 })).toThrowError(
      'Page 4 exceeds total pages (3). Please use a page number between 1 and 3.'
    );
  });

  it('allows page 1 of an empty list instead of throwing', () => {
    // totalPages is 0 here, so the bounds check would reject every page. An
    // empty result set is a normal answer — a Storybook with no matches for a
    // filter — not a caller error.
    const result = applyPagination([], { page: 1 });

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('handles a page size larger than the collection', () => {
    const result = applyPagination(items(3), { pageSize: 100 });

    expect(result.items).toHaveLength(3);
    expect(result.totalPages).toBe(1);
    expect(result.endIndex).toBe(3);
  });
});

describe('formatPaginationMessage', () => {
  it('summarises a page without a suffix', () => {
    const result = applyPagination(items(50), { page: 2, pageSize: 20 });

    expect(formatPaginationMessage(result, 'Found')).toBe(
      'Found 50 items (showing page 2/3 20 items)'
    );
  });

  it('appends the caller suffix', () => {
    const result = applyPagination(items(5), {});

    expect(formatPaginationMessage(result, 'Found', 'filter: none')).toBe(
      'Found 5 items, (showing page 1/1, 5 items, filter: none)'
    );
  });
});
