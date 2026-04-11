# Bcrypt Password Hashing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain text password storage and comparison with bcrypt hashing.

**Architecture:** Pre-compute bcrypt hash in `init.sql`, add `bcrypt` dependency, and update the login route to fetch by username then compare with `bcrypt.compare()`.

**Tech Stack:** Node.js, bcrypt, MySQL

---

### Task 1: Update database schema and seed data

**Files:**
- Modify: `init.sql`

- [ ] **Step 1: Expand password column and insert bcrypt hash**

Replace the full contents of `init.sql` with:

```sql
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

INSERT INTO users (username, password) VALUES ('admin', '$2b$10$nV4nqvT7Nr2BeRk/VOzlBe3LZmpDQJZ7Mljq5Fx5ZGlh0WA7uayWi');
INSERT INTO items (name, category) VALUES ('Arroz Branco', 'Base'), ('Feijão Preto', 'Grão');
```

Changes: `password` column from `VARCHAR(50)` to `VARCHAR(255)`, plain text `admin123` replaced with bcrypt hash.

- [ ] **Step 2: Commit**

```bash
git add init.sql
git commit -m "feat: store password as bcrypt hash in seed data, closes #5"
```

---

### Task 2: Add bcrypt dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add bcrypt to dependencies**

In `package.json`, add `"bcrypt": "^5.1.1"` to the dependencies object:

```json
"dependencies": {
    "express": "4.16.0",
    "mysql2": "3.9.1",
    "ejs": "3.1.6",
    "body-parser": "1.18.3",
    "bcrypt": "^5.1.1"
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add bcrypt dependency"
```

---

### Task 3: Update login route to use bcrypt.compare

**Files:**
- Modify: `index.js`

- [ ] **Step 1: Import bcrypt**

Add at line 3 of `index.js`, after the `mysql2/promise` require:

```javascript
const bcrypt = require('bcrypt');
```

- [ ] **Step 2: Update login route**

Replace the current `/login` POST handler:

```javascript
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) res.redirect('/dashboard');
        else res.send('<h1>Login Inválido</h1><a href="/">Voltar</a>');
    } catch (err) {
        res.status(500).send("Erro no banco.");
    }
});
```

With:

```javascript
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0 && await bcrypt.compare(password, rows[0].password)) {
            res.redirect('/dashboard');
        } else {
            res.send('<h1>Login Inválido</h1><a href="/">Voltar</a>');
        }
    } catch (err) {
        res.status(500).send("Erro no banco.");
    }
});
```

Key changes: query by `username` only, then `bcrypt.compare(password, rows[0].password)`.

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: use bcrypt.compare for login authentication"
```

---

### Task 4: Test with Docker Compose

- [ ] **Step 1: Rebuild and test**

```bash
docker compose down -v
docker compose up --build
```

- [ ] **Step 2: Verify login**

Open `http://localhost:3000`, login with `admin` / `admin123`. Should redirect to dashboard.

- [ ] **Step 3: Verify wrong password**

Login with `admin` / `wrongpassword`. Should show "Login Inválido".
