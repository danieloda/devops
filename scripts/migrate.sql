-- ==========================================================================
-- Migration do banco compartilhado `mysql-infra` na EC2 (rede rede_alunos).
-- Roda automaticamente no job de deploy da pipeline, ou manualmente via:
--   sudo docker exec -i mysql-infra mysql -uroot -ppassword < scripts/migrate.sql
--
-- IDEMPOTENTE e NÃO-DESTRUTIVO:
--   - CREATE TABLE IF NOT EXISTS (não recria nada)
--   - INSERT IGNORE com IDs explícitos (só insere o que não existe)
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

-- Cardápio do Restaurante Planalto (IDs fixos: só insere os que faltam)
INSERT IGNORE INTO items (id, name, category, price) VALUES
    (1,  'Marmita Fitness Frango Grelhado', 'Fitness',     22.90),
    (2,  'Marmita Tradicional Bisteca',     'Tradicional', 18.50),
    (3,  'Marmita Vegana Grão-de-Bico',     'Vegana',      24.00),
    (4,  'Marmita Executiva Picanha',       'Executiva',   32.90),
    (5,  'Marmita Low Carb Salmão',         'Low Carb',    29.90),
    (6,  'Marmita Tradicional Feijoada',    'Tradicional', 21.00),
    (7,  'Marmita Fitness Tilápia',         'Fitness',     25.50),
    (8,  'Marmita Vegetariana Lasanha',     'Vegetariana', 23.00),
    (9,  'Marmita Executiva Strogonoff',    'Executiva',   27.90),
    (10, 'Marmita Kids Frango Empanado',    'Kids',        16.90);

-- Pedidos de exemplo (cobrem todas as colunas do Kanban; só insere os que faltam)
INSERT IGNORE INTO orders (id, customer_name, item_id, total, status) VALUES
    (1, 'Carlos Souza',    4, 32.90, 'Entregue'),
    (2, 'Ana Lima',        1, 22.90, 'Entregue'),
    (3, 'João Pereira',    6, 21.00, 'Entrega'),
    (4, 'Maria Santos',    5, 29.90, 'Entrega'),
    (5, 'Pedro Oliveira',  9, 27.90, 'Cozinha'),
    (6, 'Juliana Costa',   3, 24.00, 'Cozinha'),
    (7, 'Rafael Almeida',  7, 25.50, 'Aberto'),
    (8, 'Fernanda Rocha', 10, 16.90, 'Aberto');
