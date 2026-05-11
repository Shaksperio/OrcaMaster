import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
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
      }))
      .mutation(async ({ input, ctx }) => {
        const { company, isOwner } = await checkCompanyAccess(ctx.user.id, input.id);
        if (!isOwner) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { id, ...updateData } = input;
        await db.updateCompany(id, updateData);
        return db.getCompanyById(id);
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
        return db.createClient(input);
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
        return db.createProduct({
          companyId: input.companyId,
          name: input.name,
          description: input.description,
          sku: input.sku,
          category: input.category,
          price: price as any,
          unit: input.unit,
          stock: input.stock,
        });
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
        
        return db.createProfessional({
          companyId: input.companyId,
          name: input.name,
          role: input.role,
          hourlyRate: hourlyRate as any,
          dailyRate: dailyRate as any,
          commissionPercentage: commissionPercentage as any,
        });
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
        return db.getDefaultTheme(input.companyId);
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
        return quotation;
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
        return invoice;
      }),
  }),
});

export type AppRouter = typeof appRouter;

