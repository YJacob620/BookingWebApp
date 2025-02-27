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
    `is_verified` TINYINT NOT NULL DEFAULT 0,
    verification_token VARCHAR(255) DEFAULT NULL,
	verification_token_expires TIMESTAMP NULL,
	password_reset_token VARCHAR(255) DEFAULT NULL,
	password_reset_expires TIMESTAMP NULL,
    INDEX email_idx (email),
    INDEX idx_users_verification_token (verification_token),
	INDEX idx_users_password_reset_token (password_reset_token)
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

-- Bookings table
CREATE TABLE IF NOT EXISTS `bookings` (
    `id` int NOT NULL AUTO_INCREMENT,
    `booking_type` ENUM('timeslot', 'booking') NOT NULL DEFAULT 'timeslot',
    `user_email` VARCHAR(255) DEFAULT NULL,
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
    ) NOT NULL DEFAULT 'available',
    `purpose` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_email`) 
        REFERENCES users(`email`),
    FOREIGN KEY (`infrastructure_id`) 
        REFERENCES infrastructures(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Constraint that ensures that user_email will be NULL if and only if booking_type will be 'timeslot'.
ALTER TABLE bookings DROP CONSTRAINT check_timeslot_has_no_user;
ALTER TABLE bookings
ADD CONSTRAINT check_timeslot_has_no_user
CHECK ((booking_type = 'timeslot' AND user_email IS NULL) OR 
       (booking_type = 'booking' AND user_email IS NOT NULL));
       
-- Procedure for when a user books a timeslot
DROP PROCEDURE IF EXISTS book_timeslot;
DELIMITER //
CREATE PROCEDURE book_timeslot(
    IN p_timeslot_id INT,
    IN p_user_email VARCHAR(255),
    IN p_purpose TEXT
)
BEGIN
    DECLARE slot_exists INT;
    SELECT COUNT(*) INTO slot_exists 
    FROM bookings 
    WHERE id = p_timeslot_id 
      AND booking_type = 'timeslot' 
      AND status = 'available';
    IF slot_exists > 0 THEN
        UPDATE bookings
        SET booking_type = 'booking',
            user_email = p_user_email,
            status = 'pending',
            purpose = p_purpose
        WHERE id = p_timeslot_id;
        
        SELECT 'Timeslot booked successfully' AS message;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Timeslot not found or not available';
    END IF;
END //
DELIMITER ;

-- Event that will update the statuses of past bookings and timeslots
SET GLOBAL event_scheduler = ON;
DROP PROCEDURE IF EXISTS update_past_statuses;
DELIMITER //
CREATE PROCEDURE update_past_statuses()
BEGIN
    -- Declare variables to track counts
    DECLARE completed_count INT DEFAULT 0;
    DECLARE expired_count INT DEFAULT 0;
    DECLARE expired_timeslots_count INT DEFAULT 0;
    
    -- Start transaction for consistency
    START TRANSACTION;
    
    -- Update approved bookings to completed
    UPDATE bookings 
    SET status = 'completed' 
    WHERE status = 'approved' 
    AND booking_type = 'booking'
    AND CONCAT(booking_date, ' ', end_time) < NOW();
    
    SET completed_count = ROW_COUNT();
    
    -- Update pending bookings to expired
    UPDATE bookings 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND booking_type = 'booking'
    AND CONCAT(booking_date, ' ', end_time) < NOW();
    
    SET expired_count = ROW_COUNT();
    
    -- Update available timeslots to expired
    UPDATE bookings 
    SET status = 'expired' 
    WHERE status = 'available' 
    AND booking_type = 'timeslot'
    AND CONCAT(booking_date, ' ', end_time) < NOW();
    
    SET expired_timeslots_count = ROW_COUNT();
    
    -- Commit the transaction
    COMMIT;
    
    -- For logging purposes (can be viewed in MySQL logs)
    SELECT CONCAT('Status update completed: ', completed_count, ' bookings marked as completed, ', 
                 expired_count, ' bookings marked as expired, ', 
                 expired_timeslots_count, ' timeslots marked as expired') AS result;
END //
DELIMITER ;
DROP EVENT IF EXISTS update_bookings_statuses;
CREATE EVENT update_bookings_statuses
ON SCHEDULE EVERY 5 MINUTE
STARTS CURRENT_TIMESTAMP
DO
    CALL update_past_statuses();