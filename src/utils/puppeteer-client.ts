import puppeteer, { Browser, Page } from 'puppeteer';
import { ComponentHTML } from '../types/storybook.js';

export class PuppeteerClient {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launch(): Promise<void> {
    if (this.browser) {
      return; // Already launched
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-zygote',
        '--single-process',
      ],
    });

    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(30000);
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async fetchComponentHTML(url: string, storyId: string): Promise<ComponentHTML> {
    if (!this.page) {
      throw new Error('PuppeteerClient not launched. Call launch() first.');
    }

    try {
      // Navigate to the page
      await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Progressive waiting for #storybook-root content
      let attempts = 0;
      const maxAttempts = 15;
      let finalContent = null;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));

        const rootElement = await this.page.$('#storybook-root');
        if (!rootElement) {
          continue;
        }

        const content = await this.page.$eval('#storybook-root', el => el.innerHTML);
        const contentLength = content.trim().length;
        const hasNoPreview = content.includes('sb-nopreview') || content.includes('No Preview');
        const isValidContent = contentLength > 100 && !hasNoPreview;

        if (isValidContent) {
          finalContent = content;
          break;
        }
      }

      if (!finalContent) {
        throw new Error(
          `Could not load story content for ${storyId} after ${attempts} attempts. The story may be misconfigured or still loading.`
        );
      }

      // Extract styles
      const styles = await this.page.$$eval('style', elements =>
        elements.map(el => el.textContent).filter(Boolean)
      );

      // Add external stylesheets info
      const externalStyles = await this.page.$$eval('link[rel="stylesheet"]', elements =>
        elements.map(el => `/* External stylesheet: ${el.getAttribute('href')} */`)
      );

      const allStyles = [...styles, ...externalStyles];

      // Extract CSS classes
      const classes = await this.page.$eval('#storybook-root', el => {
        const allElements = el.querySelectorAll('*');
        const classSet = new Set<string>();
        allElements.forEach((elem: any) => {
          if (elem.className && typeof elem.className === 'string') {
            elem.className.split(' ').forEach((cls: string) => {
              const trimmed = cls.trim();
              if (trimmed) {
                classSet.add(trimmed);
              }
            });
          }
        });
        return Array.from(classSet);
      });

      return {
        storyId,
        html: finalContent,
        styles: allStyles,
        classes,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to fetch component HTML for ${storyId} using Puppeteer: ${error.message}`
      );
    }
  }
}
