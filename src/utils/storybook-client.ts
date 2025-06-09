import { parse } from 'node-html-parser';
import { Window } from 'happy-dom';
import { StorybookIndex, ComponentHTML } from '../types/storybook.js';

export class StorybookClient {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheDuration = 300000; // 5 minutes cache duration

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
    this.cache = new Map();
  }

  async fetchStoriesIndex(): Promise<StorybookIndex> {
    const cacheKey = 'stories-index';
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const urls = ['/index.json', '/stories.json'];
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (const url of urls) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(`${this.baseUrl}${url}`, {
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (response.ok) {
            const text = await response.text();

            if (!text || text.trim() === '') {
              continue;
            }

            let data;
            try {
              data = JSON.parse(text);
            } catch (parseError) {
              continue;
            }

            const storiesData = data.stories || data.entries;

            this.setCache(cacheKey, data);
            return data as StorybookIndex;
          }
        } catch (error: any) {
          // Skip error logging to avoid interfering with JSON-RPC

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
    }

    throw new Error(
      `Could not fetch stories index from ${this.baseUrl}.\n` +
        `Tried: ${urls.join(', ')}\n\n` +
        `Possible solutions:\n` +
        `1. Make sure Storybook is running (typically on port 6006)\n` +
        `2. Check if the URL is correct: ${this.baseUrl}\n` +
        `3. Verify that CORS is properly configured in your Storybook\n` +
        `4. Try accessing ${this.baseUrl}/index.json directly in your browser`
    );
  }

  async fetchComponentHTML(storyId: string): Promise<ComponentHTML> {
    const cacheKey = `component-html-${storyId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch story ${storyId}: ${response.status} ${response.statusText}`
        );
      }

      const html = await response.text();

      // Parse with node-html-parser first to check content
      const root = parse(html);

      // Check if content is already there (static HTML)
      const storyRoot = root.querySelector('#storybook-root') || root.querySelector('#root');
      if (storyRoot && storyRoot.innerHTML.trim()) {
        const componentHTML = storyRoot.innerHTML;
        const styles = this.extractStyles(root);
        const classes = this.extractClasses(componentHTML);

        const result = {
          storyId,
          html: componentHTML,
          styles,
          classes,
        };
        this.setCache(cacheKey, result);
        return result;
      }

      // If no static content, use Happy-DOM for dynamic content
      const window = new Window({
        url,
        settings: {
          enableFileSystemHttpRequests: false,
          disableJavaScriptFileLoading: false,
          disableJavaScriptEvaluation: false,
        },
      });

      try {
        window.document.write(html);

        // Wait for scripts to load and execute
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to find the story content
        const selectors = ['#storybook-root', '#storybook-docs', '#root'];
        let rootElement = null;

        for (const selector of selectors) {
          const element = window.document.querySelector(selector);
          if (element && element.innerHTML.trim()) {
            rootElement = element;
            break;
          }
        }

        if (!rootElement?.innerHTML.trim()) {
          // One more short wait
          await new Promise(resolve => setTimeout(resolve, 500));

          for (const selector of selectors) {
            const element = window.document.querySelector(selector);
            if (element && element.innerHTML.trim()) {
              rootElement = element;
              break;
            }
          }
        }

        if (!rootElement?.innerHTML.trim()) {
          throw new Error(`Could not find story content for ${storyId}`);
        }

        // Extract styles
        const styles: string[] = [];
        window.document.querySelectorAll('style').forEach((style: any) => {
          if (style.textContent) {
            styles.push(style.textContent);
          }
        });

        window.document.querySelectorAll('link[rel="stylesheet"]').forEach((link: any) => {
          const href = link.getAttribute('href');
          if (href) {
            styles.push(`/* External stylesheet: ${href} */`);
          }
        });

        const componentHTML = rootElement.innerHTML;
        const classes = this.extractClasses(componentHTML);

        const result = {
          storyId,
          html: componentHTML,
          styles,
          classes,
        };
        this.setCache(cacheKey, result);
        return result;
      } finally {
        window.close();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout while fetching component HTML for ${storyId}`);
      }
      throw new Error(
        `Failed to fetch component HTML for ${storyId}: ${error instanceof Error ? error.message : String(error)}`
      );
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

  getStorybookUrl(): string {
    return this.baseUrl;
  }

  private extractStyles(root: any): string[] {
    const styles: string[] = [];

    const styleElements = root.querySelectorAll('style');
    styleElements.forEach((style: any) => {
      if (style.innerHTML?.trim()) {
        styles.push(style.innerHTML.trim());
      }
    });

    const linkElements = root.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((link: any) => {
      const href = link.getAttribute('href');
      if (href) {
        styles.push(`/* External stylesheet: ${href} */`);
      }
    });

    return styles;
  }

  private extractClasses(html: string): string[] {
    const classRegex = /class="([^"]*)"/g;
    const classes = new Set<string>();

    let match;
    while ((match = classRegex.exec(html)) !== null) {
      if (match[1]) {
        const classNames = match[1].split(/\s+/).filter(Boolean);
        classNames.forEach(className => classes.add(className));
      }
    }

    return Array.from(classes).sort();
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }
    this.cache.delete(key); // Remove expired cache
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
