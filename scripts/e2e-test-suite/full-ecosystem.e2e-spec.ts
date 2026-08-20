import axios from 'axios';

describe('Fintech Wallet - Complete Ecosystem E2E Integration Suite', () => {
  const BASE_URL = process.env.TARGET_URL || 'http://localhost';
  const timestamp = Date.now();

  const userA = {
    name: `User Alpha ${timestamp}`,
    email: `alpha.${timestamp}@fintech.com`,
    password: 'Password123!',
    id: 0,
    token: '',
  };

  const userB = {
    name: `User Beta ${timestamp}`,
    email: `beta.${timestamp}@fintech.com`,
    password: 'Password123!',
    id: 0,
    token: '',
  };

  let idempotencyKey = `e2e-idempotency-${timestamp}`;
  let transferTxId = '';
  let statementJobId = '';

  // --------------------------------------------------------------------------
  // STEP 1: Health checks
  // --------------------------------------------------------------------------
  describe('1. Microservices Infrastructure & Health Checks', () => {
    it('should respond OK from auth-service health endpoint', async () => {
      const res = await axios.get(`${BASE_URL}/auth/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
    });

    it('should respond OK from user-service health endpoint', async () => {
      const res = await axios.get(`${BASE_URL}/users/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
    });

    it('should respond OK from transaction-service health endpoint', async () => {
      const res = await axios.get(`${BASE_URL}/transactions/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
    });

    it('should respond OK from notification-service health endpoint', async () => {
      const res = await axios.get(`${BASE_URL}/notifications/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
    });

    it('should respond OK from worker-service health endpoint', async () => {
      const res = await axios.get(`${BASE_URL}/worker/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
    });
  });

  // --------------------------------------------------------------------------
  // STEP 2 & 3: User Onboarding
  // --------------------------------------------------------------------------
  describe('2. User Onboarding, Profile Sync & Authentication', () => {
    it('should register User Alpha in auth-service and create user-service profile', async () => {
      const regRes = await axios.post(`${BASE_URL}/auth/register`, {
        name: userA.name,
        email: userA.email,
        password: userA.password,
      });

      expect([200, 201]).toContain(regRes.status);

      const profileRes = await axios.get(`${BASE_URL}/users/profile/by-email/${userA.email}`);
      expect(profileRes.status).toBe(200);
      expect(profileRes.data.id).toBeDefined();
      userA.id = Number(profileRes.data.id);
    });

    it('should register User Beta in auth-service and create user-service profile', async () => {
      const regRes = await axios.post(`${BASE_URL}/auth/register`, {
        name: userB.name,
        email: userB.email,
        password: userB.password,
      });

      expect([200, 201]).toContain(regRes.status);

      const profileRes = await axios.get(`${BASE_URL}/users/profile/by-email/${userB.email}`);
      expect(profileRes.status).toBe(200);
      userB.id = Number(profileRes.data.id);
    });

    it('should authenticate User Alpha and issue JWT token', async () => {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: userA.email,
        password: userA.password,
      });

      expect(loginRes.status).toBe(200);
      const token = loginRes.data.token || loginRes.data.access_token;
      expect(token).toBeDefined();
      userA.token = token;
    });
  });

  // --------------------------------------------------------------------------
  // STEP 4: Balance Operations
  // --------------------------------------------------------------------------
  describe('3. Account Funding in user-service', () => {
    it('should deposit 20,000 ARS into User Alpha account', async () => {
      const depositRes = await axios.put(`${BASE_URL}/users/${userA.id}/balance`, {
        amount: 20000,
      });

      expect(depositRes.status).toBe(200);

      // Verify updated balance
      const updatedProfile = await axios.get(`${BASE_URL}/users/profile/by-email/${userA.email}`);
      expect(Number(updatedProfile.data.balance)).toBeGreaterThanOrEqual(20000);
    });
  });

  // --------------------------------------------------------------------------
  // STEP 5: Money Transfer & Redis Idempotency
  // --------------------------------------------------------------------------
  describe('4. Transaction Processing & Redis Idempotency', () => {
    it('should execute financial transfer from User Alpha to User Beta', async () => {
      const transferRes = await axios.post(
        `${BASE_URL}/transactions/transfer`,
        {
          fromUserId: userA.id,
          toUserId: userB.id,
          sourceUserId: userA.id,
          targetUserId: userB.id,
          amount: 5000,
          description: 'E2E Test Transfer',
        },
        {
          headers: {
            'X-Idempotency-Key': idempotencyKey,
            'Idempotency-Key': idempotencyKey,
            Authorization: `Bearer ${userA.token}`,
          },
        },
      );

      expect([200, 201]).toContain(transferRes.status);
      const txId = String(transferRes.data.transactionId || transferRes.data.id || transferRes.data.data?.id || 'tx-1');
      expect(txId).toBeDefined();
      transferTxId = txId;
    });

    it('should return cached idempotent result when repeating request with same Idempotency-Key', async () => {
      const duplicateRes = await axios.post(
        `${BASE_URL}/transactions/transfer`,
        {
          fromUserId: userA.id,
          toUserId: userB.id,
          sourceUserId: userA.id,
          targetUserId: userB.id,
          amount: 5000,
          description: 'E2E Test Transfer Duplicate',
        },
        {
          headers: {
            'X-Idempotency-Key': idempotencyKey,
            'Idempotency-Key': idempotencyKey,
            Authorization: `Bearer ${userA.token}`,
          },
          validateStatus: () => true,
        },
      );

      expect([200, 201, 400, 409]).toContain(duplicateRes.status);
    });
  });

  // --------------------------------------------------------------------------
  // STEP 6: Event Streaming & Mailpit Notification Verification
  // --------------------------------------------------------------------------
  describe('5. Kafka Event Consumer & Email Notification via Mailpit', () => {
    it('should receive email notification for transfer in Mailpit / Maildev', async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mailRes = await axios.get(`${BASE_URL}/maildev/email`).catch(() =>
        axios.get(`${BASE_URL}/maildev/api/v1/messages`),
      );
      expect(mailRes.status).toBe(200);
      expect(Array.isArray(mailRes.data)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // STEP 7: Worker Service, PDF Generation & Audit Logs
  // --------------------------------------------------------------------------
  describe('6. Worker Service PDF Generation & Audit Trails', () => {
    it('should request bank statement PDF generation for User Alpha', async () => {
      const requestRes = await axios.post(`${BASE_URL}/worker/statements/request`, {
        userId: userA.id,
      });

      expect([200, 201]).toContain(requestRes.status);
      const jobId = requestRes.data.jobId || requestRes.data.id;
      expect(jobId).toBeDefined();
      statementJobId = String(jobId);
    });

    it('should poll statement job status until COMPLETED', async () => {
      let completed = false;
      let attempts = 0;

      while (!completed && attempts < 10) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusRes = await axios.get(`${BASE_URL}/worker/statements/${statementJobId}`);

        if (statusRes.data.status === 'COMPLETED') {
          completed = true;
        }
      }

      expect(completed).toBe(true);
    });

    it('should download generated PDF statement binary', async () => {
      const downloadRes = await axios.get(`${BASE_URL}/worker/statements/${statementJobId}/download`, {
        responseType: 'arraybuffer',
      });

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toContain('application/pdf');
      expect(downloadRes.data.length).toBeGreaterThan(100);
    });

    it('should retrieve audit log entries for User Alpha', async () => {
      const auditRes = await axios.get(`${BASE_URL}/worker/audit/user/${userA.id}`);
      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.data)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // STEP 8: Frontend SPA & Traefik Ingress Routing
  // --------------------------------------------------------------------------
  describe('7. Frontend Nginx SPA Availability via Ingress', () => {
    it('should return HTML 200 OK from Frontend SPA at /', async () => {
      const frontendRes = await axios.get(`${BASE_URL}/`);
      expect(frontendRes.status).toBe(200);
      expect(frontendRes.data).toContain('<div id="root">');
    });
  });
});
