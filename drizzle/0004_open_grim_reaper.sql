CREATE TABLE `assistantActionConfirmations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`payload` json NOT NULL,
	`confirmationToken` varchar(128) NOT NULL,
	`status` enum('pending','executed','cancelled','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` datetime NOT NULL,
	`executedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistantActionConfirmations_id` PRIMARY KEY(`id`),
	CONSTRAINT `assistantActionConfirmations_confirmationToken_unique` UNIQUE(`confirmationToken`)
);
--> statement-breakpoint
CREATE INDEX `assistantActionConfirmations_companyId_idx` ON `assistantActionConfirmations` (`companyId`);--> statement-breakpoint
CREATE INDEX `assistantActionConfirmations_userId_idx` ON `assistantActionConfirmations` (`userId`);--> statement-breakpoint
CREATE INDEX `assistantActionConfirmations_status_idx` ON `assistantActionConfirmations` (`status`);