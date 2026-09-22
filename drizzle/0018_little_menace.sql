CREATE TABLE `citire_saptamani` (
	`grupa_id` integer NOT NULL,
	`saptamana` text NOT NULL,
	`completat_pana_la` text NOT NULL,
	`marcat_de_id` integer,
	`actualizat_la` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`grupa_id`, `saptamana`),
	FOREIGN KEY (`grupa_id`) REFERENCES `grupe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marcat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `citiri` (
	`membru_id` integer NOT NULL,
	`data` text NOT NULL,
	`marcat_de_id` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`membru_id`, `data`),
	FOREIGN KEY (`membru_id`) REFERENCES `membri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marcat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `citiri_data_idx` ON `citiri` (`data`);--> statement-breakpoint
CREATE TABLE `plan_citire` (
	`data` text PRIMARY KEY NOT NULL,
	`portiune` text NOT NULL,
	`carte` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `membri` ADD `citire_de_la` text;