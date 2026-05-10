CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`document` varchar(20),
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`document` varchar(20) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`logoUrl` varchar(500),
	`logoStorageKey` varchar(255),
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`language` varchar(5) NOT NULL DEFAULT 'pt-BR',
	`taxRegime` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companyMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','gerente','colaborador') NOT NULL DEFAULT 'colaborador',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companyMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_user_unique` UNIQUE(`companyId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `documentPdfs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentType` enum('quotation','invoice') NOT NULL,
	`documentId` int NOT NULL,
	`pdfUrl` varchar(500) NOT NULL,
	`pdfStorageKey` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentPdfs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentType` enum('quotation','invoice') NOT NULL,
	`documentId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`data` json NOT NULL,
	`changedBy` int,
	`changeReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoiceItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`productId` int,
	`description` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`unit` varchar(20),
	`unitPrice` decimal(12,2) NOT NULL,
	`discount` decimal(12,2) DEFAULT '0',
	`total` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoiceItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`clientId` int NOT NULL,
	`quotationId` int,
	`number` varchar(20) NOT NULL,
	`status` enum('rascunho','enviado','aprovado','parcialmente_pago','pago','vencido','cancelado') NOT NULL DEFAULT 'rascunho',
	`description` text,
	`notes` text,
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) DEFAULT '0',
	`discountPercentage` decimal(5,2) DEFAULT '0',
	`tax` decimal(12,2) DEFAULT '0',
	`total` decimal(12,2) NOT NULL DEFAULT '0',
	`dueDate` datetime,
	`paymentTerms` varchar(255),
	`themeId` int,
	`qrCodeUrl` varchar(500),
	`qrCodeStorageKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`relatedDocumentType` enum('quotation','invoice'),
	`relatedDocumentId` int,
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paymentMethod` varchar(50),
	`paymentDate` datetime NOT NULL,
	`reference` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceSuggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`productId` int NOT NULL,
	`suggestedPrice` decimal(12,2) NOT NULL,
	`basedOnQuotations` int DEFAULT 0,
	`confidence` decimal(3,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` datetime,
	CONSTRAINT `priceSuggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sku` varchar(50),
	`category` varchar(100),
	`price` decimal(12,2) NOT NULL,
	`unit` varchar(20),
	`stock` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `professionals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(100),
	`hourlyRate` decimal(10,2),
	`dailyRate` decimal(10,2),
	`commissionPercentage` decimal(5,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `professionals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qrCodeValidations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentType` enum('quotation','invoice') NOT NULL,
	`documentId` int NOT NULL,
	`scannedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `qrCodeValidations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`productId` int,
	`description` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`unit` varchar(20),
	`unitPrice` decimal(12,2) NOT NULL,
	`discount` decimal(12,2) DEFAULT '0',
	`total` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotationItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`clientId` int NOT NULL,
	`number` varchar(20) NOT NULL,
	`status` enum('rascunho','enviado','aprovado','rejeitado','vencido','convertido') NOT NULL DEFAULT 'rascunho',
	`description` text,
	`notes` text,
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) DEFAULT '0',
	`discountPercentage` decimal(5,2) DEFAULT '0',
	`tax` decimal(12,2) DEFAULT '0',
	`total` decimal(12,2) NOT NULL DEFAULT '0',
	`validUntil` datetime,
	`paymentTerms` varchar(255),
	`themeId` int,
	`qrCodeUrl` varchar(500),
	`qrCodeStorageKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`document` varchar(20),
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `themes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`layout` enum('minimalista','clássico','técnico') NOT NULL,
	`primaryColor` varchar(7),
	`secondaryColor` varchar(7),
	`accentColor` varchar(7),
	`fontFamily` varchar(100),
	`customFields` json,
	`watermarkUrl` varchar(500),
	`watermarkStorageKey` varchar(255),
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `themes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `clients_companyId_idx` ON `clients` (`companyId`);--> statement-breakpoint
CREATE INDEX `clients_document_idx` ON `clients` (`document`);--> statement-breakpoint
CREATE INDEX `companies_userId_idx` ON `companies` (`userId`);--> statement-breakpoint
CREATE INDEX `companies_document_idx` ON `companies` (`document`);--> statement-breakpoint
CREATE INDEX `companyMembers_companyId_idx` ON `companyMembers` (`companyId`);--> statement-breakpoint
CREATE INDEX `companyMembers_userId_idx` ON `companyMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `documentPdfs_documentTypeId_idx` ON `documentPdfs` (`documentType`,`documentId`);--> statement-breakpoint
CREATE INDEX `documentVersions_documentTypeId_idx` ON `documentVersions` (`documentType`,`documentId`);--> statement-breakpoint
CREATE INDEX `invoiceItems_invoiceId_idx` ON `invoiceItems` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `invoices_companyId_idx` ON `invoices` (`companyId`);--> statement-breakpoint
CREATE INDEX `invoices_clientId_idx` ON `invoices` (`clientId`);--> statement-breakpoint
CREATE INDEX `invoices_number_idx` ON `invoices` (`number`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_isRead_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `payments_invoiceId_idx` ON `payments` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `priceSuggestions_companyId_idx` ON `priceSuggestions` (`companyId`);--> statement-breakpoint
CREATE INDEX `priceSuggestions_productId_idx` ON `priceSuggestions` (`productId`);--> statement-breakpoint
CREATE INDEX `products_companyId_idx` ON `products` (`companyId`);--> statement-breakpoint
CREATE INDEX `products_sku_idx` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `professionals_companyId_idx` ON `professionals` (`companyId`);--> statement-breakpoint
CREATE INDEX `qrCodeValidations_documentTypeId_idx` ON `qrCodeValidations` (`documentType`,`documentId`);--> statement-breakpoint
CREATE INDEX `quotationItems_quotationId_idx` ON `quotationItems` (`quotationId`);--> statement-breakpoint
CREATE INDEX `quotations_companyId_idx` ON `quotations` (`companyId`);--> statement-breakpoint
CREATE INDEX `quotations_clientId_idx` ON `quotations` (`clientId`);--> statement-breakpoint
CREATE INDEX `quotations_number_idx` ON `quotations` (`number`);--> statement-breakpoint
CREATE INDEX `quotations_status_idx` ON `quotations` (`status`);--> statement-breakpoint
CREATE INDEX `suppliers_companyId_idx` ON `suppliers` (`companyId`);--> statement-breakpoint
CREATE INDEX `themes_companyId_idx` ON `themes` (`companyId`);