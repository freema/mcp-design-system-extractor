import { describe, it, expect, vi, afterEach } from 'vitest';

import { Cache } from '../../../src/utils/cache.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('Cache', () => {
  it('returns null for a key that was never set', () => {
    expect(new Cache().get('missing')).toBeNull();
  });

  it('round-trips a value', () => {
    const cache = new Cache();
    cache.set('stories-index', { entries: { 'button--primary': {} } });

    expect(cache.get<{ entries: Record<string, unknown> }>('stories-index')).toEqual({
      entries: { 'button--primary': {} },
    });
  });

  it('expires an entry once the duration has passed', () => {
    vi.useFakeTimers();
    const cache = new Cache(1000);
    cache.set('key', 'value');

    vi.advanceTimersByTime(999);
    expect(cache.get('key')).toBe('value');

    vi.advanceTimersByTime(2);
    expect(cache.get('key')).toBeNull();
  });

  it('drops the expired entry rather than keeping it around', () => {
    vi.useFakeTimers();
    const cache = new Cache(1000);
    cache.set('key', 'value');
    vi.advanceTimersByTime(1001);

    expect(cache.size()).toBe(1);
    cache.get('key');
    expect(cache.size()).toBe(0);
  });

  it('refreshes the timestamp when a key is set again', () => {
    vi.useFakeTimers();
    const cache = new Cache(1000);
    cache.set('key', 'first');

    vi.advanceTimersByTime(900);
    cache.set('key', 'second');
    vi.advanceTimersByTime(900);

    expect(cache.get('key')).toBe('second');
  });

  it('clears everything', () => {
    const cache = new Cache();
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size()).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeNull();
  });
});
