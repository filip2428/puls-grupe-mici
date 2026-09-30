CREATE TABLE `prezente_eveniment` (
	`eveniment_id` integer NOT NULL,
	`membru_id` integer NOT NULL,
	`marcat_de_id` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`eveniment_id`, `membru_id`),
	FOREIGN KEY (`eveniment_id`) REFERENCES `evenimente`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membru_id`) REFERENCES `membri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marcat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `prezente_eveniment_membru_idx` ON `prezente_eveniment` (`membru_id`);