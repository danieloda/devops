-- ==========================================================================
-- Migration idempotente para o banco compartilhado `dbcentral` na EC2.
-- Executar uma vez via:
--   sudo docker exec -i dbcentral mysql -uroot -ppassword < scripts/migrate.sql
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS danielodadevops
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE danielodadevops;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Aberto'
);

-- Usuário admin padrão (senha: admin123, hash bcrypt). Só insere se ainda não existir.
INSERT IGNORE INTO users (username, password)
VALUES ('admin', '$2b$10$nV4nqvT7Nr2BeRk/VOzlBe3LZmpDQJZ7Mljq5Fx5ZGlh0WA7uayWi');

INSERT IGNORE INTO items (id, name, category) VALUES
  (1, 'Arroz Branco', 'Base'),
  (2, 'Feijão Preto', 'Grão');
