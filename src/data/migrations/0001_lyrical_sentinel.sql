CREATE TABLE `donations` (
	`id` text PRIMARY KEY NOT NULL,
	`fund_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'BDT' NOT NULL,
	`occurred_on` text NOT NULL,
	`method` text NOT NULL,
	`donor_household_id` text,
	`donor_name` text,
	`anonymous` integer DEFAULT false NOT NULL,
	`receipt_no` text,
	`note` text,
	`adjusts_id` text,
	`adjustment_reason` text,
	`server_version` integer,
	`change_seq` integer,
	`hlc` text,
	`dirty` integer DEFAULT false NOT NULL,
	`pending_op` text
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address_line1` text,
	`area` text,
	`phone` text,
	`monthly_dues_minor` integer DEFAULT 0 NOT NULL,
	`exempt` integer DEFAULT false NOT NULL,
	`joined_on` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`server_version` integer,
	`change_seq` integer,
	`hlc` text,
	`dirty` integer DEFAULT false NOT NULL,
	`pending_op` text
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mutation_id` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`hlc` text NOT NULL,
	`depends_on` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_mutation_id_unique` ON `outbox` (`mutation_id`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`entity` text PRIMARY KEY NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL,
	`bootstrapped` integer DEFAULT false NOT NULL,
	`last_sync_at` integer
);
