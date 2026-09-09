CREATE TABLE `lideri_echipe` (
	`lider_id` integer NOT NULL,
	`echipa_id` integer NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`lider_id`, `echipa_id`),
	FOREIGN KEY (`lider_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`echipa_id`) REFERENCES `echipe_slujire`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lideri_echipe_echipa_idx` ON `lideri_echipe` (`echipa_id`);--> statement-breakpoint
CREATE TABLE `programari_grupe` (
	`programare_id` integer NOT NULL,
	`grupa_id` integer NOT NULL,
	PRIMARY KEY(`programare_id`, `grupa_id`),
	FOREIGN KEY (`programare_id`) REFERENCES `programari_slujire`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`grupa_id`) REFERENCES `grupe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `programari_grupe_grupa_idx` ON `programari_grupe` (`grupa_id`);--> statement-breakpoint
-- Ce era deja scris se muta, ca sa nu se piarda nimic din calendar:
-- responsabilul devine primul lider al slujirii, iar grupa programata devine
-- singura grupa a programarii.
INSERT INTO `lideri_echipe` (`lider_id`, `echipa_id`) SELECT `responsabil_id`, `id` FROM `echipe_slujire` WHERE `responsabil_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `programari_grupe` (`programare_id`, `grupa_id`) SELECT `id`, `grupa_id` FROM `programari_slujire` WHERE `grupa_id` IS NOT NULL;--> statement-breakpoint
-- SQLite nu stie sa stearga o coloana legata printr-o cheie straina, asa ca
-- tabelele se refac de la zero, cu datele copiate.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_echipe_slujire` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`descriere` text,
	`activa` integer DEFAULT true NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_echipe_slujire`("id", "nume", "descriere", "activa", "creat_la") SELECT "id", "nume", "descriere", "activa", "creat_la" FROM `echipe_slujire`;--> statement-breakpoint
DROP TABLE `echipe_slujire`;--> statement-breakpoint
ALTER TABLE `__new_echipe_slujire` RENAME TO `echipe_slujire`;--> statement-breakpoint
CREATE TABLE `__new_programari_slujire` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`titlu` text NOT NULL,
	`detalii` text,
	`ora` text,
	`locatie` text,
	`echipa_id` integer,
	`creat_de_id` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	`prezenta_marcata_de_id` integer,
	`prezenta_marcata_la` integer,
	`prezenta_nota` text,
	FOREIGN KEY (`echipa_id`) REFERENCES `echipe_slujire`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`prezenta_marcata_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_programari_slujire`("id", "data", "titlu", "detalii", "ora", "locatie", "echipa_id", "creat_de_id", "creat_la", "prezenta_marcata_de_id", "prezenta_marcata_la", "prezenta_nota") SELECT "id", "data", "titlu", "detalii", "ora", "locatie", "echipa_id", "creat_de_id", "creat_la", "prezenta_marcata_de_id", "prezenta_marcata_la", "prezenta_nota" FROM `programari_slujire`;--> statement-breakpoint
DROP TABLE `programari_slujire`;--> statement-breakpoint
ALTER TABLE `__new_programari_slujire` RENAME TO `programari_slujire`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `programari_data_idx` ON `programari_slujire` (`data`);--> statement-breakpoint
CREATE INDEX `programari_echipa_idx` ON `programari_slujire` (`echipa_id`);
