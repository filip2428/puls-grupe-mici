CREATE TABLE `biserici` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nume` text NOT NULL,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `biserici_nume_uq` ON `biserici` (`nume`);--> statement-breakpoint
ALTER TABLE `membri` ADD `biserica_id` integer REFERENCES biserici(id);--> statement-breakpoint
-- Bisericile scrise pana acum pe fiecare pulsist trec in tabelul lor.
INSERT INTO `biserici` (`nume`) SELECT DISTINCT trim(`biserica_nume`) FROM `membri` WHERE `biserica_nume` IS NOT NULL AND trim(`biserica_nume`) <> '';--> statement-breakpoint
UPDATE `membri` SET `biserica_id` = (SELECT `id` FROM `biserici` WHERE `biserici`.`nume` = trim(`membri`.`biserica_nume`)) WHERE `biserica_nume` IS NOT NULL AND trim(`biserica_nume`) <> '';
