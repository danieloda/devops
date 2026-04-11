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

describe('GET /dashboard', () => {
    it('should render dashboard with items and orders', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1, name: 'Arroz', category: 'Base' }]])
            .mockResolvedValueOnce([[{ id: 1, customer_name: 'João', status: 'Aberto' }]]);

        const res = await request(app).get('/dashboard');
        expect(res.status).toBe(200);
    });
});
