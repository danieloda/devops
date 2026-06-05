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
    customer_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Aberto'
);

INSERT INTO users (username, password) VALUES ('admin', '$2b$10$nV4nqvT7Nr2BeRk/VOzlBe3LZmpDQJZ7Mljq5Fx5ZGlh0WA7uayWi');
INSERT INTO items (name, category, price) VALUES
    ('Marmita Fitness Frango', 'Fitness', 22.90),
    ('Marmita Tradicional', 'Tradicional', 18.50),
    ('Marmita Vegana', 'Vegana', 24.00);
