# Bcrypt Password Hashing Design

## Problem

Passwords are stored and compared as plain text. The login route queries `WHERE username = ? AND password = ?`, and `init.sql` inserts `'admin123'` directly. This fails the evaluation requirement: "login salvando hash da senha".

## Solution

Use bcrypt to hash passwords at rest and compare on login.

## Changes

### 1. `init.sql`
- Expand `password` column from `VARCHAR(50)` to `VARCHAR(255)` to fit bcrypt hashes (60 chars, with margin).
- Replace plain text `'admin123'` with its pre-computed bcrypt hash.

### 2. `package.json`
- Add `bcrypt` as a dependency.

### 3. `index.js`
- Import `bcrypt`.
- Change login query from `SELECT * FROM users WHERE username = ? AND password = ?` to `SELECT * FROM users WHERE username = ?`.
- Use `bcrypt.compare(password, row.password)` to verify the password.

## Security Notes
- Using bcrypt default salt rounds (10).
- No changes to session management or other auth flows (out of scope).

## Testing
- `docker compose up --build` and login with `admin` / `admin123` should succeed.
- Login with wrong password should fail.
