CREATE TABLE `mosques` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prayer_config` (
	`mosque_id` text PRIMARY KEY NOT NULL,
	`calculation_method` text NOT NULL,
	`fajr_offset_min` integer DEFAULT 0 NOT NULL,
	`dhuhr_offset_min` integer DEFAULT 0 NOT NULL,
	`asr_offset_min` integer DEFAULT 0 NOT NULL,
	`maghrib_offset_min` integer DEFAULT 0 NOT NULL,
	`isha_offset_min` integer DEFAULT 0 NOT NULL,
	`fajr_fixed_time` text,
	`dhuhr_fixed_time` text,
	`asr_fixed_time` text,
	`maghrib_fixed_time` text,
	`isha_fixed_time` text,
	`jumuah_time` text,
	FOREIGN KEY (`mosque_id`) REFERENCES `mosques`(`id`) ON UPDATE no action ON DELETE no action
);
