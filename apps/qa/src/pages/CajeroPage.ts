import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page Object Model for the Cashier (Cajero) Interface
 */
export class CajeroPage extends BasePage {
  // Selectors
  private readonly billingMenuOption: Locator;
  private readonly openRegisterOption: Locator;
  private readonly closeRegisterOption: Locator;
  private readonly registerAmountInput: Locator;
  private readonly submitRegisterAction: Locator;
  private readonly warningMessageAlert: Locator;
  private readonly tableCard: Locator;
  private readonly payButton: Locator;
  private readonly receiptModal: Locator;

  constructor(page: Page) {
    super(page);
    this.billingMenuOption = this.page.locator('text=Facturación, [data-testid="billing-nav-item"]');
    this.openRegisterOption = this.page.locator('text=Abrir Caja, [data-testid="open-register-btn"]');
    this.closeRegisterOption = this.page.locator('text=Cerrar Caja, [data-testid="close-register-btn"]');
    this.registerAmountInput = this.page.locator('input[name="initialAmount"], input[name="amount"], [data-testid="register-amount-input"]');
    this.submitRegisterAction = this.page.locator('button:has-text("Confirmar"), [data-testid="confirm-register-btn"]');
    this.warningMessageAlert = this.page.locator('.alert-warning, .toast-warning, [role="alert"]');
    this.tableCard = this.page.locator('.table-billing-card, [data-testid^="table-card-"]');
    this.payButton = this.page.locator('button:has-text("Cobrar"), button:has-text("Pagar"), [data-testid="process-payment-btn"]');
    this.receiptModal = this.page.locator('.receipt-modal, [data-testid="receipt-modal"]');
  }

  /**
   * Navigates to the Billing section using the navigation menu
   */
  async navigateToBilling() {
    await this.clickElement(this.billingMenuOption);
  }

  /**
   * Navigates to the "Open Register" option and opens it with an initial amount
   */
  async openCashRegister(amount: string) {
    await this.navigateToBilling();
    await this.clickElement(this.openRegisterOption);
    await this.fillField(this.registerAmountInput, amount);
    await this.clickElement(this.submitRegisterAction);
  }

  /**
   * Attempts to close the cash register
   */
  async closeCashRegister() {
    await this.navigateToBilling();
    await this.clickElement(this.closeRegisterOption);
  }

  /**
   * Verifies the error message showing that the cash register session cannot be closed without being opened
   */
  async verifyNoActiveSessionWarning() {
    await this.waitForVisible(this.warningMessageAlert);
    const text = await this.warningMessageAlert.textContent();
    expect(text?.toLowerCase()).toContain('no activa'); // e.g. "No hay una sesión de caja activa"
  }

  /**
   * Completes checkout/billing for a specific active table order
   */
  async processBillingForTable(tableName: string) {
    const targetTableCard = this.tableCard.filter({ hasText: tableName });
    await targetTableCard.locator('button:has-text("Facturar"), .billing-action-btn').click();
    
    // Complete the payment flow
    await this.clickElement(this.payButton);
    await this.waitForVisible(this.receiptModal);
  }
}
