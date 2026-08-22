CREATE TABLE `googleDriveBackups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`connectionId` int NOT NULL,
	`driveFileId` varchar(255),
	`fileName` varchar(255) NOT NULL,
	`checksum` varchar(64) NOT NULL,
	`byteSize` int NOT NULL DEFAULT 0,
	`status` enum('pending','uploaded','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` datetime,
	CONSTRAINT `googleDriveBackups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `googleDriveConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`driveEmail` varchar(320),
	`accessTokenEncrypted` text NOT NULL,
	`refreshTokenEncrypted` text NOT NULL,
	`scope` varchar(500),
	`enabled` boolean NOT NULL DEFAULT true,
	`autoBackupEnabled` boolean NOT NULL DEFAULT false,
	`lastBackupAt` datetime,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `googleDriveConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `googleDriveConnections_companyId_unique` UNIQUE(`companyId`)
);
--> statement-breakpoint
CREATE INDEX `googleDriveBackups_companyId_idx` ON `googleDriveBackups` (`companyId`);--> statement-breakpoint
CREATE INDEX `googleDriveBackups_connectionId_idx` ON `googleDriveBackups` (`connectionId`);--> statement-breakpoint
CREATE INDEX `googleDriveBackups_status_idx` ON `googleDriveBackups` (`status`);--> statement-breakpoint
CREATE INDEX `googleDriveConnections_companyId_idx` ON `googleDriveConnections` (`companyId`);--> statement-breakpoint
CREATE INDEX `googleDriveConnections_userId_idx` ON `googleDriveConnections` (`userId`);