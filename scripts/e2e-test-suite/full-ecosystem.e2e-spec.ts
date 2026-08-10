import axios from 'axios';

describe('Fintech Wallet - Complete Ecosystem E2E Integration Suite', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost';
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

  const idempotencyKey = `idemp-transfer-${timestamp}`;
  let transferTxId = '';
  let statementJobId = '';

  beforeAll(() => {
    axios.defaults.timeout = 10000;
  });

  // --------------------------------------------------------------------------
  // STEP 1: Microservices Healthchecks via Traefik Ingress
  // --------------------------------------------------------------------------
  describe('1. Microservices Liveness & Readiness Probes', () => {
    it('auth-service /health should return status OK', async () => {
      const res = await axios.get(`${BASE_URL}/auth/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
      expect(res.data.service).toBe('auth-service');
    });

    it('user-service /health should return status OK', async () => {
      const res = await axios.get(`${BASE_URL}/users/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
      expect(res.data.service).toBe('user-service');
    });

    it('transaction-service /health should return status OK', async () => {
      const res = await axios.get(`${BASE_URL}/transactions/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
      expect(res.data.service).toBe('transaction-service');
    });

    it('notification-service /health should return status OK', async () => {
      const res = await axios.get(`${BASE_URL}/notifications/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
      expect(res.data.service).toBe('notification-service');
    });

    it('worker-service /health should return status OK', async () => {
      const res = await axios.get(`${BASE_URL}/worker/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('OK');
      expect(res.data.service).toBe('worker-service');
    });
  });

  // --------------------------------------------------------------------------
  // STEP 2 & 3: User Registration, gRPC Sync & Authentication
  // --------------------------------------------------------------------------
  describe('2. User Onboarding, Profile Sync & Authentication', () => {
    it('should register User Alpha in auth-service and sync profile to user-service', async () => {
      const regRes = await axios.post(`${BASE_URL}/auth/register`, {
        name: userA.name,
        email: userA.email,
        password: userA.password,
      });

      expect(regRes.status).toBe(201);
      expect(regRes.data.email).toBe(userA.email);

      // Verify profile sync in user-service
      const profileRes = await axios.get(`${BASE_URL}/users/profile/by-email/${userA.email}`);
      expect(profileRes.status).toBe(200);
      expect(profileRes.data.email).toBe(userA.email);
      expect(profileRes.data.name).toBe(userA.name);
      userA.id = Number(profileRes.data.id);
    });

    it('should register User Beta in auth-service and sync profile to user-service', async () => {
      const regRes = await axios.post(`${BASE_URL}/auth/register`, {
        name: userB.name,
        email: userB.email,
        password: userB.password,
      });

      expect(regRes.status).toBe(201);

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
      expect(loginRes.data.access_token).toBeDefined();
      userA.token = loginRes.data.access_token;
    });
  });

  // --------------------------------------------------------------------------
  // STEP 4: Balance Operations
  // --------------------------------------------------------------------------
  describe('3. Account Funding in user-service', () => {
    it('should deposit 20,000 ARS into User Alpha account', async () => {
      const depositRes = await axios.put(`${BASE_URL}/users/profile/${userA.id}/balance`, {
        amount: 20000,
      });

      expect(depositRes.status).toBe(200);

      // Verify updated balance
      const updatedProfile = await axios.get(`${BASE_URL}/users/profile/${userA.id}`);
      expect(updatedProfile.data.balance).toBeGreaterThanOrEqual(20000);
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
          sourceUserId: userA.id,
          targetUserId: userB.id,
          amount: 5000,
          description: 'E2E Test Transfer',
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
            Authorization: `Bearer ${userA.token}`,
          },
        },
      );

      expect(transferRes.status).toBe(201);
      expect(transferRes.data.status).toBe('COMPLETED');
      expect(transferRes.data.transactionId).toBeDefined();
      transferTxId = transferRes.data.transactionId;
    });

    it('should return cached idempotent result when repeating request with same Idempotency-Key', async () => {
      const duplicateRes = await axios.post(
        `${BASE_URL}/transactions/transfer`,
        {
          sourceUserId: userA.id,
          targetUserId: userB.id,
          amount: 5000,
          description: 'E2E Test Transfer Duplicate',
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
            Authorization: `Bearer ${userA.token}`,
          },
        },
      );

      expect([200, 201]).toContain(duplicateRes.status);
      expect(duplicateRes.data.transactionId).toBe(transferTxId);
    });
  });

  // --------------------------------------------------------------------------
  // STEP 6: Event Streaming & Mailpit Notification Verification
  // --------------------------------------------------------------------------
  describe('5. Kafka Event Consumer & Email Notification via Mailpit', () => {
    it('should receive email notification for transfer in Mailpit', async () => {
      // Wait 3 seconds for Kafka consumer processing & SMTP dispatch
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const mailpitRes = await axios.get(`${BASE_URL}/mailpit/api/v1/messages`);
      expect(mailpitRes.status).toBe(200);

      const messages = mailpitRes.data.messages || [];
      const userNotification = messages.find(
        (m: any) => m.To && m.To.some((recipient: any) => recipient.Address === userB.email),
      );

      expect(userNotification).toBeDefined();
      expect(userNotification.Subject).toContain('Transferencia Recibida');
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

      expect(requestRes.status).toBe(201);
      expect(requestRes.data.jobId).toBeDefined();
      statementJobId = requestRes.data.jobId;
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
          expect(statusRes.data.pdfUrl).toBeDefined();
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
      expect(downloadRes.data.length).toBeGreaterThan(500);
    });

    it('should retrieve audit log entries for User Alpha', async () => {
      const auditRes = await axios.get(`${BASE_URL}/worker/audit/user/${userA.id}`);
      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.data)).toBe(true);
      expect(auditRes.data.length).toBeGreaterThan(0);
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
