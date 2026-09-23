CREATE TABLE `ani_arhivati` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`de_la` text NOT NULL,
	`pana_la` text NOT NULL,
	`date` text NOT NULL,
	`creat_de_id` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
