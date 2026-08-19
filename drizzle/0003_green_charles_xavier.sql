CREATE TABLE `productPriceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`supplier` varchar(50) NOT NULL,
	`oldPrice` decimal(12,2),
	`newPrice` decimal(12,2) NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productPriceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `sourceType` varchar(20) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `externalSource` varchar(50);--> statement-breakpoint
ALTER TABLE `products` ADD `externalSku` varchar(100);--> statement-breakpoint
ALTER TABLE `products` ADD `externalUrl` text;--> statement-breakpoint
ALTER TABLE `products` ADD `externalStatus` varchar(30) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `products` ADD `syncEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `priceSource` varchar(20) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `externalPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `products` ADD `lastSyncedAt` timestamp;--> statement-breakpoint
CREATE INDEX `productPriceHistory_productId_idx` ON `productPriceHistory` (`productId`);