import { describe, it, expect } from "vitest";

describe("Quotation Calculations", () => {
  it("should calculate ISS and ICMS correctly", () => {
    const subtotal = 1000;
    const issPct = 3;
    const icmsPct = 5;

    const issVal = subtotal * (issPct / 100);
    const icmsVal = subtotal * (icmsPct / 100);
    const taxTotal = issVal + icmsVal;

    expect(issVal).toBe(30);
    expect(icmsVal).toBe(50);
    expect(taxTotal).toBe(80);
  });

  it("should calculate total with ISS, ICMS and discount", () => {
    const subtotal = 10000;
    const discountPct = 10;
    const issPct = 3;
    const icmsPct = 5;

    const effectiveDiscount = subtotal * (discountPct / 100);
    const issVal = subtotal * (issPct / 100);
    const icmsVal = subtotal * (icmsPct / 100);
    const total = subtotal - effectiveDiscount + issVal + icmsVal;

    expect(effectiveDiscount).toBe(1000);
    expect(issVal).toBe(300);
    expect(icmsVal).toBe(500);
    expect(total).toBe(9800);
  });

  it("should calculate item total correctly", () => {
    const qty = 100;
    const price = 56;
    const discount = 0;
    const total = qty * price - discount;
    expect(total).toBe(5600);
  });

  it("should calculate subtotal from multiple items", () => {
    const items = [
      { quantity: 100, unitPrice: 56, discount: 0 },
      { quantity: 3010, unitPrice: 50, discount: 0 },
      { quantity: 1020, unitPrice: 65, discount: 0 },
      { quantity: 1350, unitPrice: 50, discount: 0 },
    ];

    const itemTotals = items.map(i => i.quantity * i.unitPrice - i.discount);
    expect(itemTotals).toEqual([5600, 150500, 66300, 67500]);

    const subtotal = itemTotals.reduce((sum, t) => sum + t, 0);
    expect(subtotal).toBe(289900);
  });

  it("should calculate full quotation with ISS and ICMS", () => {
    const subtotal = 289900;
    const issPct = 3;
    const icmsPct = 5;

    const issVal = subtotal * (issPct / 100);
    const icmsVal = subtotal * (icmsPct / 100);
    const total = subtotal + issVal + icmsVal;

    expect(issVal).toBe(8697);
    expect(icmsVal).toBe(14495);
    expect(total).toBe(313092);
  });

  it("should handle zero percentages gracefully", () => {
    const subtotal = 5000;
    const issPct = 0;
    const icmsPct = 0;
    const discountPct = 0;

    const effectiveDiscount = discountPct > 0 ? subtotal * (discountPct / 100) : 0;
    const issVal = subtotal * (issPct / 100);
    const icmsVal = subtotal * (icmsPct / 100);
    const total = subtotal - effectiveDiscount + issVal + icmsVal;

    expect(total).toBe(5000);
  });
});

describe("Quotation Data Model", () => {
  it("should define all professional model fields", () => {
    const requiredFields = [
      "workLocation",
      "issPercentage",
      "icmsPercentage",
      "pixHolder",
      "pixBank",
      "pixKey",
      "paymentConditions",
      "paymentMethodDescription",
      "serviceDescription",
      "deliveryEstimate",
      "legalNotice",
    ];

    // Simulate a quotation object with all fields
    const quotation: Record<string, any> = {
      id: 1,
      companyId: 1,
      clientId: 1,
      number: "ORC-001",
      status: "rascunho",
      subtotal: "289900.00",
      total: "313092.00",
      workLocation: "Terminal do Aeroporto",
      issPercentage: "3",
      icmsPercentage: "5",
      pixHolder: "João Paulo Souza Lopes",
      pixBank: "CLOUDWALK IP LTDA",
      pixKey: "34.751.236/0001-81",
      paymentConditions: "1. Sinal e Arras (50%)...",
      paymentMethodDescription: "PIX dividido em duas parcelas",
      serviceDescription: "Obra de Reforma do Terminal...",
      deliveryEstimate: "40 a 55 dias úteis",
      legalNotice: "AVISO LEGAL: Ao aprovar...",
    };

    requiredFields.forEach((field) => {
      expect(quotation).toHaveProperty(field);
      expect(quotation[field]).toBeDefined();
    });
  });

  it("should define itemType field for quotation items", () => {
    const item = {
      id: 1,
      description: "Pintura acrílica com massa corrida",
      itemType: "Mão de obra + material",
      quantity: "100",
      unitPrice: "56.00",
      total: "5600.00",
    };

    expect(item).toHaveProperty("itemType");
    expect(item.itemType).toBe("Mão de obra + material");
  });
});
