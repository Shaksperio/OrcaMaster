CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`dueDate` timestamp NOT NULL,
	`paidDate` timestamp,
	`status` enum('pendente','pago','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
	`supplierName` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quotationItems` ADD `itemType` varchar(100);--> statement-breakpoint
ALTER TABLE `quotations` ADD `workLocation` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `issPercentage` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotations` ADD `icmsPercentage` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotations` ADD `pixHolder` varchar(255);--> statement-breakpoint
ALTER TABLE `quotations` ADD `pixBank` varchar(255);--> statement-breakpoint
ALTER TABLE `quotations` ADD `pixKey` varchar(255);--> statement-breakpoint
ALTER TABLE `quotations` ADD `paymentConditions` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `paymentMethodDescription` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `serviceDescription` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `deliveryEstimate` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `legalNotice` text;--> statement-breakpoint
CREATE INDEX `expenses_companyId_idx` ON `expenses` (`companyId`);--> statement-breakpoint
CREATE INDEX `expenses_status_idx` ON `expenses` (`status`);