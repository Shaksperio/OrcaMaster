import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { syncToFirebase } from "./firebase-sync";
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

export const appRouter = router({
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
        email: z.string().email().optional(),
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
  }),

  // Product procedures
  products: router({
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
      }))
      .mutation(async ({ input, ctx }) => {
        const { isOwner, member } = await checkCompanyAccess(ctx.user.id, input.companyId);
        // Apenas admin e gerente podem criar produtos
        if (!checkRolePermission(member?.role, isOwner, ["admin", "gerente"])) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const price = typeof input.price === "string" ? parseFloat(input.price) : input.price;
        const product = await db.createProduct({
          companyId: input.companyId,
          name: input.name,
          description: input.description,
          sku: input.sku,
          category: input.category,
          price: price as any,
          unit: input.unit,
          stock: input.stock,
        });
        // Sync to Firebase
        const productId = (product as any).insertId || (product as any).id;
        if (productId) syncToFirebase("product", productId, { ...input, price }, { companyId: input.companyId });
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
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

