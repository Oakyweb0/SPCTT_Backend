-- Database: spctt_db
CREATE DATABASE IF NOT EXISTS `spctt_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `spctt_db`;

-- Table structure for table `users`
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(20) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'user', 'manager') DEFAULT 'user',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active', 'inactive', 'banned') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional default admin account (Password: Admin@123)
-- Hash generated using password_hash('Admin@123', PASSWORD_BCRYPT)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `status`)
VALUES (
  1,
  'Admin User',
  'admin@spctt.org',
  '9876543210',
  '$2y$10$f3WnJg5Uqy5/W3U7E7iV0eT3Qf1q5qQ10cO5mY5N5xY8L0r7E3P9K',
  'admin',
  'active'
);
