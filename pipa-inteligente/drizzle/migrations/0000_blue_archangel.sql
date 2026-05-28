CREATE TABLE `communities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`reservoir_level` real NOT NULL,
	`population` integer NOT NULL,
	`days_without_water` integer NOT NULL,
	`temperature` real NOT NULL,
	`priority` integer DEFAULT 0,
	`priority_score` real DEFAULT 0,
	`last_updated` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `critical_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`community_id` integer NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`route_id` integer NOT NULL,
	`community_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	`sequence_order` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`water_volume` real,
	`arrival_time` text,
	`completion_time` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_confirmations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`delivery_id` integer NOT NULL,
	`photo_url` text,
	`signature_url` text,
	`recipient_name` text,
	`notes` text,
	`confirmed_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`truck_id` integer,
	`status` text DEFAULT 'available' NOT NULL,
	`current_latitude` real,
	`current_longitude` real,
	`last_updated` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `model_weights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservoir` real DEFAULT 0.35 NOT NULL,
	`population` real DEFAULT 0.25 NOT NULL,
	`days_without_water` real DEFAULT 0.25 NOT NULL,
	`temperature` real DEFAULT 0.15 NOT NULL,
	`sample_count` integer DEFAULT 0 NOT NULL,
	`trained_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ranking_justifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`community_id` integer NOT NULL,
	`justification` text NOT NULL,
	`recommended_actions` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`truck_id` integer NOT NULL,
	`community_order` text NOT NULL,
	`total_distance` real NOT NULL,
	`estimated_time` integer NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sensor_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`community_id` integer NOT NULL,
	`reservoir_level` real NOT NULL,
	`temperature` real,
	`sensor_id` text,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supply_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`community_id` integer NOT NULL,
	`truck_id` integer NOT NULL,
	`water_volume` real NOT NULL,
	`reservoir_level_before` real NOT NULL,
	`reservoir_level_after` real NOT NULL,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trucks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`capacity` real NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`current_latitude` real,
	`current_longitude` real,
	`last_updated` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	`lastSignedIn` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);