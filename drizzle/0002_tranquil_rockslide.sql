CREATE TABLE `echipe_slujire` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`descriere` text,
	`responsabil_id` integer,
	`activa` integer DEFAULT true NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`responsabil_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `membri_echipe` (
	`echipa_id` integer NOT NULL,
	`membru_id` integer NOT NULL,
	`rol` text,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`echipa_id`, `membru_id`),
	FOREIGN KEY (`echipa_id`) REFERENCES `echipe_slujire`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membru_id`) REFERENCES `membri`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `membri_echipe_membru_idx` ON `membri_echipe` (`membru_id`);--> statement-breakpoint
CREATE TABLE `notificari` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lider_id` integer NOT NULL,
	`tip` text NOT NULL,
	`cheie` text NOT NULL,
	`titlu` text NOT NULL,
	`mesaj` text NOT NULL,
	`link` text,
	`citita` integer DEFAULT false NOT NULL,
	`trimisa_la` integer,
	`eroare_trimitere` text,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lider_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notificari_lider_cheie_uq` ON `notificari` (`lider_id`,`cheie`);--> statement-breakpoint
CREATE INDEX `notificari_lider_idx` ON `notificari` (`lider_id`,`creat_la`);--> statement-breakpoint
CREATE TABLE `programari_slujire` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`titlu` text NOT NULL,
	`detalii` text,
	`ora` text,
	`locatie` text,
	`grupa_id` integer,
	`echipa_id` integer,
	`creat_de_id` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`grupa_id`) REFERENCES `grupe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`echipa_id`) REFERENCES `echipe_slujire`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `programari_data_idx` ON `programari_slujire` (`data`);--> statement-breakpoint
CREATE INDEX `programari_grupa_idx` ON `programari_slujire` (`grupa_id`);--> statement-breakpoint
CREATE INDEX `programari_echipa_idx` ON `programari_slujire` (`echipa_id`);--> statement-breakpoint
ALTER TABLE `lideri` ADD `email` text;--> statement-breakpoint
ALTER TABLE `lideri` ADD `notif_zile_nastere` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `lideri` ADD `notif_slujiri` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `lideri` ADD `notif_prezenta` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `lideri` ADD `notif_rezumat` integer DEFAULT true NOT NULL;