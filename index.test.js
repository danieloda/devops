const request = require('supertest');
const bcrypt = require('bcrypt');
const { app, setPool, connectWithRetry } = require('./index');

const mockQuery = jest.fn();

beforeEach(() => {
    setPool({ query: mockQuery });
    mockQuery.mockReset();
});

describe('connectWithRetry', () => {
    it('should connect successfully on first attempt', async () => {
        const mysql = require('mysql2/promise');
        const mockPool = { query: jest.fn().mockResolvedValue([]) };
        jest.spyOn(mysql, 'createPool').mockReturnValue(mockPool);

        await connectWithRetry();

        expect(mysql.createPool).toHaveBeenCalled();
        expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');

        mysql.createPool.mockRestore();
        setPool({ query: mockQuery });
    });
});

describe('GET /', () => {
    it('should render login page', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toContain('login');
    });
});

describe('POST /login', () => {
    it('should redirect to dashboard on valid credentials', async () => {
        mockQuery.mockResolvedValue([[{ id: 1, username: 'admin', password: '$2b$10$hash' }]]);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

        const res = await request(app)
            .post('/login')
            .send('username=admin&password=admin123');

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/dashboard');
        bcrypt.compare.mockRestore();
    });

    it('should show error on invalid credentials', async () => {
        mockQuery.mockResolvedValue([[{ id: 1, username: 'admin', password: '$2b$10$hash' }]]);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

        const res = await request(app)
            .post('/login')
            .send('username=admin&password=wrong');

        expect(res.status).toBe(200);
        expect(res.text).toContain('Login Inválido');
        bcrypt.compare.mockRestore();
    });

    it('should show error when user not found', async () => {
        mockQuery.mockResolvedValue([[]]);

        const res = await request(app)
            .post('/login')
            .send('username=nobody&password=wrong');

        expect(res.status).toBe(200);
        expect(res.text).toContain('Login Inválido');
    });

    it('should return 500 on database error', async () => {
        mockQuery.mockRejectedValue(new Error('DB error'));

        const res = await request(app)
            .post('/login')
            .send('username=admin&password=admin123');

        expect(res.status).toBe(500);
        expect(res.text).toContain('Erro no banco');
    });
});

describe('POST /add-item (validação - Issue #05)', () => {
    it('should create item and redirect on valid data', async () => {
        mockQuery.mockResolvedValue([{ insertId: 1 }]);
        const res = await request(app)
            .post('/add-item')
            .send('name=Marmita Fitness&category=Fitness&price=22.90');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/dashboard');
        expect(mockQuery).toHaveBeenCalledWith(
            'INSERT INTO items (name, category, price) VALUES (?, ?, ?)',
            ['Marmita Fitness', 'Fitness', 22.9]
        );
    });

    it('should return 400 when name is empty', async () => {
        const res = await request(app)
            .post('/add-item')
            .send('name=&category=Fitness&price=22.90');
        expect(res.status).toBe(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 400 when price is negative', async () => {
        const res = await request(app)
            .post('/add-item')
            .send('name=Marmita&price=-5');
        expect(res.status).toBe(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 400 when price is not a number', async () => {
        const res = await request(app)
            .post('/add-item')
            .send('name=Marmita&price=abc');
        expect(res.status).toBe(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('POST /orders (Issue #06)', () => {
    it('should create order with status Aberto on valid data', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ price: 22.9 }]]) // SELECT price FROM items
            .mockResolvedValueOnce([{ insertId: 1 }]);  // INSERT INTO orders
        const res = await request(app)
            .post('/orders')
            .send('customer_name=João&item_id=1');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/dashboard');
        expect(mockQuery).toHaveBeenLastCalledWith(
            'INSERT INTO orders (customer_name, item_id, total, status) VALUES (?, ?, ?, ?)',
            ['João', 1, 22.9, 'Aberto']
        );
    });

    it('should return 400 when customer name is empty', async () => {
        const res = await request(app).post('/orders').send('customer_name=&item_id=1');
        expect(res.status).toBe(400);
    });

    it('should return 400 when item does not exist', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // SELECT price -> vazio
        const res = await request(app).post('/orders').send('customer_name=Ana&item_id=999');
        expect(res.status).toBe(400);
    });
});

describe('GET /dashboard', () => {
    it('should render dashboard with items and orders', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1, name: 'Marmita', category: 'Fitness', price: 22.9 }]])
            .mockResolvedValueOnce([[{ id: 1, customer_name: 'João', item_name: 'Marmita', total: 22.9, status: 'Aberto' }]]);

        const res = await request(app).get('/dashboard');
        expect(res.status).toBe(200);
    });
});
