CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`job_id` text NOT NULL,
	`message` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_owner_time` ON `events` (`owner`,`at`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`job_id` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`content_type` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `files_owner_job` ON `files` (`owner`,`job_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`owner` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
