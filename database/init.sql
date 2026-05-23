-- FlowlyRent - Base de données MariaDB
CREATE DATABASE IF NOT EXISTS flowlyrent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE flowlyrent;

CREATE USER IF NOT EXISTS 'flowlyrent'@'%' IDENTIFIED BY 'flowlyrent';
GRANT ALL PRIVILEGES ON flowlyrent.* TO 'flowlyrent'@'%';
FLUSH PRIVILEGES;
