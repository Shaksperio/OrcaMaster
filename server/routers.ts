import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { syncToFirebase } from "./firebase-sync";
import { searchLeroyMerlin, searchAcalHomeCenter, searchSinapi } from "./external-search";
import { answerCompanyAssistant } from "./ai-assistant";
import { getAssistantActionPolicy, prepareAssistantAction, confirmAssistantAction } from "./assistant-actions";
import { eq, and } from "drizzle-orm";
import { companyMembers, companies } from "../drizzle/schema";

// Helper to check user access to company
async function checkCompanyAccess(userId: number, companyId: number) {
  const company = await db.getCompanyById(companyId);
  if (!company) throw new TRPCError({ code: "NOT_FOUND" });
  
  const isOwner = company.userId === userId;
  const member = await db.getUserCompanyRole(userId, companyId);
  
  if (!isOwner && !member) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  
  return { company, isOwner, member };
}

// Helper to check role permission
function checkRolePermission(role: string | undefined, isOwner: boolean, requiredRoles: string[]) {
  if (isOwner) return true;
  if (!role) return false;
  return requiredRoles.includes(role);
}

async function saveDocumentVersion(documentType: "quotation" | "invoice", documentId: number, changedBy: number, changeReason: string) {
  const document = documentType === "quotation"
    ? await db.getQuotationById(documentId)
    : await db.getInvoiceById(documentId);
  if (!document) throw new TRPCError({ code: "NOT_FOUND" });
  const items = documentType === "quotation"
    ? await db.getQuotationItems(documentId)
    : await db.getInvoiceItems(documentId);
  const versionNumber = await db.getNextDocumentVersionNumber(documentType, documentId);
  const snapshot = JSON.parse(JSON.stringify({ ...document, items }));
  await db.createDocumentVersion({
    documentType,
    documentId,
    versionNumber,
    data: snapshot,
    changedBy,
    changeReason,
  });
}

