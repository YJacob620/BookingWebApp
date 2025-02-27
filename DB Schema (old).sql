-- Host: 127.0.0.1    Database: scientific_infrastructure
-- Server version	8.0.41
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'faculty', 'student', 'guest') NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX email_idx (email)
);

CREATE TABLE IF NOT EXISTS `infrastructures` (
    `id` int NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL UNIQUE,
    `description` text,
    `location` varchar(100) DEFAULT NULL,
    `is_active` tinyint DEFAULT '1',
    PRIMARY KEY (`id`),
    UNIQUE KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Updated Bookings table with new structure
CREATE TABLE IF NOT EXISTS `bookings` (
    `id` int NOT NULL AUTO_INCREMENT,
    `booking_type` ENUM('timeslot', 'booking') NOT NULL DEFAULT 'booking',
    `user_email` VARCHAR(255) NULL,
    `infrastructure_id` int NOT NULL,
    `booking_date` date NOT NULL,
    `start_time` time NOT NULL,
    `end_time` time NOT NULL,
    `status` ENUM(
        'available',
        'pending',
        'approved',
        'rejected',
        'completed',
        'expired',
        'canceled'
    ) NOT NULL DEFAULT 'pending',
    `purpose` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_email`) 
        REFERENCES users(`email`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    FOREIGN KEY (`infrastructure_id`) 
        REFERENCES infrastructures(`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    -- Add indexes for common queries
    INDEX `idx_booking_date` (`booking_date`),
    INDEX `idx_status` (`status`),
    INDEX `idx_booking_type` (`booking_type`),
    -- Add composite indexes for common filtering scenarios
    INDEX `idx_infra_date_status` (`infrastructure_id`, `booking_date`, `status`),
    INDEX `idx_user_bookings` (`user_email`, `booking_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;