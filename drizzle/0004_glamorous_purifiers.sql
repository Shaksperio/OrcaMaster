ALTER TABLE `products` ADD `externalSource` varchar(50);--> statement-breakpoint
ALTER TABLE `products` ADD `externalSku` varchar(100);--> statement-breakpoint
ALTER TABLE `products` ADD `lastSyncedAt` timestamp;