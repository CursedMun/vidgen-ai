CREATE TABLE `cron_executions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cron_id` integer NOT NULL,
	`youtube_account_id` integer,
	`instagram_account_id` integer,
	`status` text DEFAULT 'pending',
	`external_id` text,
	`error_message` text,
	`executed_at` text,
	FOREIGN KEY (`cron_id`) REFERENCES `publication_crons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`youtube_account_id`) REFERENCES `youtube_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instagram_account_id`) REFERENCES `instagram_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `publication_crons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`preset_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`interval` text NOT NULL,
	`source_url` text,
	`video_path` text,
	`media_type` text DEFAULT 'video',
	`ai_model` text DEFAULT 'chatgpt',
	`scheduled_at` text NOT NULL,
	`status` text DEFAULT 'generating',
	`created_at` text DEFAULT '2026-02-24T14:09:50.263Z',
	FOREIGN KEY (`preset_id`) REFERENCES `presets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `youtube_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`access_token` text,
	`refresh_token` text NOT NULL,
	`expiry_date` integer,
	`client_id` text
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`image_prompt` text NOT NULL,
	`video_prompt` text NOT NULL,
	`audio_prompt` text NOT NULL,
	`is_active` integer DEFAULT false,
	`avatar` text,
	`created_at` text DEFAULT '2026-02-24T14:09:50.262Z'
);
--> statement-breakpoint
INSERT INTO `__new_presets`("id", "name", "image_prompt", "video_prompt", "audio_prompt", "is_active", "avatar", "created_at") SELECT "id", "name", "image_prompt", "video_prompt", "audio_prompt", "is_active", "avatar", "created_at" FROM `presets`;--> statement-breakpoint
DROP TABLE `presets`;--> statement-breakpoint
ALTER TABLE `__new_presets` RENAME TO `presets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;