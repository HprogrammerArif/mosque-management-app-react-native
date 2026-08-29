CREATE TABLE `expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`zakat_eligible` integer DEFAULT false NOT NULL
);
