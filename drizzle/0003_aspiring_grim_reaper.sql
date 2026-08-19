CREATE TABLE `receivables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`clientId` int,
	`description` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`dueDate` timestamp NOT NULL,
	`receivedDate` timestamp,
	`status` enum('pendente','recebido','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receivables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `receivables_companyId_idx` ON `receivables` (`companyId`);--> statement-breakpoint
CREATE INDEX `receivables_status_idx` ON `receivables` (`status`);