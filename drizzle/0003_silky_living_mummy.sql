CREATE TABLE `abonamente_push` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lider_id` integer NOT NULL,
	`endpoint` text NOT NULL,
	`cheie_p256dh` text NOT NULL,
	`cheie_auth` text NOT NULL,
	`descriere` text,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	`ultima_folosire` integer,
	FOREIGN KEY (`lider_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `abonamente_push_endpoint_uq` ON `abonamente_push` (`endpoint`);--> statement-breakpoint
CREATE INDEX `abonamente_push_lider_idx` ON `abonamente_push` (`lider_id`);