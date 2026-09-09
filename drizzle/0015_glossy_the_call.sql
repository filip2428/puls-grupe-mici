PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_membri` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`grupa_id` integer,
	`nume` text NOT NULL,
	`telefon` text,
	`email` text,
	`data_nasterii` text,
	`sex` text,
	`clasa` integer,
	`status` text DEFAULT 'membru' NOT NULL,
	`devenit_membru_la` text,
	`biserica` text,
	`biserica_id` integer,
	`botez` text,
	`botezat_la` text,
	`parinte1_nume` text,
	`parinte1_telefon` text,
	`parinte1_email` text,
	`parinte2_nume` text,
	`parinte2_telefon` text,
	`parinte2_email` text,
	`activ` integer DEFAULT true NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`grupa_id`) REFERENCES `grupe`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`biserica_id`) REFERENCES `biserici`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_membri`("id", "grupa_id", "nume", "telefon", "email", "data_nasterii", "sex", "clasa", "status", "devenit_membru_la", "biserica", "biserica_id", "botez", "botezat_la", "parinte1_nume", "parinte1_telefon", "parinte1_email", "parinte2_nume", "parinte2_telefon", "parinte2_email", "activ", "creat_la") SELECT "id", "grupa_id", "nume", "telefon", "email", "data_nasterii", "sex", "clasa", "status", "devenit_membru_la", "biserica", "biserica_id", "botez", "botezat_la", "parinte1_nume", "parinte1_telefon", "parinte1_email", "parinte2_nume", "parinte2_telefon", "parinte2_email", "activ", "creat_la" FROM `membri`;--> statement-breakpoint
DROP TABLE `membri`;--> statement-breakpoint
ALTER TABLE `__new_membri` RENAME TO `membri`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `membri_grupa_idx` ON `membri` (`grupa_id`);--> statement-breakpoint
CREATE INDEX `membri_status_idx` ON `membri` (`status`);