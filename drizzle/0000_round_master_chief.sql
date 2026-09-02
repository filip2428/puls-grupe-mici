CREATE TABLE `audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lider_id` integer,
	`actiune` text NOT NULL,
	`detalii` text,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lider_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_creat_idx` ON `audit` (`creat_la`);--> statement-breakpoint
CREATE TABLE `delegari` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`grupa_id` integer NOT NULL,
	`lider_id` integer NOT NULL,
	`de_la` text NOT NULL,
	`pana_la` text NOT NULL,
	`motiv` text,
	`creat_de_id` integer,
	`anulata` integer DEFAULT false NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`grupa_id`) REFERENCES `grupe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lider_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `delegari_lider_idx` ON `delegari` (`lider_id`);--> statement-breakpoint
CREATE INDEX `delegari_grupa_idx` ON `delegari` (`grupa_id`);--> statement-breakpoint
CREATE TABLE `grupe` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`zi_intalnire` integer,
	`ora_intalnire` text,
	`locatie` text,
	`activa` integer DEFAULT true NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incercari_login` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cheie` text NOT NULL,
	`reusita` integer DEFAULT false NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `incercari_cheie_idx` ON `incercari_login` (`cheie`,`creat_la`);--> statement-breakpoint
CREATE TABLE `intalniri` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`grupa_id` integer NOT NULL,
	`data` text NOT NULL,
	`marcat_de_id` integer,
	`prin_inlocuire` integer DEFAULT false NOT NULL,
	`subiect` text,
	`nota` text,
	`numar_invitati` integer DEFAULT 0 NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	`actualizat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`grupa_id`) REFERENCES `grupe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marcat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intalniri_grupa_data_uq` ON `intalniri` (`grupa_id`,`data`);--> statement-breakpoint
CREATE INDEX `intalniri_data_idx` ON `intalniri` (`data`);--> statement-breakpoint
CREATE TABLE `lideri` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`telefon` text,
	`rol` text DEFAULT 'lider' NOT NULL,
	`cod_public` text NOT NULL,
	`cod_hash` text NOT NULL,
	`versiune_sesiuni` integer DEFAULT 1 NOT NULL,
	`activ` integer DEFAULT true NOT NULL,
	`ultima_autentificare` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lideri_cod_public_uq` ON `lideri` (`cod_public`);--> statement-breakpoint
CREATE TABLE `lideri_grupe` (
	`lider_id` integer NOT NULL,
	`grupa_id` integer NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`lider_id`, `grupa_id`),
	FOREIGN KEY (`lider_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`grupa_id`) REFERENCES `grupe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lideri_grupe_grupa_idx` ON `lideri_grupe` (`grupa_id`);--> statement-breakpoint
CREATE TABLE `membri` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`grupa_id` integer NOT NULL,
	`nume` text NOT NULL,
	`telefon` text,
	`data_nasterii` text,
	`activ` integer DEFAULT true NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`grupa_id`) REFERENCES `grupe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `membri_grupa_idx` ON `membri` (`grupa_id`);--> statement-breakpoint
CREATE TABLE `note_membru` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`membru_id` integer NOT NULL,
	`autor_id` integer,
	`text` text NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`membru_id`) REFERENCES `membri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`autor_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `note_membru_membru_idx` ON `note_membru` (`membru_id`);--> statement-breakpoint
CREATE TABLE `prezente` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`intalnire_id` integer NOT NULL,
	`membru_id` integer NOT NULL,
	`stare` text NOT NULL,
	FOREIGN KEY (`intalnire_id`) REFERENCES `intalniri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membru_id`) REFERENCES `membri`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prezente_intalnire_membru_uq` ON `prezente` (`intalnire_id`,`membru_id`);--> statement-breakpoint
CREATE INDEX `prezente_membru_idx` ON `prezente` (`membru_id`);