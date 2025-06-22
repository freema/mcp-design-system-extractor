import { parse } from 'node-html-parser';
import { StorybookIndex, ComponentHTML } from '../types/storybook.js';
import { Cache } from './cache.js';
import { PuppeteerClient } from './puppeteer-client.js';
import { extractStyles, extractClasses } from './html-css-parser.js';
import {
  createConnectionError,
  createNotFoundError,
  createTimeoutError,
} from './error-formatter.js';
import { OPERATION_TIMEOUTS, getEnvironmentTimeout } from './timeout-constants.js';

export class StorybookClient {
  private baseUrl: string;
  private cache: Cache;
  private puppeteerClient: PuppeteerClient | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.STORYBOOK_URL || 'http://localhost:6006';

    // Validate URL
    try {
      new URL(this.baseUrl);
    } catch (error) {
      throw new Error('STORYBOOK_URL must be a valid URL starting with http:// or https://');
    }

    if (!this.baseUrl.startsWith('http')) {
      throw new Error('STORYBOOK_URL must start with http:// or https://');
    }

    // Remove trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '');

    // Initialize cache
    this.cache = new Cache(300000); // 5 minutes
  }

  getStorybookUrl(): string {
    return this.baseUrl;
  }

  private async getPuppeteerClient(): Promise<PuppeteerClient> {
    if (!this.puppeteerClient) {
      this.puppeteerClient = new PuppeteerClient();
      await this.puppeteerClient.launch();
    }
    return this.puppeteerClient;
  }

  async close(): Promise<void> {
    if (this.puppeteerClient) {
      await this.puppeteerClient.close();
      this.puppeteerClient = null;
    }
  }

  async fetchStoriesIndex(): Promise<StorybookIndex> {
    const cacheKey = 'stories-index';
    const cached = this.cache.get<StorybookIndex>(cacheKey);
    if (cached) {
      return cached;
    }

    const urls = [`${this.baseUrl}/index.json`, `${this.baseUrl}/stories.json`];
    let lastError: Error | null = null;

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as StorybookIndex;
          this.cache.set(cacheKey, data);
          return data;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          lastError = new Error(`Request timeout while fetching ${url}`);
        } else {
          lastError = error;
        }
      }
    }

    throw new Error(
      `Failed to fetch Storybook index from ${this.baseUrl}. ${lastError?.message || 'Unknown error'}\n` +
        `Troubleshooting:\n` +
        `1. Make sure Storybook is running\n` +
        `2. Verify the URL is correct: ${this.baseUrl}\n` +
        `3. Check if CORS is properly configured\n` +
        `4. Try accessing ${this.baseUrl}/index.json directly in your browser`
    );
  }

  async fetchComponentHTML(storyId: string): Promise<ComponentHTML> {
    const cacheKey = `component-html-${storyId}`;
    const cached = this.cache.get<ComponentHTML>(cacheKey);
    if (cached) {
      return cached;
    }

    const timeoutMs = getEnvironmentTimeout(OPERATION_TIMEOUTS.fetchComponentHTML);

    try {
      // First, validate that the story ID exists in the stories index
      const storiesIndex = await this.fetchStoriesIndex();
      const stories = storiesIndex.stories || storiesIndex.entries || {};

      if (!stories[storyId]) {
        const notFoundError = createNotFoundError(
          'fetch component HTML',
          'story',
          'Use list_components or get_component_variants tools to find available stories',
          storyId
        );
        throw new Error(notFoundError.message);
      }

      const url = `${this.baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}`;

      // Try static HTML parsing first (faster)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const connectionError = createConnectionError(
          'fetch component HTML',
          url,
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
        throw new Error(connectionError.message);
      }

      const html = await response.text();

      // Parse with node-html-parser first to check for static content
      const root = parse(html);
      const storyRoot = root.querySelector('#storybook-root');

      if (
        storyRoot?.innerHTML.trim() &&
        !storyRoot.innerHTML.includes('sb-nopreview') &&
        !storyRoot.innerHTML.includes('No Preview')
      ) {
        // Static content found, use it
        const componentHTML = storyRoot.innerHTML;
        const styles = extractStyles(root);
        const classes = extractClasses(componentHTML);

        const result = {
          storyId,
          html: componentHTML,
          styles,
          classes,
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Static content not available, use Puppeteer for dynamic rendering
      const puppeteerClient = await this.getPuppeteerClient();
      const result = await puppeteerClient.fetchComponentHTML(url, storyId);

      this.cache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const timeoutError = createTimeoutError(
          'fetch component HTML',
          timeoutMs,
          `${this.baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}`,
          `story ${storyId}`
        );
        throw new Error(timeoutError.message);
      }
      // Re-throw formatted errors, wrap others
      if (
        error.message.includes('[CONNECTION_ERROR]') ||
        error.message.includes('[NOT_FOUND_ERROR]') ||
        error.message.includes('[TIMEOUT_ERROR]')
      ) {
        throw error;
      }
      const connectionError = createConnectionError(
        'fetch component HTML',
        `${this.baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}`,
        error
      );
      throw new Error(connectionError.message);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/iframe.html`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
