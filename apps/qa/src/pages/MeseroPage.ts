import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page Object Model for the Waiter (Mesero) Interface
 */
export class MeseroPage extends BasePage {
  // Selectors
  private readonly tableGrid: Locator;
  private readonly orderItemInput: Locator;
  private readonly observationsInput: Locator;
  private readonly addProductButton: Locator;
  private readonly confirmOrderButton: Locator;
  private readonly cancelOrderButton: Locator;
  private readonly validationErrorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.tableGrid = this.page.locator('[data-testid="table-grid"], .tables-container');
    this.orderItemInput = this.page.locator('input[placeholder*="Buscar producto"], .product-search-input');
    this.observationsInput = this.page.locator('input[name="observations"], textarea[name="observations"], [data-testid="observations-input"]');
    this.addProductButton = this.page.locator('button:has-text("Agregar"), [data-testid="add-product-btn"]');
    this.confirmOrderButton = this.page.locator('button:has-text("Enviar Pedido"), button:has-text("Confirmar Pedido"), [data-testid="submit-order-btn"]');
    this.cancelOrderButton = this.page.locator('button:has-text("Cancelar pedido"), [data-testid="cancel-order-btn"]');
    this.validationErrorAlert = this.page.locator('.text-red-500, .validation-error, [role="alert"]');
  }

  /**
   * Selects a table in the grid
   */
  async selectTable(tableName: string) {
    const tableLocator = this.page.locator(`text=${tableName}`).first();
    await this.clickElement(tableLocator);
  }

  /**
   * Adds a product to the order with observations
   */
  async addProductWithObservations(productName: string, observations: string) {
    // Search or select product
    await this.fillField(this.orderItemInput, productName);
    // Select from auto-suggest list if present
    const suggestion = this.page.locator(`.product-suggestion:has-text("${productName}")`).first();
    if (await suggestion.isVisible()) {
      await suggestion.click();
    }
    
    // Fill observations field
    await this.fillField(this.observationsInput, observations);
    
    // Add product to cart/order list
    await this.clickElement(this.addProductButton);
  }

  /**
   * Verifies if observations input rejects numbers/invalid text (custom input validation rule check)
   */
  async verifyObservationsValidationErrorVisible() {
    await this.waitForVisible(this.validationErrorAlert);
    const text = await this.validationErrorAlert.textContent();
    expect(text?.toLowerCase()).toContain('solo'); // E.g., "solo se permiten letras"
  }

  /**
   * Triggers the submission of the order to the kitchen
   */
  async submitOrder() {
    await this.clickElement(this.confirmOrderButton);
  }

  /**
   * Cancels the active order (uses the cancel order button)
   */
  async cancelOrder() {
    await this.clickElement(this.cancelOrderButton);
    // Confirm modal if prompted
    const confirmModalBtn = this.page.locator('button:has-text("Sí, cancelar"), .confirm-modal-btn');
    if (await confirmModalBtn.isVisible()) {
      await confirmModalBtn.click();
    }
  }
}
