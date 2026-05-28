CREATE TABLE `deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`route_id` int NOT NULL,
	`community_id` int NOT NULL,
	`driver_id` int NOT NULL,
	`sequence_order` int NOT NULL,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`water_volume` float,
	`arrival_time` timestamp,
	`completion_time` timestamp,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_confirmations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivery_id` int NOT NULL,
	`photo_url` varchar(512),
	`signature_url` varchar(512),
	`recipient_name` varchar(255),
	`notes` text,
	`confirmed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_confirmations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`truck_id` int,
	`status` enum('available','on_route','offline') NOT NULL DEFAULT 'available',
	`current_latitude` decimal(10,8),
	`current_longitude` decimal(11,8),
	`last_updated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
