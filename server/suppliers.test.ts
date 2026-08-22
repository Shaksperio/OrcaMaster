import { describe, expect, it } from "vitest";
import { suppliers } from "../drizzle/schema";

describe("Modelo de fornecedores", () => {
  it("expõe as colunas usadas pelo CRUD", () => {
    const columns = Object.keys(suppliers);
    expect(columns).toEqual(expect.arrayContaining([
      "id",
      "companyId",
      "name",
      "document",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "zipCode",
    ]));
  });

  it("mantém o nome como único campo obrigatório do cadastro além da empresa", () => {
    expect(suppliers.name.config.notNull).toBe(true);
    expect(suppliers.companyId.config.notNull).toBe(true);
    expect(suppliers.email.config.notNull).not.toBe(true);
    expect(suppliers.phone.config.notNull).not.toBe(true);
  });
});
