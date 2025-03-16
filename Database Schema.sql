-- Host: 127.0.0.1    Database: scientific_infrastructure
-- Server version	8.0.41
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'manager', 'faculty', 'student', 'guest') NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `is_verified` TINYINT NOT NULL DEFAULT 0,
    verification_token VARCHAR(255) DEFAULT NULL,
	verification_token_expires TIMESTAMP NULL,
	password_reset_token VARCHAR(255) DEFAULT NULL,
	password_reset_expires TIMESTAMP NULL,
    email_notifications TINYINT NOT NULL DEFAULT 1,
    is_blacklisted TINYINT NOT NULL DEFAULT 0,
    INDEX email_idx (email),
    INDEX idx_users_verification_token (verification_token),
	INDEX idx_users_password_reset_token (password_reset_token)
);

CREATE TABLE IF NOT EXISTS `infrastructures` (
    `id` int NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL UNIQUE DEFAULT 'infrastructure name',
    `description` text,
    `location` varchar(100) DEFAULT NULL,
    `is_active` tinyint NOT NULL DEFAULT '1',
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

CREATE TABLE IF NOT EXISTS infrastructure_managers ( 
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    infrastructure_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (infrastructure_id) REFERENCES infrastructures(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, infrastructure_id)
);

--  Table for infrastructure filter-questions
CREATE TABLE IF NOT EXISTS infrastructure_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    infrastructure_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('dropdown', 'text', 'number', 'document') NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    options TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (infrastructure_id) REFERENCES infrastructures(id) ON DELETE CASCADE
);

 --  Table for user answers on the filter-questions
CREATE TABLE IF NOT EXISTS booking_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_text TEXT,
    document_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES infrastructure_questions(id) ON DELETE CASCADE
);

-- Table for secure email tokens
CREATE TABLE IF NOT EXISTS `email_action_tokens` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `token` VARCHAR(255) NOT NULL,
  `booking_id` INT NOT NULL,
  `action` ENUM('approve', 'reject') NOT NULL,
  `expires` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `used_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_token` (`token`),
  INDEX `idx_booking_id` (`booking_id`),
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
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

-- Procedure for when a user cancels a booking (it also creates a new timeslot)
DROP PROCEDURE IF EXISTS UserCancelBooking;
DELIMITER //
CREATE PROCEDURE UserCancelBooking(
    IN booking_id INT,
    IN user_email_param VARCHAR(255),
    OUT success BOOLEAN,
    OUT message VARCHAR(255)
)
BEGIN
    DECLARE booking_exists INT DEFAULT 0;
    DECLARE valid_status BOOLEAN DEFAULT FALSE;
    DECLARE hours_difference DECIMAL(10,2);
    DECLARE booking_infrastructure_id INT;
    DECLARE booking_date_val DATE;
    DECLARE start_time_val TIME;
    DECLARE end_time_val TIME;
    SET success = FALSE; -- Check transaction isolation level
    
    START TRANSACTION;
    -- First check if the booking exists
    SELECT COUNT(*) INTO booking_exists
    FROM bookings 
    WHERE id = booking_id 
      AND user_email = user_email_param
      AND booking_type = 'booking';
    
    IF booking_exists = 0 THEN
        SET message = 'Booking not found';
        ROLLBACK;
    ELSE
        -- If it exists, get the booking details separately
        SELECT infrastructure_id, booking_date, start_time, end_time, `status` INTO 
            booking_infrastructure_id, booking_date_val, start_time_val, end_time_val, @status
        FROM bookings 
        WHERE id = booking_id;
        
        -- Check if status is valid for cancellation
        SET valid_status = (@status = 'pending' OR @status = 'approved');
        IF NOT valid_status THEN
            SET message = 'Only pending or approved bookings can be canceled by the user';
            ROLLBACK;
        ELSE
            -- Check if booking is within 24 hours
            SET hours_difference = TIMESTAMPDIFF(HOUR, NOW(), CONCAT(booking_date_val, ' ', start_time_val));
            IF hours_difference <= 24 THEN
                SET message = 'Bookings within 24 hours cannot be canceled';
                ROLLBACK;
            ELSE
                -- Update the booking status to 'canceled'
                UPDATE bookings 
                SET status = 'canceled' 
                WHERE id = booking_id;
                
                -- Create a new timeslot with the same date and time but status 'available'
                INSERT INTO bookings (
                    booking_type, 
                    infrastructure_id, 
                    booking_date, 
                    start_time, 
                    end_time, 
                    status
                ) VALUES (
                    'timeslot',
                    booking_infrastructure_id,
                    booking_date_val,
                    start_time_val,
                    end_time_val,
                    'available'
                );
                
                SET success = TRUE;
                SET message = 'Booking canceled successfully';
                COMMIT;
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;

-- Procedure for when an admin rejects or cancels a booking (it also creates a new timeslot)
DROP PROCEDURE IF EXISTS AdminRejectOrCancelBooking;
DELIMITER //
CREATE PROCEDURE AdminRejectOrCancelBooking(
    IN booking_id INT,
    IN new_status VARCHAR(20)
)
BEGIN
    DECLARE booking_infra_id INT;
    DECLARE booking_date_param DATE;
    DECLARE start_time_val TIME;
    DECLARE end_time_val TIME;
    DECLARE current_status VARCHAR(20);
    
    -- First, get the booking details
    SELECT 
        infrastructure_id, 
        booking_date, 
        start_time, 
        end_time,
        `status`
    INTO 
        booking_infra_id, 
        booking_date_param, 
        start_time_val, 
        end_time_val,
        current_status
    FROM bookings 
    WHERE id = booking_id;
    
    -- Verify the booking exists
    IF booking_infra_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Booking not found';
    END IF;
    
    -- Verify the status is valid
    IF new_status NOT IN ('rejected', 'canceled') THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid status. Must be "rejected" or "canceled"';
    END IF;
    
    -- Update the booking status
    UPDATE bookings 
    SET status = new_status 
    WHERE id = booking_id;
    
	-- Create a new available timeslot
	INSERT INTO bookings (
		booking_type,
		infrastructure_id,
		booking_date,
		start_time,
		end_time,
		`status`
	) VALUES (
		'timeslot',
		booking_infra_id,
		booking_date_param,
		start_time_val,
		end_time_val,
		'available'
	);
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
	AND CONCAT(booking_date, ' ', start_time) < NOW();
    
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