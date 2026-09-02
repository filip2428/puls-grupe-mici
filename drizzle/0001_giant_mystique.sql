ALTER TABLE `membri` ADD `sex` text;--> statement-breakpoint
ALTER TABLE `membri` ADD `clasa` integer;--> statement-breakpoint
ALTER TABLE `membri` ADD `status` text DEFAULT 'membru' NOT NULL;--> statement-breakpoint
ALTER TABLE `membri` ADD `devenit_membru_la` text;--> statement-breakpoint
ALTER TABLE `membri` ADD `parinte1_nume` text;--> statement-breakpoint
ALTER TABLE `membri` ADD `parinte1_telefon` text;--> statement-breakpoint
ALTER TABLE `membri` ADD `parinte2_nume` text;--> statement-breakpoint
ALTER TABLE `membri` ADD `parinte2_telefon` text;--> statement-breakpoint
CREATE INDEX `membri_status_idx` ON `membri` (`status`);