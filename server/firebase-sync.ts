import {
  syncToFirebase,
  updateFirebase,
  deleteFromFirebase,
} from "./firebase-admin";
import type { Company, Client, Product, Professional } from "../drizzle/schema";

/**
 * Sincroniza uma empresa para o Firebase
 */
export async function syncCompanyToFirebase(company: Company): Promise<void> {
  try {
    const path = `companies/${company.id}`;
    await syncToFirebase(path, {
      id: company.id,
      userId: company.userId,
      name: company.name,
      document: company.document,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      zipCode: company.zipCode,
      logoUrl: company.logoUrl,
      logoStorageKey: company.logoStorageKey,
      currency: company.currency,
      language: company.language,
      taxRegime: company.taxRegime,
      createdAt: company.createdAt?.getTime(),
      updatedAt: company.updatedAt?.getTime(),
    });
  } catch (error) {
    console.error("[Firebase Sync] Error syncing company:", error);
    // Não lançar erro para não interromper o fluxo principal
  }
}

/**
 * Sincroniza um cliente para o Firebase
 */
export async function syncClientToFirebase(client: Client): Promise<void> {
  try {
    const path = `companies/${client.companyId}/clients/${client.id}`;
    await syncToFirebase(path, {
      id: client.id,
      name: client.name,
      document: client.document,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      state: client.state,
      zipCode: client.zipCode,
      notes: client.notes,
      companyId: client.companyId,
      createdAt: client.createdAt?.getTime(),
      updatedAt: client.updatedAt?.getTime(),
    });
  } catch (error) {
    console.error("[Firebase Sync] Error syncing client:", error);
  }
}

/**
 * Sincroniza um produto para o Firebase
 */
export async function syncProductToFirebase(product: Product): Promise<void> {
  try {
    const path = `companies/${product.companyId}/products/${product.id}`;
    await syncToFirebase(path, {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      price: product.price,
      unit: product.unit,
      stock: product.stock,
      companyId: product.companyId,
      createdAt: product.createdAt?.getTime(),
      updatedAt: product.updatedAt?.getTime(),
    });
  } catch (error) {
    console.error("[Firebase Sync] Error syncing product:", error);
  }
}

/**
 * Sincroniza um profissional para o Firebase
 */
export async function syncProfessionalToFirebase(
  professional: Professional
): Promise<void> {
  try {
    const path = `companies/${professional.companyId}/professionals/${professional.id}`;
    await syncToFirebase(path, {
      id: professional.id,
      name: professional.name,
      role: professional.role,
      hourlyRate: professional.hourlyRate,
      dailyRate: professional.dailyRate,
      commissionPercentage: professional.commissionPercentage,
      companyId: professional.companyId,
      createdAt: professional.createdAt?.getTime(),
      updatedAt: professional.updatedAt?.getTime(),
    });
  } catch (error) {
    console.error("[Firebase Sync] Error syncing professional:", error);
  }
}

/**
 * Atualiza dados de uma empresa no Firebase
 */
export async function updateCompanyInFirebase(
  companyId: number,
  updates: Record<string, unknown>
): Promise<void> {
  try {
    const path = `companies/${companyId}`;
    const data: Record<string, unknown> = {};

    if (updates.name) data.name = updates.name;
    if (updates.email) data.email = updates.email;
    if (updates.phone) data.phone = updates.phone;
    if (updates.logo) data.logo = updates.logo;
    if (updates.theme) data.theme = updates.theme;
    if (updates.template) data.template = updates.template;
    if (updates.updatedAt && typeof updates.updatedAt === 'object' && 'getTime' in updates.updatedAt) {
      data.updatedAt = (updates.updatedAt as Date).getTime();
    }

    if (Object.keys(data).length > 0) {
      await updateFirebase(path, data);
    }
  } catch (error) {
    console.error("[Firebase Sync] Error updating company:", error);
  }
}

/**
 * Deleta uma empresa do Firebase
 */
export async function deleteCompanyFromFirebase(companyId: number): Promise<void> {
  try {
    const path = `companies/${companyId}`;
    await deleteFromFirebase(path);
  } catch (error) {
    console.error("[Firebase Sync] Error deleting company:", error);
  }
}

/**
 * Deleta um cliente do Firebase
 */
export async function deleteClientFromFirebase(
  companyId: number,
  clientId: number
): Promise<void> {
  try {
    const path = `companies/${companyId}/clients/${clientId}`;
    await deleteFromFirebase(path);
  } catch (error) {
    console.error("[Firebase Sync] Error deleting client:", error);
  }
}

/**
 * Deleta um produto do Firebase
 */
export async function deleteProductFromFirebase(
  companyId: number,
  productId: number
): Promise<void> {
  try {
    const path = `companies/${companyId}/products/${productId}`;
    await deleteFromFirebase(path);
  } catch (error) {
    console.error("[Firebase Sync] Error deleting product:", error);
  }
}

/**
 * Deleta um profissional do Firebase
 */
export async function deleteProfessionalFromFirebase(
  companyId: number,
  professionalId: number
): Promise<void> {
  try {
    const path = `companies/${companyId}/professionals/${professionalId}`;
    await deleteFromFirebase(path);
  } catch (error) {
    console.error("[Firebase Sync] Error deleting professional:", error);
  }
}
