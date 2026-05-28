CREATE TABLE `communities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`reservoir_level` float NOT NULL,
	`population` int NOT NULL,
	`days_without_water` int NOT NULL,
	`temperature` float NOT NULL,
	`priority` int DEFAULT 0,
	`priority_score` float DEFAULT 0,
	`last_updated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `critical_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`community_id` int NOT NULL,
	`type` enum('low_reservoir','days_without_water','high_temperature') NOT NULL,
	`message` text NOT NULL,
	`is_read` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `critical_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ranking_justifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`community_id` int NOT NULL,
	`justification` text NOT NULL,
	`recommended_actions` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ranking_justifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`truck_id` int NOT NULL,
	`community_order` text NOT NULL,
	`total_distance` float NOT NULL,
	`estimated_time` int NOT NULL,
	`status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`community_id` int NOT NULL,
	`truck_id` int NOT NULL,
	`water_volume` float NOT NULL,
	`reservoir_level_before` float NOT NULL,
	`reservoir_level_after` float NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supply_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trucks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`capacity` float NOT NULL,
	`status` enum('available','in_route','maintenance','offline') NOT NULL DEFAULT 'available',
	`current_latitude` decimal(10,8),
	`current_longitude` decimal(11,8),
	`last_updated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trucks_id` PRIMARY KEY(`id`)
);
