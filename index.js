const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();

const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'marmitadb'
};

let pool;

function setPool(p) { pool = p; }

async function connectWithRetry() {
    console.log('🔍 [INFRA] Tentando conectar ao MySQL...');
    for (let i = 1; i <= 10; i++) {
        try {
            pool = mysql.createPool(dbConfig);
            await pool.query('SELECT 1');
            console.log('✅ [DATABASE] Conectado ao MySQL com sucesso!');
            return;
        } catch (err) {
            console.log(`⚠️ [DATABASE] Tentativa ${i}/10 falhou. Aguardando...`);
            await new Promise(res => setTimeout(res, 3000));
        }
    }
    process.exit(1);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- Validação de Input (Issue #05) ----------
// Rejeita dados inválidos antes de tocar no banco. Retorna lista de erros.
function validarItem({ name, price }) {
    const erros = [];
    if (!name || String(name).trim() === '') {
        erros.push('O nome da marmita é obrigatório.');
    }
    const preco = Number(price);
    if (price === undefined || price === null || String(price).trim() === '' ||
        Number.isNaN(preco) || preco <= 0) {
        erros.push('O preço deve ser um número positivo.');
    }
    return erros;
}

app.get('/', (req, res) => res.render('login'));

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

// ---------- Cadastro de Item/Marmita (Issues #05, #06) ----------
// Validação de input + Prepared Statement (parâmetros ?) contra SQL Injection.
app.post('/add-item', async (req, res) => {
    const { name, category, price } = req.body;
    const erros = validarItem({ name, price });
    if (erros.length > 0) {
        return res.status(400).send(`<h1>Erro 400 - Dados inválidos</h1><ul>${
            erros.map(e => `<li>${e}</li>`).join('')
        }</ul><a href="/dashboard">Voltar</a>`);
    }
    try {
        await pool.query(
            'INSERT INTO items (name, category, price) VALUES (?, ?, ?)',
            [String(name).trim(), String(category || '').trim(), Number(price)]
        );
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send('Erro no banco.');
    }
});

app.get('/dashboard', async (req, res) => {
    const [items] = await pool.query('SELECT * FROM items');
    const [orders] = await pool.query('SELECT * FROM orders');
    res.render('dashboard', { items, orders });
});

if (require.main === module) {
    connectWithRetry().then(() => {
        app.listen(3000, () => console.log('🚀 MARMITATECH PRO ONLINE NA PORTA 3000'));
    });
}

module.exports = { app, setPool, connectWithRetry };
