import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page Object Model for the Authentication / Login Page
 */
export class LoginPage extends BasePage {
  // Selectors/Locators using unique attributes or standard roles
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;
  private readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    // Best practice: target elements by test-ids, roles, or stable selectors
    this.emailInput = this.page.locator('input[type="email"], #email, [data-testid="email-input"]');
    this.passwordInput = this.page.locator('input[type="password"], #password, [data-testid="password-input"]');
    this.submitButton = this.page.locator('button[type="submit"], [data-testid="submit-button"]');
    this.errorMessage = this.page.locator('.text-red-500, .alert-error, [role="alert"]');
    this.logoutButton = this.page.locator('button:has-text("Cerrar Sesión"), button:has-text("Salir"), [data-testid="logout-btn"]');
  }

  /**
   * Navigates to the login screen
   */
  async goToLogin() {
    await this.navigateTo('/auth/login');
  }

  /**
   * Executes the full login workflow
   */
  async login(email: string, pass: string) {
    await this.fillField(this.emailInput, email);
    await this.fillField(this.passwordInput, pass);
    await this.clickElement(this.submitButton);
  }

  /**
   * Asserts that the login failed and displays an error message
   */
  async getErrorMessageText(): Promise<string> {
    await this.waitForVisible(this.errorMessage);
    return (await this.errorMessage.textContent()) || '';
  }

  /**
   * Performs logout action if logged in
   */
  async logout() {
    if (await this.logoutButton.isVisible()) {
      await this.clickElement(this.logoutButton);
    }
  }
}
