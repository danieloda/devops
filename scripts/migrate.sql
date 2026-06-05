-- ==========================================================================
-- Migration do banco compartilhado `dbcentral` na EC2.
-- Roda automaticamente no job de deploy da pipeline, ou manualmente via:
--   sudo docker exec -i dbcentral mysql -uroot -ppassword < scripts/migrate.sql
--
-- Recria items/orders com o schema novo (price, item_id, total, created_at).
-- Seguro: opera apenas no banco do aluno (danielodadevops). O admin é mantido.
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS danielodadevops
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE danielodadevops;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- NÃO-DESTRUTIVO: cria as tabelas apenas se ainda não existirem.
-- (Para um banco já existente com schema antigo, rode os ALTERs comentados ao final.)
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    item_id INT,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Aberto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Usuário admin padrão (senha: admin123, hash bcrypt). Só insere se ainda não existir.
INSERT IGNORE INTO users (username, password)
VALUES ('admin', '$2b$10$nV4nqvT7Nr2BeRk/VOzlBe3LZmpDQJZ7Mljq5Fx5ZGlh0WA7uayWi');

-- Cardápio inicial de marmitas (só insere se a tabela estiver vazia).
INSERT INTO items (name, category, price)
SELECT * FROM (
    SELECT 'Marmita Fitness Frango' AS name, 'Fitness' AS category, 22.90 AS price
    UNION ALL SELECT 'Marmita Tradicional', 'Tradicional', 18.50
    UNION ALL SELECT 'Marmita Vegana', 'Vegana', 24.00
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM items);

-- ==========================================================================
-- Upgrade de um banco com schema ANTIGO (rode manualmente se necessário):
--   ALTER TABLE items  ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00;
--   ALTER TABLE orders ADD COLUMN item_id INT,
--                      ADD COLUMN total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
--                      ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ==========================================================================
