CREATE TABLE `instagram_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`instagram_business_id` text NOT NULL,
	`access_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instagram_accounts_instagram_business_id_unique` ON `instagram_accounts` (`instagram_business_id`);--> statement-breakpoint
CREATE TABLE `presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`image_prompt` text NOT NULL,
	`video_prompt` text NOT NULL,
	`audio_prompt` text NOT NULL,
	`is_active` integer DEFAULT false,
	`avatar` text,
	`created_at` text DEFAULT '2026-02-16T17:38:41.622Z'
);
