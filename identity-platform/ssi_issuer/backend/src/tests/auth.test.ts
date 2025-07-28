import request from 'supertest';
import express from 'express';
import { adminRoutes } from '../routes/admin';
import { dbManager } from '../database/connection';
import { AdminUser } from '../models/AdminUser';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Authentication', () => {
  beforeAll(async () => {
    await dbManager.initialize();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    // Clean up admin users before each test
    await AdminUser.deleteMany({});
  });

  describe('POST /api/admin/login', () => {
    it('should login with valid credentials', async () => {
      // Create test admin user
      await AdminUser.createAdmin('testadmin', 'password123', 'test@example.com');

      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.username).toBe('testadmin');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject invalid username', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject invalid password', async () => {
      await AdminUser.createAdmin('testadmin', 'password123', 'test@example.com');

      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate input data', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'ab', // Too short
          password: '123' // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/admin/profile', () => {
    it('should return profile for authenticated user', async () => {
      // Create test admin user
      const admin = await AdminUser.createAdmin('testadmin', 'password123', 'test@example.com');

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      // Get profile
      const response = await request(app)
        .get('/api/admin/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testadmin');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/admin/profile');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('MISSING_TOKEN');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/admin/logout', () => {
    it('should logout authenticated user', async () => {
      // Create test admin user and login
      await AdminUser.createAdmin('testadmin', 'password123', 'test@example.com');

      const loginResponse = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      // Logout
      const response = await request(app)
        .post('/api/admin/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/admin/change-password', () => {
    it('should change password with valid current password', async () => {
      // Create test admin user and login
      await AdminUser.createAdmin('testadmin', 'password123', 'test@example.com');

      const loginResponse = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      // Change password
      const response = await request(app)
        .put('/api/admin/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify new password works
      const newLoginResponse = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'newpassword123'
        });

      expect(newLoginResponse.status).toBe(200);
    });

    it('should reject change with invalid current password', async () => {
      // Create test admin user and login
      await AdminUser.createAdmin('testadmin', 'password123', 'test@example.com');

      const loginResponse = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      // Try to change password with wrong current password
      const response = await request(app)
        .put('/api/admin/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_CURRENT_PASSWORD');
    });
  });
});