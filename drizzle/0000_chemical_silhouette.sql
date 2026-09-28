CREATE TABLE `compositions` (
	`map` text PRIMARY KEY NOT NULL,
	`picks` text DEFAULT '{}' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
