CREATE TABLE `prezente_slujire` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`programare_id` integer NOT NULL,
	`membru_id` integer NOT NULL,
	`stare` text NOT NULL,
	FOREIGN KEY (`programare_id`) REFERENCES `programari_slujire`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membru_id`) REFERENCES `membri`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prezente_slujire_programare_membru_uq` ON `prezente_slujire` (`programare_id`,`membru_id`);--> statement-breakpoint
CREATE INDEX `prezente_slujire_membru_idx` ON `prezente_slujire` (`membru_id`);--> statement-breakpoint
ALTER TABLE `programari_slujire` ADD `prezenta_marcata_de_id` integer REFERENCES lideri(id);--> statement-breakpoint
ALTER TABLE `programari_slujire` ADD `prezenta_marcata_la` integer;--> statement-breakpoint
ALTER TABLE `programari_slujire` ADD `prezenta_nota` text;