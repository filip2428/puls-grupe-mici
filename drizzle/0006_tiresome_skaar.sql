CREATE TABLE `evenimente` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`titlu` text NOT NULL,
	`detalii` text,
	`ora` text,
	`locatie` text,
	`pe_grupe_mici` integer DEFAULT false NOT NULL,
	`creat_de_id` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `evenimente_data_idx` ON `evenimente` (`data`);