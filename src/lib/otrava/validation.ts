const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return null;
}

export function validateCustomer(input: {
  name: string;
  email: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "Customer name is required.";
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  return errors;
}

export function validateCatalogueItem(input: {
  name: string;
  price: number;
  taxRate: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "Item name is required.";
  if (!Number.isFinite(input.price) || input.price < 0) {
    errors.price = "Price cannot be negative.";
  }
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 100) {
    errors.taxRate = "Tax rate must be between 0 and 100.";
  }
  return errors;
}

export function validateDocument(input: {
  customerId: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  date: string;
  secondDate: string;
  secondDateLabel: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.customerId) errors.customerId = "Select a customer.";
  if (!input.items.length) errors.items = "Add at least one line item.";
  input.items.forEach((item, i) => {
    if (!item.description.trim()) {
      errors[`item-${i}-description`] = "Description is required.";
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors[`item-${i}-quantity`] = "Quantity must be greater than 0.";
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      errors[`item-${i}-unitPrice`] = "Price cannot be negative.";
    }
  });
  if (input.date && input.secondDate && input.secondDate < input.date) {
    errors.secondDate = `${input.secondDateLabel} should not be before the document date.`;
  }
  return errors;
}

export function validatePayment(input: {
  amount: number;
  maxAmount: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = "Payment amount must be greater than 0.";
  } else if (input.amount - input.maxAmount > 0.001) {
    errors.amount = "Payment cannot exceed the outstanding balance.";
  }
  return errors;
}
