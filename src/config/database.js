import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './env.js';

let pool;

/**
 * Get existing tables in the configured database
 */
async function getExistingTables(connectionOrPool, dbName) {
  try {
    const [rows] = await connectionOrPool.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [dbName]
    );
    return new Set(rows.map((r) => r.TABLE_NAME || r.table_name));
  } catch (err) {
    try {
      const [rows] = await connectionOrPool.query('SHOW TABLES');
      return new Set(rows.map((r) => Object.values(r)[0]));
    } catch (fallbackErr) {
      console.warn('Could not query existing tables list:', fallbackErr.message);
      return new Set();
    }
  }
}

/**
 * Initialize Database Connection and run auto-migrations / seeders
 */
export async function initDatabase() {
  try {
    // 1. Attempt database creation if running on standard root/local setup
    try {
      const rootConnection = await mysql.createConnection({
        host: config.DB.HOST,
        port: config.DB.PORT,
        user: config.DB.USER,
        password: config.DB.PASSWORD
      });

      const [dbRows] = await rootConnection.query(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
        [config.DB.NAME]
      );

      if (dbRows.length === 0) {
        console.log(`Database '${config.DB.NAME}' does not exist. Creating...`);
        await rootConnection.query(
          `CREATE DATABASE \`${config.DB.NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        console.log(`Database '${config.DB.NAME}' created successfully.`);
      }

      await rootConnection.end();
    } catch (createDbErr) {
      // Server environments may not allow create database permissions - ignore and proceed
    }

    // 2. Initialize connection pool
    pool = mysql.createPool({
      host: config.DB.HOST,
      port: config.DB.PORT,
      user: config.DB.USER,
      password: config.DB.PASSWORD,
      database: config.DB.NAME,
      waitForConnections: true,
      connectionLimit: config.DB.CONNECTION_LIMIT,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    connection.release();

    // 3. Inspect existing tables & run schema updates (safely wrapped for restricted user permissions)
    try {
      const existingTables = await getExistingTables(pool, config.DB.NAME);

      // 4. Create Users Table
      if (!existingTables.has('users')) {
        console.log("Table 'users' does not exist. Creating...");
        await pool.query(`
          CREATE TABLE \`users\` (
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
            \`reset_token\` VARCHAR(255) DEFAULT NULL,
            \`reset_token_expires\` DATETIME DEFAULT NULL,
            \`status\` ENUM('active', 'inactive', 'banned') DEFAULT 'active',
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Table 'users' created.");
      } else {
        // Ensure missing columns exist (with individual try/catch in case of restricted ALTER privileges)
        try {
          const [userColumns] = await pool.query('SHOW COLUMNS FROM `users`');
          const existingColNames = userColumns.map((c) => c.Field);

          const missingColumns = [
            { name: 'title', query: "ALTER TABLE `users` ADD COLUMN `title` VARCHAR(20) DEFAULT 'Mr.' AFTER `id`" },
            { name: 'organization', query: "ALTER TABLE `users` ADD COLUMN `organization` VARCHAR(255) DEFAULT NULL AFTER `email`" },
            { name: 'address', query: "ALTER TABLE `users` ADD COLUMN `address` TEXT DEFAULT NULL AFTER `role`" },
            { name: 'city', query: "ALTER TABLE `users` ADD COLUMN `city` VARCHAR(100) DEFAULT NULL AFTER `address`" },
            { name: 'state', query: "ALTER TABLE `users` ADD COLUMN `state` VARCHAR(100) DEFAULT NULL AFTER `city`" },
            { name: 'country', query: "ALTER TABLE `users` ADD COLUMN `country` VARCHAR(100) DEFAULT 'India' AFTER `state`" },
            { name: 'pincode', query: "ALTER TABLE `users` ADD COLUMN `pincode` VARCHAR(20) DEFAULT NULL AFTER `country`" },
            { name: 'reset_token', query: "ALTER TABLE `users` ADD COLUMN `reset_token` VARCHAR(255) DEFAULT NULL AFTER `avatar`" },
            { name: 'reset_token_expires', query: "ALTER TABLE `users` ADD COLUMN `reset_token_expires` DATETIME DEFAULT NULL AFTER `reset_token`" }
          ];

          for (const col of missingColumns) {
            if (!existingColNames.includes(col.name)) {
              try {
                await pool.query(col.query);
              } catch (alterErr) {
                console.warn(`Could not add column '${col.name}':`, alterErr.message);
              }
            }
          }
        } catch (colCheckErr) {
          console.warn('Could not inspect users columns:', colCheckErr.message);
        }
      }

      // 5. Create Registration Categories Table
      if (!existingTables.has('registration_categories')) {
        console.log("Table 'registration_categories' does not exist. Creating...");
        await pool.query(`
          CREATE TABLE \`registration_categories\` (
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
        console.log("Table 'registration_categories' created.");
      }

      // Seed default categories
      try {
        const defaultCategories = [
          { name: 'SPCTT Members (Consultants)', code: 'SPCTT_MEMBERS', price: 3250.00 },
          { name: 'Non-Members (Consultants)', code: 'NON_MEMBERS', price: 4000.00 },
          { name: 'Fellows/ Students', code: 'FELLOWS_STUDENTS', price: 2500.00 },
          { name: 'Nurses', code: 'NURSES', price: 2000.00 },
          { name: 'Industry Delegates', code: 'INDUSTRY_DELEGATES', price: 6000.00 },
          { name: 'Accompanying Persons (including children > 10 yrs old)', code: 'ACCOMPANYING_PERSONS', price: 4000.00 }
        ];

        for (const cat of defaultCategories) {
          const [exists] = await pool.query('SELECT id FROM `registration_categories` WHERE `code` = ? LIMIT 1', [cat.code]);
          if (exists.length === 0) {
            await pool.query(
              'INSERT INTO `registration_categories` (`name`, `code`, `price`) VALUES (?, ?, ?)',
              [cat.name, cat.code, cat.price]
            );
          }
        }
      } catch (seedCatErr) {
        console.warn('Seeding registration categories skipped/failed:', seedCatErr.message);
      }

      // 6. Create Registrations Table
      if (!existingTables.has('registrations')) {
        console.log("Table 'registrations' does not exist. Creating...");
        await pool.query(`
          CREATE TABLE \`registrations\` (
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
        console.log("Table 'registrations' created.");
      }

      // 7. Create Invoices Table
      if (!existingTables.has('invoices')) {
        console.log("Table 'invoices' does not exist. Creating...");
        await pool.query(`
          CREATE TABLE \`invoices\` (
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
        console.log("Table 'invoices' created.");
      }

      // 8. Create Abstracts Table
      if (!existingTables.has('abstracts')) {
        console.log("Table 'abstracts' does not exist. Creating...");
        await pool.query(`
          CREATE TABLE \`abstracts\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`abstract_code\` VARCHAR(50) NOT NULL UNIQUE,
            \`user_id\` INT NOT NULL,
            \`name\` VARCHAR(150) DEFAULT NULL,
            \`institute_name\` VARCHAR(255) DEFAULT NULL,
            \`category\` VARCHAR(100) NOT NULL DEFAULT 'Poster',
            \`email\` VARCHAR(150) DEFAULT NULL,
            \`phone\` VARCHAR(50) DEFAULT NULL,
            \`topic\` VARCHAR(255) DEFAULT NULL,
            \`title\` VARCHAR(255) DEFAULT NULL,
            \`authors\` TEXT DEFAULT NULL,
            \`affiliation\` TEXT DEFAULT NULL,
            \`abstract_text\` LONGTEXT DEFAULT NULL,
            \`pdf_url\` VARCHAR(255) DEFAULT NULL,
            \`file_url\` VARCHAR(255) DEFAULT NULL,
            \`status\` ENUM('submitted', 'under_review', 'accepted', 'rejected') DEFAULT 'submitted',
            \`review_comments\` TEXT DEFAULT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (\`user_id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Table 'abstracts' created.");
      } else {
        // Ensure missing columns exist in existing abstracts table
        try {
          const [absColumns] = await pool.query('SHOW COLUMNS FROM `abstracts`');
          const existingAbsColNames = absColumns.map((c) => c.Field);

          const missingAbsColumns = [
            { name: 'name', query: "ALTER TABLE `abstracts` ADD COLUMN `name` VARCHAR(150) DEFAULT NULL AFTER `user_id`" },
            { name: 'institute_name', query: "ALTER TABLE `abstracts` ADD COLUMN `institute_name` VARCHAR(255) DEFAULT NULL AFTER `name`" },
            { name: 'email', query: "ALTER TABLE `abstracts` ADD COLUMN `email` VARCHAR(150) DEFAULT NULL AFTER `category`" },
            { name: 'phone', query: "ALTER TABLE `abstracts` ADD COLUMN `phone` VARCHAR(50) DEFAULT NULL AFTER `email`" },
            { name: 'topic', query: "ALTER TABLE `abstracts` ADD COLUMN `topic` VARCHAR(255) DEFAULT NULL AFTER `phone`" },
            { name: 'pdf_url', query: "ALTER TABLE `abstracts` ADD COLUMN `pdf_url` VARCHAR(255) DEFAULT NULL AFTER `abstract_text`" }
          ];

          for (const col of missingAbsColumns) {
            if (!existingAbsColNames.includes(col.name)) {
              try {
                await pool.query(col.query);
              } catch (alterErr) {
                console.warn(`Could not add column '${col.name}' to abstracts:`, alterErr.message);
              }
            }
          }

          // Drop image_url column if it exists in abstracts table
          if (existingAbsColNames.includes('image_url')) {
            try {
              await pool.query('ALTER TABLE `abstracts` DROP COLUMN `image_url`');
              console.log("Column 'image_url' removed from abstracts table.");
            } catch (dropErr) {
              console.warn("Could not drop column 'image_url' from abstracts:", dropErr.message);
            }
          }
        } catch (colCheckErr) {
          console.warn('Could not inspect abstracts columns:', colCheckErr.message);
        }
      }

      // 9. Seed default super admin
      try {
        const [existingAdmins] = await pool.query("SELECT id FROM `users` WHERE `role` = 'admin' LIMIT 1");
        if (existingAdmins.length === 0) {
          const defaultHash = await bcrypt.hash('Admin@123', 10);
          await pool.query(
            'INSERT INTO `users` (`title`, `name`, `email`, `organization`, `phone`, `password`, `role`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['Dr.', 'SPCTT Administrator', 'admin@spctt.org', 'SPCTT Organization', '+91 9876543210', defaultHash, 'admin', 'active']
          );
          console.log('👤 Default super admin created: admin@spctt.org / Admin@123');
        }
      } catch (adminSeedErr) {
        console.warn('Super admin seed skipped/failed:', adminSeedErr.message);
      }
    } catch (schemaErr) {
      console.warn('⚠️ Schema check / migration warning (limited DB privileges):', schemaErr.message);
    }

    console.log(`✅ MySQL Database '${config.DB.NAME}' at ${config.DB.HOST}:${config.DB.PORT} connected and initialized.`);
    return pool;
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
}

/**
 * Get MySQL pool instance
 */
export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.DB.HOST,
      port: config.DB.PORT,
      user: config.DB.USER,
      password: config.DB.PASSWORD,
      database: config.DB.NAME,
      waitForConnections: true,
      connectionLimit: config.DB.CONNECTION_LIMIT,
      queueLimit: 0
    });
  }
  return pool;
}

export default { initDatabase, getPool };
