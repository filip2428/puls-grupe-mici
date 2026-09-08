CREATE TABLE `prietenii` (
	`membru_a_id` integer NOT NULL,
	`membru_b_id` integer NOT NULL,
	`creat_de_id` integer,
	`creat_la` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`membru_a_id`, `membru_b_id`),
	FOREIGN KEY (`membru_a_id`) REFERENCES `membri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membru_b_id`) REFERENCES `membri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creat_de_id`) REFERENCES `lideri`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `prietenii_b_idx` ON `prietenii` (`membru_b_id`);--> statement-breakpoint
ALTER TABLE `membri` ADD `biserica` text;--> statement-breakpoint
ALTER TABLE `membri` ADD `biserica_nume` text;