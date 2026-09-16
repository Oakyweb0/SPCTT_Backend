import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'spctt_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

export async function initDatabase() {
  try {
    // 1. Check/create database if not exists
    const rootConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConnection.end();

    // 2. Create pool for database
    pool = mysql.createPool(dbConfig);

    // 3. Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`title\` VARCHAR(20) DEFAULT 'Mr.',
        \`name\` VARCHAR(150) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL UNIQUE,
        \`organization\` VARCHAR(255) DEFAULT NULL,
        \`phone\` VARCHAR(30) DEFAULT NULL,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` ENUM('admin', 'user', 'manager') DEFAULT 'user',
        \`address\` TEXT DEFAULT NULL,
        \`city\` VARCHAR(100) DEFAULT NULL,
        \`state\` VARCHAR(100) DEFAULT NULL,
        \`country\` VARCHAR(100) DEFAULT 'India',
        \`pincode\` VARCHAR(20) DEFAULT NULL,
        \`avatar\` VARCHAR(255) DEFAULT NULL,
        \`status\` ENUM('active', 'inactive', 'banned') DEFAULT 'active',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure users table has missing columns if table already existed previously
    const [userColumns] = await pool.query(`SHOW COLUMNS FROM \`users\``);
    const existingColNames = userColumns.map(c => c.Field);

    if (!existingColNames.includes('title')) {
      await pool.query("ALTER TABLE `users` ADD COLUMN `title` VARCHAR(20) DEFAULT 'Mr.' AFTER `id`");
    }
    if (!existingColNames.includes('organization')) {
      await pool.query("ALTER TABLE `users` ADD COLUMN `organization` VARCHAR(255) DEFAULT NULL AFTER `email`");
    }
    if (!existingColNames.includes('address')) {
      await pool.query("ALTER TABLE `users` ADD COLUMN `address` TEXT DEFAULT NULL AFTER `role`");
    }
    if (!existingColNames.includes('city')) {
      await pool.query("ALTER TABLE `users` ADD COLUMN `city` VARCHAR(100) DEFAULT NULL AFTER `address`");
    }
    if (!existingColNames.includes('state')) {
      await pool.query("ALTER TABLE `users` ADD COLUMN `state` VARCHAR(100) DEFAULT NULL AFTER `city`");
    }
    if (!existingColNames.includes('country')) {
      await pool.query("ALTER TABLE `users` ADD COLUMN `country` VARCHAR(100) DEFAULT 'India' AFTER `state`");
    }
    if (!existingColNames.includes('pincode')) {
      await pool.query("ALTER TABLE `users` ADD COLUMN `pincode` VARCHAR(20) DEFAULT NULL AFTER `country`");
    }

    // 4. Create registration_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`registration_categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(150) NOT NULL,
        \`code\` VARCHAR(100) NOT NULL UNIQUE,
        \`price\` DECIMAL(10, 2) NOT NULL,
        \`currency\` VARCHAR(10) DEFAULT 'INR',
        \`description\` TEXT DEFAULT NULL,
        \`status\` ENUM('active', 'inactive') DEFAULT 'active',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default categories
    const defaultCategories = [
      { name: 'SPCTT Members (Consultants)', code: 'SPCTT_MEMBERS', price: 3250.00 },
      { name: 'Non-Members (Consultants)', code: 'NON_MEMBERS', price: 4000.00 },
      { name: 'Fellows/ Students', code: 'FELLOWS_STUDENTS', price: 2500.00 },
      { name: 'Nurses', code: 'NURSES', price: 2000.00 },
      { name: 'Industry Delegates', code: 'INDUSTRY_DELEGATES', price: 6000.00 }
    ];

    for (const cat of defaultCategories) {
      const [exists] = await pool.query("SELECT id FROM `registration_categories` WHERE `code` = ? LIMIT 1", [cat.code]);
      if (exists.length === 0) {
        await pool.query(
          "INSERT INTO `registration_categories` (`name`, `code`, `price`) VALUES (?, ?, ?)",
          [cat.name, cat.code, cat.price]
        );
      }
    }

    // 5. Create registrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`registrations\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`registration_code\` VARCHAR(50) NOT NULL UNIQUE,
        \`user_id\` INT NOT NULL,
        \`category_id\` INT DEFAULT NULL,
        \`category_name\` VARCHAR(150) DEFAULT NULL,
        \`category_price\` DECIMAL(10, 2) DEFAULT 0.00,
        \`title\` VARCHAR(20) DEFAULT 'Mr.',
        \`full_name\` VARCHAR(150) DEFAULT NULL,
        \`email\` VARCHAR(150) DEFAULT NULL,
        \`organization\` VARCHAR(255) DEFAULT NULL,
        \`phone\` VARCHAR(30) DEFAULT NULL,
        \`address\` TEXT DEFAULT NULL,
        \`city\` VARCHAR(100) DEFAULT NULL,
        \`state\` VARCHAR(100) DEFAULT NULL,
        \`country\` VARCHAR(100) DEFAULT 'India',
        \`pincode\` VARCHAR(20) DEFAULT NULL,
        \`accompanying_count\` INT DEFAULT 0,
        \`accompanying_persons\` JSON DEFAULT NULL,
        \`accompanying_total\` DECIMAL(10, 2) DEFAULT 0.00,
        \`billing_entity_name\` VARCHAR(255) DEFAULT NULL,
        \`billing_address\` TEXT DEFAULT NULL,
        \`gst_number\` VARCHAR(50) DEFAULT NULL,
        \`pan_number\` VARCHAR(30) DEFAULT NULL,
        \`subtotal\` DECIMAL(10, 2) DEFAULT 0.00,
        \`gst_rate\` DECIMAL(5, 2) DEFAULT 18.00,
        \`gst_amount\` DECIMAL(10, 2) DEFAULT 0.00,
        \`grand_total\` DECIMAL(10, 2) DEFAULT 0.00,
        \`payment_method\` VARCHAR(100) DEFAULT 'Axis Razorpay (Elisyan India)',
        \`payment_status\` ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        \`transaction_id\` VARCHAR(100) DEFAULT NULL,
        \`paid_at\` DATETIME DEFAULT NULL,
        \`step_completed\` INT DEFAULT 1,
        \`status\` ENUM('draft', 'submitted', 'confirmed', 'cancelled') DEFAULT 'draft',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`user_id\`),
        INDEX (\`registration_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Create invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`invoices\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`invoice_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`registration_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`invoice_type\` ENUM('proforma_primary', 'proforma_accompanying', 'tax_invoice', 'receipt') DEFAULT 'proforma_primary',
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`quantity\` INT DEFAULT 1,
        \`rate\` DECIMAL(10, 2) NOT NULL,
        \`amount\` DECIMAL(10, 2) NOT NULL,
        \`gst_rate\` DECIMAL(5, 2) DEFAULT 18.00,
        \`gst_amount\` DECIMAL(10, 2) NOT NULL,
        \`total_amount\` DECIMAL(10, 2) NOT NULL,
        \`status\` ENUM('unpaid', 'paid', 'cancelled') DEFAULT 'unpaid',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (\`registration_id\`),
        INDEX (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Create abstracts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`abstracts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`abstract_code\` VARCHAR(50) NOT NULL UNIQUE,
        \`user_id\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`authors\` TEXT NOT NULL,
        \`affiliation\` TEXT NOT NULL,
        \`category\` VARCHAR(100) NOT NULL,
        \`abstract_text\` LONGTEXT NOT NULL,
        \`file_url\` VARCHAR(255) DEFAULT NULL,
        \`status\` ENUM('submitted', 'under_review', 'accepted', 'rejected') DEFAULT 'submitted',
        \`review_comments\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Seed default super admin if none exists
    const [existingAdmins] = await pool.query("SELECT id FROM `users` WHERE `role` = 'admin' LIMIT 1");
    if (existingAdmins.length === 0) {
      const bcrypt = (await import('bcryptjs')).default;
      const defaultHash = await bcrypt.hash('Admin@123', 10);
      await pool.query(
        "INSERT INTO `users` (`title`, `name`, `email`, `organization`, `phone`, `password`, `role`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ['Dr.', 'SPCTT Administrator', 'admin@spctt.org', 'SPCTT Organization', '+91 9876543210', defaultHash, 'admin', 'active']
      );
      console.log("👤 Default super admin created: admin@spctt.org / Admin@123");
    }

    console.log(`✅ MySQL Database '${dbConfig.database}' connected and initialized successfully with all tables.`);
    return pool;
  } catch (error) {
    console.error('❌ Database connection/initialization failed:', error.message);
    throw error;
  }
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export default { initDatabase, getPool };
