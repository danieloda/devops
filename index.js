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

// ---------- Cadastro de Pedidos (Issue #06) ----------
// Associa um cliente a uma marmita disponível. Status inicial: "Aberto".
app.post('/orders', async (req, res) => {
    const { customer_name, item_id } = req.body;
    const erros = [];
    if (!customer_name || String(customer_name).trim() === '') {
        erros.push('O nome do cliente é obrigatório.');
    }
    if (!item_id || Number.isNaN(Number(item_id))) {
        erros.push('Selecione uma marmita válida.');
    }
    if (erros.length > 0) {
        return res.status(400).send(`<h1>Erro 400 - Dados inválidos</h1><ul>${
            erros.map(e => `<li>${e}</li>`).join('')
        }</ul><a href="/dashboard">Voltar</a>`);
    }
    try {
        const [found] = await pool.query('SELECT price FROM items WHERE id = ?', [Number(item_id)]);
        if (found.length === 0) {
            return res.status(400).send('<h1>Erro 400 - Marmita inexistente</h1><a href="/dashboard">Voltar</a>');
        }
        await pool.query(
            'INSERT INTO orders (customer_name, item_id, total, status) VALUES (?, ?, ?, ?)',
            [String(customer_name).trim(), Number(item_id), found[0].price, 'Aberto']
        );
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send('Erro no banco.');
    }
});

// ---------- Painel Kanban da Cozinha (Issue #07) ----------
// Fluxo de produção: Aberto -> Cozinha -> Entrega -> Entregue.
const FLUXO_STATUS = { 'Aberto': 'Cozinha', 'Cozinha': 'Entrega', 'Entrega': 'Entregue' };

app.post('/orders/:id/advance', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).send('<h1>Erro 400 - ID inválido</h1>');
    }
    try {
        const [rows] = await pool.query('SELECT status FROM orders WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).send('<h1>Erro 404 - Pedido não encontrado</h1>');
        }
        const proximo = FLUXO_STATUS[rows[0].status];
        if (proximo) {
            await pool.query('UPDATE orders SET status = ? WHERE id = ?', [proximo, id]);
        }
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send('Erro no banco.');
    }
});

// ---------- Relatório de Vendas em CSV (Issue #08) ----------
// Exporta o histórico de pedidos para controle financeiro (abre no Excel).
app.get('/admin/export', async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT o.id, o.customer_name, i.name AS item_name, o.total, o.status, o.created_at
             FROM orders o LEFT JOIN items i ON o.item_id = i.id
             ORDER BY o.id`
        );
        const cabecalho = 'ID,Cliente,Marmita,Valor,Status,Data';
        const linhas = orders.map(o => {
            const data = o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : '';
            const cliente = `"${String(o.customer_name || '').replace(/"/g, '""')}"`;
            const marmita = `"${String(o.item_name || '').replace(/"/g, '""')}"`;
            return [o.id, cliente, marmita, Number(o.total || 0).toFixed(2), o.status, data].join(',');
        });
        // BOM (\uFEFF) garante acentuação correta ao abrir no Excel.
        const csv = '\uFEFF' + [cabecalho, ...linhas].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio-vendas.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).send('Erro ao gerar relatório.');
    }
});

app.get('/dashboard', async (req, res) => {
    const [items] = await pool.query('SELECT * FROM items');
    const [orders] = await pool.query(
        `SELECT o.id, o.customer_name, o.status, o.total, o.created_at, i.name AS item_name
         FROM orders o LEFT JOIN items i ON o.item_id = i.id
         ORDER BY o.id DESC`
    );
    res.render('dashboard', { items, orders });
});

if (require.main === module) {
    connectWithRetry().then(() => {
        app.listen(3000, () => console.log('🚀 MARMITATECH PRO ONLINE NA PORTA 3000'));
    });
}

module.exports = { app, setPool, connectWithRetry };
