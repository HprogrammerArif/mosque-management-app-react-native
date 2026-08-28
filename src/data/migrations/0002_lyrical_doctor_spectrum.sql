CREATE TABLE `funds` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`zakat_eligible` integer DEFAULT false NOT NULL
);
