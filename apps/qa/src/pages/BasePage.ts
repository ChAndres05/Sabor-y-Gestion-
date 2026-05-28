import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model containing shared utilities and assertions
 */
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to a path relative to the baseURL
   */
  async navigateTo(path: string = '/') {
    await this.page.goto(path);
  }

  /**
   * Helper to wait for an element to be visible
   */
  async waitForVisible(selector: string | Locator) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toBeVisible({ timeout: 5000 });
    return locator;
  }

  /**
   * Safely fill an input field
   */
  async fillField(selector: string | Locator, value: string) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await this.waitForVisible(locator);
    await locator.fill(value);
  }

  /**
   * Safely click an element
   */
  async clickElement(selector: string | Locator) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await this.waitForVisible(locator);
    await locator.click();
  }

  /**
   * Validate page title or page URL contains string
   */
  async verifyUrlContains(substring: string) {
    await this.page.waitForURL(new RegExp(substring), { timeout: 5000 });
    expect(this.page.url()).toContain(substring);
  }

  /**
   * Take a manual screenshot for QA report logging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}-${Date.now()}.png` });
  }
}