export const appRouter = router({
  ai: router({
    assistant: protectedProcedure
      .input(z.object({
        companyId: z.number().int().positive(),
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1).max(4000),
        })).min(1).max(12),
      }))
      .mutation(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        try {
          return await answerCompanyAssistant(input.companyId, input.messages);
        } catch (error) {
          console.error("[AI Assistant] Failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível obter uma resposta do assistente agora." });
        }
      }),
    prepareAction: protectedProcedure
      .input(z.object({
        companyId: z.number().int().positive(),
        action: z.enum(["product.create", "product.update", "product.delete", "supplier.create", "supplier.update", "supplier.delete", "quotation.updateStatus", "quotation.delete", "invoice.updateStatus", "invoice.delete", "expense.updateStatus", "expense.delete", "company.update"]),
        payload: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ input, ctx }) => {
        const access = await checkCompanyAccess(ctx.user.id, input.companyId);
        const policy = getAssistantActionPolicy(input.action);
        if (!access.isOwner || !policy.roles.includes("owner")) throw new TRPCError({ code: "FORBIDDEN", message: `Ação ${policy.category} disponível somente ao proprietário.` });
        try {
          return await prepareAssistantAction(input.companyId, ctx.user.id, input.action, input.payload);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Ação não permitida." });
        }
      }),
    confirmAction: protectedProcedure
      .input(z.object({ companyId: z.number().int().positive(), confirmationToken: z.string().length(64) }))
      .mutation(async ({ input, ctx }) => {
        const access = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!access.isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o proprietário pode confirmar ações do Assistente." });
        try {
          return await confirmAssistantAction(input.companyId, ctx.user.id, input.confirmationToken);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível confirmar a ação." });
        }
      }),
    priceSuggestion: protectedProcedure
      .input(z.object({ companyId: z.number().int().positive(), productId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        const product = await db.getProductById(input.productId);
        if (!product || product.companyId !== input.companyId) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado nesta empresa." });
        const rows = await db.getCompanyQuotationItems(input.companyId);
        const values = rows.filter(({ item }) => item.productId === input.productId && Number(item.unitPrice) > 0).map(({ item }) => Number(item.unitPrice)).sort((a, b) => a - b);
        if (!values.length) return null;
        const middle = Math.floor(values.length / 2);
        const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
        const confidence = Math.min(1, 0.5 + values.length / 20);
        const saved = await db.createPriceSuggestion({ companyId: input.companyId, productId: input.productId, suggestedPrice: median.toFixed(2), basedOnQuotations: values.length, confidence: confidence.toFixed(2) });
        return { id: Number(saved.id), productId: input.productId, suggestedPrice: median.toFixed(2), basedOnQuotations: values.length, confidence: confidence.toFixed(2), source: "itens reais de orçamentos" };
      }),
    quotationPatterns: protectedProcedure
      .input(z.object({ companyId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        const quotations = await db.getCompanyQuotations(input.companyId);
        const byStatus = quotations.reduce<Record<string, { count: number; total: number }>>((acc, quotation: any) => { const status = String(quotation.status); acc[status] ||= { count: 0, total: 0 }; acc[status].count += 1; acc[status].total += Number(quotation.total || 0); return acc; }, {});
        const total = quotations.reduce((sum: number, quotation: any) => sum + Number(quotation.total || 0), 0);
        return { totalQuotations: quotations.length, totalValue: total.toFixed(2), averageValue: quotations.length ? (total / quotations.length).toFixed(2) : "0.00", byStatus, source: "orçamentos reais da empresa" };
      }),
  }),

  publicDocuments: router({
    validate: publicProcedure.input(z.object({ number: z.string().trim().min(1).max(80) })).query(async ({ input, ctx }) => {
      const document = await db.getPublicDocumentByNumber(input.number);
      if (!document) return null;
      const forwarded = ctx.req.headers["x-forwarded-for"];
      const ipAddress = typeof forwarded === "string" ? forwarded.split(",")[0].trim().slice(0, 45) : (ctx.req.ip || null);
      await db.createQRCodeValidation({ documentType: document.documentType, documentId: document.id, ipAddress, userAgent: ctx.req.headers["user-agent"] || null });
      return { documentType: document.documentType, number: document.number, status: document.status, total: document.total, createdAt: document.createdAt, companyName: document.companyName };
    }),
  }),

  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Company procedures
  company: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Get companies where user is owner
      const ownedCompanies = await db.getUserCompanies(ctx.user.id);
      
      // Get companies where user is a member
      const dbInstance = await db.getDb();
      if (!dbInstance) return ownedCompanies;
      
      const memberCompanies = await dbInstance
        .select({ company: companies })
        .from(companyMembers)
        .innerJoin(companies, eq(companyMembers.companyId, companies.id))
        .where(eq(companyMembers.userId, ctx.user.id));
      
      const memberCompanyList = memberCompanies.map(mc => mc.company);
      
      // Combine and deduplicate
      const allCompanies = [...ownedCompanies, ...memberCompanyList];
      const uniqueCompanies = Array.from(
        new Map(allCompanies.map(c => [c.id, c])).values()
      );
      
      return uniqueCompanies;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.id);
        return db.getCompanyById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        document: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        currency: z.string().default("BRL"),
        language: z.string().default("pt-BR"),
        taxRegime: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const company = await db.createCompany({
          userId: ctx.user.id,
          ...input,
        });
        // Sync to Firebase
        const companyId = (company as any).insertId || (company as any).id;
        if (companyId) syncToFirebase("company", companyId, { ...input, userId: ctx.user.id, id: companyId });
        return company;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        document: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        currency: z.string().optional(),
        language: z.string().optional(),
        taxRegime: z.string().optional(),
        logoUrl: z.string().optional(),
        logoStorageKey: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { company, isOwner } = await checkCompanyAccess(ctx.user.id, input.id);
        if (!isOwner) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { id, ...updateData } = input;
        await db.updateCompany(id, updateData);
        const updated = await db.getCompanyById(id);
        // Sync to Firebase
        if (updated) syncToFirebase("company", id, updated);
        return updated;
      }),

    addMember: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        userId: z.number(),
        role: z.enum(["admin", "gerente", "colaborador"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const { company, isOwner } = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!isOwner) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await dbInstance.insert(companyMembers).values(input);
        return { success: true };
      }),

    getMembers: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanyMembers(input.companyId);
      }),
  }),

  // Client procedures
  customers: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanyClients(input.companyId);
      }),

    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        document: z.string().optional(),
        email: z.union([z.string().email(), z.literal("")]).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);
        // Colaboradores podem criar clientes
        const client = await db.createClient(input);
        // Sync to Firebase
        const clientId = (client as any).insertId || (client as any).id;
        if (clientId) syncToFirebase("client", clientId, input, { companyId: input.companyId });
        return client;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        companyId: z.number(),
        name: z.string().min(1),
        document: z.string().optional(),
        email: z.union([z.string().email(), z.literal("")]).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        const existing = await db.getClientById(input.id);
        if (!existing || existing.companyId !== input.companyId) throw new TRPCError({ code: "NOT_FOUND" });
        const { id: _id, companyId: _companyId, ...changes } = input;
        const updated = await db.updateClient(input.id, changes);
        if (updated) syncToFirebase("client", input.id, { ...updated }, { companyId: input.companyId });
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), companyId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        const existing = await db.getClientById(input.id);
        if (!existing || existing.companyId !== input.companyId) throw new TRPCError({ code: "NOT_FOUND" });
        await db.deleteClient(input.id);
        syncToFirebase("client", input.id, null, { companyId: input.companyId });
        return { id: input.id };
      }),
  }),

  // Product procedures
  products: router({
    searchLeroy: protectedProcedure
      .input(z.object({ companyId: z.number(), searchTerm: z.string().min(3) }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return searchLeroyMerlin(input.searchTerm);
      }),

    searchAcal: protectedProcedure
      .input(z.object({ companyId: z.number(), searchTerm: z.string().min(3) }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return searchAcalHomeCenter(input.searchTerm);
      }),

    searchSinapi: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        searchTerm: z.string().min(3),
        category: z.enum(["pintura", "impermeabilizacao"]).optional(),
      }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return searchSinapi(input.searchTerm, input.category);
      }),

    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanyProducts(input.companyId);
      }),

    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        sku: z.string().optional(),
        category: z.string().optional(),
        price: z.string().or(z.number()),
        unit: z.string().optional(),
        stock: z.number().optional(),
        sourceType: z.enum(["manual", "external"]).optional(),
        externalSource: z.string().optional(),
        externalSku: z.string().optional(),
        externalUrl: z.string().url().optional(),
        externalStatus: z.string().optional(),
        syncEnabled: z.boolean().optional(),
        priceSource: z.enum(["manual", "external"]).optional(),
        externalPrice: z.string().or(z.number()).optional(),
        lastSyncedAt: z.coerce.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);
        // Apenas admin e gerente podem criar produtos
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const price = typeof input.price === "string" ? parseFloat(input.price) : input.price;
        const externalPrice = input.externalPrice === undefined
          ? undefined
          : typeof input.externalPrice === "string" ? parseFloat(input.externalPrice) : input.externalPrice;
        const product = await db.createProduct({
          companyId: input.companyId,
          name: input.name,
          description: input.description,
          sku: input.sku,
          category: input.category,
          price: price as any,
          unit: input.unit,
          stock: input.stock,
          sourceType: input.sourceType,
          externalSource: input.externalSource,
          externalSku: input.externalSku,
          externalUrl: input.externalUrl,
          externalStatus: input.externalStatus,
          syncEnabled: input.syncEnabled,
          priceSource: input.priceSource,
          externalPrice: externalPrice as any,
          lastSyncedAt: input.lastSyncedAt,
        });
        // Sync to Firebase
        const productId = (product as any).insertId || (product as any).id;
        if (productId) syncToFirebase("product", productId, { ...input, price, externalPrice }, { companyId: input.companyId });
        return product;
      }),
  }),

  // Professional procedures
  professionals: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanyProfessionals(input.companyId);
      }),

    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        role: z.string().optional(),
        hourlyRate: z.string().or(z.number()).optional(),
        dailyRate: z.string().or(z.number()).optional(),
        commissionPercentage: z.string().or(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);
        // Apenas admin e gerente podem criar profissionais
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const hourlyRate = input.hourlyRate ? (typeof input.hourlyRate === "string" ? parseFloat(input.hourlyRate) : input.hourlyRate) : undefined;
        const dailyRate = input.dailyRate ? (typeof input.dailyRate === "string" ? parseFloat(input.dailyRate) : input.dailyRate) : undefined;
        const commissionPercentage = input.commissionPercentage ? (typeof input.commissionPercentage === "string" ? parseFloat(input.commissionPercentage) : input.commissionPercentage) : undefined;
        
        const professional = await db.createProfessional({
          companyId: input.companyId,
          name: input.name,
          role: input.role,
          hourlyRate: hourlyRate as any,
          dailyRate: dailyRate as any,
          commissionPercentage: commissionPercentage as any,
        });
        // Sync to Firebase
        const profId = (professional as any).insertId || (professional as any).id;
        if (profId) syncToFirebase("professional", profId, { ...input, hourlyRate, dailyRate, commissionPercentage }, { companyId: input.companyId });
        return professional;
      }),
  }),

  // Supplier procedures
  suppliers: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanySuppliers(input.companyId);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number().int().positive(),
        name: z.string().min(1),
        document: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        zipCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) throw new TRPCError({ code: "FORBIDDEN" });
        const supplier = await db.createSupplier(input);
        const supplierId = (supplier as any).insertId || (supplier as any).id;
        if (supplierId) syncToFirebase("supplier", supplierId, { ...input, id: supplierId }, { companyId: input.companyId });
        return supplier;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        companyId: z.number().int().positive(),
        name: z.string().min(1).optional(),
        document: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        zipCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) throw new TRPCError({ code: "FORBIDDEN" });
        const current = await db.getSupplierById(input.id);
        if (!current || current.companyId !== input.companyId) throw new TRPCError({ code: "NOT_FOUND" });
        const { id, companyId, ...data } = input;
        const supplier = await db.updateSupplier(id, data);
        syncToFirebase("supplier", id, { ...data, id }, { companyId });
        return supplier;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), companyId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) throw new TRPCError({ code: "FORBIDDEN" });
        const current = await db.getSupplierById(input.id);
        if (!current || current.companyId !== input.companyId) throw new TRPCError({ code: "NOT_FOUND" });
        await db.deleteSupplier(input.id);
        syncToFirebase("supplier", input.id, null, { companyId: input.companyId });
        return { success: true };
      }),
  }),

  // Upload procedures
  upload: router({
    companyLogo: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { company, isOwner } = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!isOwner) throw new TRPCError({ code: "FORBIDDEN" });
        
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `companies/${input.companyId}/logo/${input.fileName}`;
        const { key, url } = await storagePut(fileKey, buffer, input.mimeType);
        
        await db.updateCompany(input.companyId, { logoUrl: url, logoStorageKey: key });
        syncToFirebase("company", input.companyId, { logoUrl: url, logoStorageKey: key });
        
        return { url, key };
      }),

    companyWatermark: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { company, isOwner } = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!isOwner) throw new TRPCError({ code: "FORBIDDEN" });
        
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `companies/${input.companyId}/watermark/${input.fileName}`;
        const { key, url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Store watermark in default theme (creates one if needed)
        const defaultTheme = await db.getOrCreateDefaultTheme(input.companyId);
        if (defaultTheme) {
          await db.updateThemeWatermark(defaultTheme.id, url, key);
        }
        
        return { url, key };
      }),

    removeLogo: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { company, isOwner } = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!isOwner) throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateCompany(input.companyId, { logoUrl: null, logoStorageKey: null });
        syncToFirebase("company", input.companyId, { logoUrl: null, logoStorageKey: null });
        return { success: true };
      }),

    removeWatermark: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { company, isOwner } = await checkCompanyAccess(ctx.user.id, input.companyId);
        if (!isOwner) throw new TRPCError({ code: "FORBIDDEN" });
        const defaultTheme = await db.getOrCreateDefaultTheme(input.companyId);
        if (defaultTheme) {
          await db.updateThemeWatermark(defaultTheme.id, null, null);
        }
        return { success: true };
      }),
  }),

  // Theme procedures
  themes: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanyThemes(input.companyId);
      }),

    default: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getOrCreateDefaultTheme(input.companyId);
      }),
  }),

  // Quotation procedures
  quotations: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanyQuotations(input.companyId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) throw new TRPCError({ code: "NOT_FOUND" });
        await checkCompanyAccess(ctx.user.id, quotation.companyId);
        const items = await db.getQuotationItems(input.id);
        const client = await db.getClientById(quotation.clientId);
        const company = await db.getCompanyById(quotation.companyId);
        return { ...quotation, items, client, company };
      }),

    versions: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) throw new TRPCError({ code: "NOT_FOUND" });
        await checkCompanyAccess(ctx.user.id, quotation.companyId);
        return db.getDocumentVersions("quotation", input.id);
      }),

    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) throw new TRPCError({ code: "NOT_FOUND" });
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, quotation.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) throw new TRPCError({ code: "FORBIDDEN" });
        const items = await db.getQuotationItems(input.id);
        const duplicatedItems = items.map(({ id: _itemId, quotationId: _quotationId, createdAt: _createdAt, ...item }) => item);
        const number = await db.getNextQuotationNumber(quotation.companyId);
        const { id } = await db.createQuotation({
          companyId: quotation.companyId,
          clientId: quotation.clientId,
          number,
          status: "rascunho",
          description: quotation.description,
          notes: quotation.notes,
          subtotal: quotation.subtotal,
          discount: quotation.discount,
          discountPercentage: quotation.discountPercentage,
          tax: quotation.tax,
          total: quotation.total,
          validUntil: quotation.validUntil,
          paymentTerms: quotation.paymentTerms,
          workLocation: quotation.workLocation,
          issPercentage: quotation.issPercentage,
          icmsPercentage: quotation.icmsPercentage,
          pixHolder: quotation.pixHolder,
          pixBank: quotation.pixBank,
          pixKey: quotation.pixKey,
          paymentConditions: quotation.paymentConditions,
          paymentMethodDescription: quotation.paymentMethodDescription,
          serviceDescription: quotation.serviceDescription,
          deliveryEstimate: quotation.deliveryEstimate,
          legalNotice: quotation.legalNotice,
          themeId: quotation.themeId,
        });
        const quotationItemsForDuplicate = duplicatedItems.map((item) => ({ ...item, quotationId: id }));
        await db.createQuotationItems(quotationItemsForDuplicate);
        const duplicatedQuotation = await db.getQuotationById(id);
        if (duplicatedQuotation) {
          syncToFirebase("quotation", id, { ...duplicatedQuotation, items: quotationItemsForDuplicate }, { companyId: quotation.companyId });
        }
        await saveDocumentVersion("quotation", id, ctx.user.id, `Duplicado de ${quotation.number}`);
        return { id, number };
      }),

    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        clientId: z.number(),
        description: z.string().optional(),
        notes: z.string().optional(),
        discount: z.string().or(z.number()).optional(),
        discountPercentage: z.string().or(z.number()).optional(),
        tax: z.string().or(z.number()).optional(),
        validUntil: z.string().optional(),
        paymentTerms: z.string().optional(),
        // Novos campos do modelo profissional
        workLocation: z.string().optional(),
        issPercentage: z.string().or(z.number()).optional(),
        icmsPercentage: z.string().or(z.number()).optional(),
        pixHolder: z.string().optional(),
        pixBank: z.string().optional(),
        pixKey: z.string().optional(),
        paymentConditions: z.string().optional(),
        paymentMethodDescription: z.string().optional(),
        serviceDescription: z.string().optional(),
        deliveryEstimate: z.string().optional(),
        legalNotice: z.string().optional(),
        items: z.array(z.object({
          productId: z.number().nullable().optional(),
          description: z.string().min(1),
          itemType: z.string().optional(),
          quantity: z.string().or(z.number()),
          unit: z.string().optional(),
          unitPrice: z.string().or(z.number()),
          discount: z.string().or(z.number()).optional(),
        })).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);

        // Calculate item totals
        const processedItems = input.items.map(item => {
          const qty = typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
          const price = typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : item.unitPrice;
          const disc = item.discount ? (typeof item.discount === "string" ? parseFloat(item.discount) : item.discount) : 0;
          const total = (qty * price) - disc;
          return { ...item, quantity: String(qty), unitPrice: String(price), discount: String(disc), total: String(total) };
        });

        const subtotal = processedItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
        const discountVal = input.discount ? (typeof input.discount === "string" ? parseFloat(input.discount) : input.discount) : 0;
        const discountPct = input.discountPercentage ? (typeof input.discountPercentage === "string" ? parseFloat(input.discountPercentage) : input.discountPercentage) : 0;
        const effectiveDiscount = discountPct > 0 ? subtotal * (discountPct / 100) : discountVal;

        // ISS e ICMS
        const issPct = input.issPercentage ? (typeof input.issPercentage === "string" ? parseFloat(input.issPercentage) : input.issPercentage) : 0;
        const icmsPct = input.icmsPercentage ? (typeof input.icmsPercentage === "string" ? parseFloat(input.icmsPercentage) : input.icmsPercentage) : 0;
        const issVal = subtotal * (issPct / 100);
        const icmsVal = subtotal * (icmsPct / 100);
        const taxVal = issVal + icmsVal;
        const total = subtotal - effectiveDiscount + taxVal;

        // Generate sequential number
        const number = await db.getNextQuotationNumber(input.companyId);

        // Create quotation
        const { id } = await db.createQuotation({
          companyId: input.companyId,
          clientId: input.clientId,
          number,
          status: "rascunho",
          description: input.description,
          notes: input.notes,
          subtotal: String(subtotal) as any,
          discount: String(effectiveDiscount) as any,
          discountPercentage: String(discountPct) as any,
          tax: String(taxVal) as any,
          total: String(total) as any,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
          paymentTerms: input.paymentTerms,
          workLocation: input.workLocation,
          issPercentage: String(issPct) as any,
          icmsPercentage: String(icmsPct) as any,
          pixHolder: input.pixHolder,
          pixBank: input.pixBank,
          pixKey: input.pixKey,
          paymentConditions: input.paymentConditions,
          paymentMethodDescription: input.paymentMethodDescription,
          serviceDescription: input.serviceDescription,
          deliveryEstimate: input.deliveryEstimate,
          legalNotice: input.legalNotice,
        });

        // Create items
        await db.createQuotationItems(
          processedItems.map(item => ({
            quotationId: id,
            productId: item.productId ?? undefined,
            description: item.description,
            itemType: item.itemType,
            quantity: item.quantity as any,
            unit: item.unit,
            unitPrice: item.unitPrice as any,
            discount: item.discount as any,
            total: item.total as any,
          }))
        );

        // Sync quotation to Firebase
        const createdQuotation = await db.getQuotationById(id);
        if (createdQuotation) {
          syncToFirebase("quotation", id, { ...createdQuotation, items: processedItems }, { companyId: input.companyId });
          await saveDocumentVersion("quotation", id, ctx.user.id, "Criação do orçamento");
        }
        return { id, number };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["rascunho", "enviado", "aprovado", "rejeitado", "vencido", "convertido"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) throw new TRPCError({ code: "NOT_FOUND" });
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, quotation.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateQuotationStatus(input.id, input.status);
        // Sync status update to Firebase
        syncToFirebase("quotation", input.id, { ...quotation, status: input.status }, { companyId: quotation.companyId });
        await saveDocumentVersion("quotation", input.id, ctx.user.id, `Alteração de status para ${input.status}`);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number(),
        description: z.string().optional(),
        notes: z.string().optional(),
        discount: z.string().or(z.number()).optional(),
        discountPercentage: z.string().or(z.number()).optional(),
        tax: z.string().or(z.number()).optional(),
        validUntil: z.string().optional(),
        paymentTerms: z.string().optional(),
        workLocation: z.string().optional(),
        issPercentage: z.string().or(z.number()).optional(),
        icmsPercentage: z.string().or(z.number()).optional(),
        pixHolder: z.string().optional(),
        pixBank: z.string().optional(),
        pixKey: z.string().optional(),
        paymentConditions: z.string().optional(),
        paymentMethodDescription: z.string().optional(),
        serviceDescription: z.string().optional(),
        deliveryEstimate: z.string().optional(),
        legalNotice: z.string().optional(),
        items: z.array(z.object({
          productId: z.number().nullable().optional(),
          description: z.string().min(1),
          itemType: z.string().optional(),
          quantity: z.string().or(z.number()),
          unit: z.string().optional(),
          unitPrice: z.string().or(z.number()),
          discount: z.string().or(z.number()).optional(),
        })).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) throw new TRPCError({ code: "NOT_FOUND" });
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, quotation.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const processedItems = input.items.map(item => {
          const qty = typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
          const price = typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : item.unitPrice;
          const disc = item.discount ? (typeof item.discount === "string" ? parseFloat(item.discount) : item.discount) : 0;
          const total = (qty * price) - disc;
          return { ...item, quantity: String(qty), unitPrice: String(price), discount: String(disc), total: String(total) };
        });

        const subtotal = processedItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
        const discountVal = input.discount ? (typeof input.discount === "string" ? parseFloat(input.discount) : input.discount) : 0;
        const discountPct = input.discountPercentage ? (typeof input.discountPercentage === "string" ? parseFloat(input.discountPercentage) : input.discountPercentage) : 0;
        const effectiveDiscount = discountPct > 0 ? subtotal * (discountPct / 100) : discountVal;

        const issPct = input.issPercentage ? (typeof input.issPercentage === "string" ? parseFloat(input.issPercentage) : input.issPercentage) : 0;
        const icmsPct = input.icmsPercentage ? (typeof input.icmsPercentage === "string" ? parseFloat(input.icmsPercentage) : input.icmsPercentage) : 0;
        const issVal = subtotal * (issPct / 100);
        const icmsVal = subtotal * (icmsPct / 100);
        const taxVal = issVal + icmsVal;
        const total = subtotal - effectiveDiscount + taxVal;

        await db.updateQuotation(input.id, {
          clientId: input.clientId,
          description: input.description,
          notes: input.notes,
          subtotal: String(subtotal) as any,
          discount: String(effectiveDiscount) as any,
          discountPercentage: String(discountPct) as any,
          tax: String(taxVal) as any,
          total: String(total) as any,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
          paymentTerms: input.paymentTerms,
          workLocation: input.workLocation,
          issPercentage: String(issPct) as any,
          icmsPercentage: String(icmsPct) as any,
          pixHolder: input.pixHolder,
          pixBank: input.pixBank,
          pixKey: input.pixKey,
          paymentConditions: input.paymentConditions,
          paymentMethodDescription: input.paymentMethodDescription,
          serviceDescription: input.serviceDescription,
          deliveryEstimate: input.deliveryEstimate,
          legalNotice: input.legalNotice,
        });

        await db.deleteQuotationItems(input.id);
        await db.createQuotationItems(
          processedItems.map(item => ({
            quotationId: input.id,
            productId: item.productId ?? undefined,
            description: item.description,
            itemType: item.itemType,
            quantity: item.quantity as any,
            unit: item.unit,
            unitPrice: item.unitPrice as any,
            discount: item.discount as any,
            total: item.total as any,
          }))
        );

        const updated = await db.getQuotationById(input.id);
        if (updated) {
          syncToFirebase("quotation", input.id, { ...updated, items: processedItems }, { companyId: quotation.companyId });
          await saveDocumentVersion("quotation", input.id, ctx.user.id, "Edição do orçamento");
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) throw new TRPCError({ code: "NOT_FOUND" });
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, quotation.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.deleteQuotation(input.id);
        return { success: true };
      }),

    convertToInvoice: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const quotation = await db.getQuotationById(input.id);
        if (!quotation) throw new TRPCError({ code: "NOT_FOUND" });
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, quotation.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await db.convertQuotationToInvoice(input.id);
        return result;
      }),
  }),

  // Expenses procedures
  expenses: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanyExpenses(input.companyId);
      }),

    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        description: z.string().min(1),
        category: z.string().min(1),
        amount: z.string().or(z.number()),
        dueDate: z.string(),
        supplierName: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        const expense = await db.createExpense({
          companyId: input.companyId,
          description: input.description,
          category: input.category,
          amount: String(input.amount) as any,
          dueDate: new Date(input.dueDate),
          supplierName: input.supplierName,
          notes: input.notes,
          status: "pendente",
        });
        return expense;
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendente", "pago", "atrasado", "cancelado"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateExpenseStatus(input.id, input.status);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteExpense(input.id);
        return { success: true };
      }),
  }),

  // Financial Reports procedures
  reports: router({
    summary: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        const invs = await db.getCompanyInvoices(input.companyId);
        const exps = await db.getCompanyExpenses(input.companyId);

        const totalInvoiced = invs.reduce((acc, i) => acc + Number(i.total || 0), 0);
        const totalPaidInvoices = invs.filter(i => i.status === 'pago').reduce((acc, i) => acc + Number(i.total || 0), 0);
        const totalExpenses = exps.reduce((acc, e) => acc + Number(e.amount || 0), 0);
        const totalPaidExpenses = exps.filter(e => e.status === 'pago').reduce((acc, e) => acc + Number(e.amount || 0), 0);

        return {
          totalInvoiced,
          totalPaidInvoices,
          totalExpenses,
          totalPaidExpenses,
          netProfit: totalPaidInvoices - totalPaidExpenses,
        };
      }),
  }),

  // Invoice procedures
  invoices: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        await checkCompanyAccess(ctx.user.id, input.companyId);
        return db.getCompanyInvoices(input.companyId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
        await checkCompanyAccess(ctx.user.id, invoice.companyId);
        const items = await db.getInvoiceItems(input.id);
        return { ...invoice, items };
      }),

    versions: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
        await checkCompanyAccess(ctx.user.id, invoice.companyId);
        return db.getDocumentVersions("invoice", input.id);
      }),

    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, invoice.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) throw new TRPCError({ code: "FORBIDDEN" });
        const items = await db.getInvoiceItems(input.id);
        const duplicatedItems = items.map(({ id: _itemId, invoiceId: _invoiceId, createdAt: _createdAt, ...item }) => item);
        const number = await db.getNextInvoiceNumber(invoice.companyId);
        const { id } = await db.createInvoice({
          companyId: invoice.companyId,
          clientId: invoice.clientId,
          quotationId: invoice.quotationId,
          number,
          status: "rascunho",
          description: invoice.description,
          notes: invoice.notes,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          discountPercentage: invoice.discountPercentage,
          tax: invoice.tax,
          total: invoice.total,
          dueDate: invoice.dueDate,
          paymentTerms: invoice.paymentTerms,
          themeId: invoice.themeId,
        });
        const invoiceItemsForDuplicate = duplicatedItems.map((item) => ({ ...item, invoiceId: id }));
        await db.createInvoiceItems(invoiceItemsForDuplicate);
        const duplicatedInvoice = await db.getInvoiceById(id);
        if (duplicatedInvoice) {
          syncToFirebase("invoice", id, { ...duplicatedInvoice, items: invoiceItemsForDuplicate }, { companyId: invoice.companyId });
        }
        await saveDocumentVersion("invoice", id, ctx.user.id, `Duplicada de ${invoice.number}`);
        return { id, number };
      }),

    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        clientId: z.number(),
        description: z.string().optional(),
        notes: z.string().optional(),
        discount: z.string().or(z.number()).optional(),
        discountPercentage: z.string().or(z.number()).optional(),
        tax: z.string().or(z.number()).optional(),
        dueDate: z.string().optional(),
        paymentTerms: z.string().optional(),
        items: z.array(z.object({
          productId: z.number().nullable().optional(),
          description: z.string().min(1),
          quantity: z.string().or(z.number()),
          unit: z.string().optional(),
          unitPrice: z.string().or(z.number()),
          discount: z.string().or(z.number()).optional(),
        })).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);

        // Calculate item totals
        const processedItems = input.items.map(item => {
          const qty = typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
          const price = typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : item.unitPrice;
          const disc = item.discount ? (typeof item.discount === "string" ? parseFloat(item.discount) : item.discount) : 0;
          const total = (qty * price) - disc;
          return { ...item, quantity: String(qty), unitPrice: String(price), discount: String(disc), total: String(total) };
        });

        const subtotal = processedItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
        const discountVal = input.discount ? (typeof input.discount === "string" ? parseFloat(input.discount) : input.discount) : 0;
        const discountPct = input.discountPercentage ? (typeof input.discountPercentage === "string" ? parseFloat(input.discountPercentage) : input.discountPercentage) : 0;
        const effectiveDiscount = discountPct > 0 ? subtotal * (discountPct / 100) : discountVal;
        const taxVal = input.tax ? (typeof input.tax === "string" ? parseFloat(input.tax) : input.tax) : 0;
        const total = subtotal - effectiveDiscount + taxVal;

        // Generate sequential number
        const number = await db.getNextInvoiceNumber(input.companyId);

        // Create invoice
        const { id } = await db.createInvoice({
          companyId: input.companyId,
          clientId: input.clientId,
          number,
          status: "rascunho",
          description: input.description,
          notes: input.notes,
          subtotal: String(subtotal) as any,
          discount: String(effectiveDiscount) as any,
          discountPercentage: String(discountPct) as any,
          tax: String(taxVal) as any,
          total: String(total) as any,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          paymentTerms: input.paymentTerms,
        });

        // Create items
        await db.createInvoiceItems(
          processedItems.map(item => ({
            invoiceId: id,
            productId: item.productId ?? undefined,
            description: item.description,
            quantity: item.quantity as any,
            unit: item.unit,
            unitPrice: item.unitPrice as any,
            discount: item.discount as any,
            total: item.total as any,
          }))
        );

        // Sync invoice to Firebase
        const createdInvoice = await db.getInvoiceById(id);
        if (createdInvoice) {
          syncToFirebase("invoice", id, { ...createdInvoice, items: processedItems }, { companyId: input.companyId });
          await saveDocumentVersion("invoice", id, ctx.user.id, "Criação da fatura");
        }
        return { id, number };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["rascunho", "enviado", "aprovado", "parcialmente_pago", "pago", "vencido", "cancelado"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, invoice.companyId);
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateInvoiceStatus(input.id, input.status);
        // Sync status update to Firebase
        syncToFirebase("invoice", input.id, { ...invoice, status: input.status }, { companyId: invoice.companyId });
        await saveDocumentVersion("invoice", input.id, ctx.user.id, `Alteração de status para ${input.status}`);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

