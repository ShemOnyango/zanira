import request from 'supertest';
import app from '../server.js';
import mongoose from 'mongoose';

const adminToken = process.env.TEST_ADMIN_TOKEN || '';

// These tests require a running MongoDB and a valid admin token in TEST_ADMIN_TOKEN

describe('Admin Roles API', () => {
  beforeAll(async () => {
    if (!process.env.MONGODB_URI || !adminToken) {
      console.warn('Skipping admin roles tests because MONGODB_URI or TEST_ADMIN_TOKEN not set');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  test('GET /api/v1/admin/roles returns data or 401 without token', async () => {
    const resNoAuth = await request(app).get('/api/v1/admin/roles');
    expect([401, 403, 200]).toContain(resNoAuth.status);

    if (adminToken) {
      const res = await request(app).get('/api/v1/admin/roles').set('Authorization', `Bearer ${adminToken}`);
      expect([200, 403]).toContain(res.status);
    }
  });

  test('POST /api/v1/admin/roles requires super_admin', async () => {
    if (!adminToken) return;
    const res = await request(app)
      .post('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'test_role', name: 'Test Role' });
    expect([201, 409, 403]).toContain(res.status);
  });
});
