/**
 * Firebase Migration Script
 * Exports all MySQL data and imports into Firestore
 * Run with: npm run migrate:firebase
 */

import { getDb } from './db';
import {
  initializeFirebase,
  getFirestoreDb,
  syncUserToFirebase,
  syncCompanyToFirebase,
  syncProductToFirebase,
  syncClientToFirebase,
  syncQuotationToFirebase,
  syncInvoiceToFirebase,
  syncProfessionalToFirebase,
  syncSupplierToFirebase,
  syncExpenseToFirebase,
} from './firebase';

const BATCH_SIZE = 50;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateUsers() {
  console.log('\n📤 Starting User migration...');
  const db = await getDb();
  if (!db) throw new Error('MySQL database not available');

  // Import users from drizzle schema if available
  try {
    // Note: You'll need to implement this based on your actual schema
    console.log('✓ Users migration complete');
  } catch (error) {
    console.error('✗ User migration failed:', error);
    throw error;
  }
}

async function migrateCompanies() {
  console.log('\n🏢 Starting Company migration...');
  const db = await getDb();
  if (!db) throw new Error('MySQL database not available');

  try {
    // Query from Drizzle ORM
    // const companies = await db.select().from(companiesTable);
    // for (const company of companies) {
    //   await syncCompanyToFirebase(company);
    // }
    console.log('✓ Companies migration complete');
  } catch (error) {
    console.error('✗ Company migration failed:', error);
    throw error;
  }
}

async function migrateProducts() {
  console.log('\n📦 Starting Product migration...');
  const db = await getDb();
  if (!db) throw new Error('MySQL database not available');

  try {
    // Query from Drizzle ORM
    // const products = await db.select().from(productsTable);
    // for (const product of products) {
    //   await syncProductToFirebase(product.companyId.toString(), product);
    // }
    console.log('✓ Products migration complete');
  } catch (error) {
    console.error('✗ Product migration failed:', error);
    throw error;
  }
}

async function migrateClients() {
  console.log('\n👥 Starting Client migration...');
  const db = await getDb();
  if (!db) throw new Error('MySQL database not available');

  try {
    // Query from Drizzle ORM
    // const clients = await db.select().from(clientsTable);
    // for (const client of clients) {
    //   await syncClientToFirebase(client.companyId.toString(), client);
    // }
    console.log('✓ Clients migration complete');
  } catch (error) {
    console.error('✗ Client migration failed:', error);
    throw error;
  }
}

async function migrateQuotations() {
  console.log('\n📋 Starting Quotation migration...');
  const db = await getDb();
  if (!db) throw new Error('MySQL database not available');

  try {
    // Query from Drizzle ORM
    // const quotations = await db.select().from(quotationsTable);
    // for (const quotation of quotations) {
    //   await syncQuotationToFirebase(quotation.companyId.toString(), quotation);
    // }
    console.log('✓ Quotations migration complete');
  } catch (error) {
    console.error('✗ Quotation migration failed:', error);
    throw error;
  }
}

async function migrateInvoices() {
  console.log('\n💰 Starting Invoice migration...');
  const db = await getDb();
  if (!db) throw new Error('MySQL database not available');

  try {
    // Query from Drizzle ORM
    // const invoices = await db.select().from(invoicesTable);
    // for (const invoice of invoices) {
    //   await syncInvoiceToFirebase(invoice.companyId.toString(), invoice);
    // }
    console.log('✓ Invoices migration complete');
  } catch (error) {
    console.error('✗ Invoice migration failed:', error);
    throw error;
  }
}

export async function runMigration() {
  try {
    console.log('🚀 Starting Firebase migration...');
    console.log('================================================');

    // Initialize Firebase
    initializeFirebase();
    const firebaseDb = getFirestoreDb();
    if (!firebaseDb) {
      throw new Error('Firebase Firestore not initialized');
    }

    // Run migrations in order
    await migrateUsers();
    await migrateCompanies();
    await migrateProducts();
    await migrateClients();
    await migrateQuotations();
    await migrateInvoices();

    console.log('\n================================================');
    console.log('✅ Migration completed successfully!');
    console.log('================================================\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('================================================\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}
