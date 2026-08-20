import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Calentamiento: subir a 50 usuarios virtuales
    { duration: '20s', target: 200 }, // Carga alta: subir a 200 usuarios virtuales
    { duration: '20s', target: 500 }, // Estrés extremo: pico de 500 usuarios virtuales
    { duration: '10s', target: 0 },   // Enfriamiento y recuperación: bajar a 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],   // Menos del 5% de fallos inesperados
    http_req_duration: ['p(95)<1000'], // 95% de peticiones completadas en menos de 1000ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost';

export default function () {
  const timestamp = Date.now() + '_' + Math.floor(Math.random() * 100000);
  const email = `stress_${timestamp}@fintech.com`;
  const password = 'Password123!';
  const name = `Stress User ${timestamp}`;

  // 1. Healthchecks
  const healthRes = http.get(`${BASE_URL}/users/health`);
  check(healthRes, {
    'healthcheck 200': (r) => r.status === 200,
  });

  // 2. Registro de Usuario
  const regPayload = JSON.stringify({ name, email, password });
  const regHeaders = { 'Content-Type': 'application/json' };
  const regRes = http.post(`${BASE_URL}/auth/register`, regPayload, { headers: regHeaders });
  
  check(regRes, {
    'registro exitoso (200/201)': (r) => r.status === 200 || r.status === 201,
  });

  // 3. Login
  const loginPayload = JSON.stringify({ email, password });
  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers: regHeaders });
  
  check(loginRes, {
    'login exitoso (200)': (r) => r.status === 200,
  });

  // 4. Transferencia con Idempotencia
  const txPayload = JSON.stringify({
    fromUserId: 1,
    toUserId: 2,
    amount: 10,
  });
  const txHeaders = {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': `k6-stress-key-${timestamp}`,
  };
  const txRes = http.post(`${BASE_URL}/transactions/transfer`, txPayload, { headers: txHeaders });
  
  check(txRes, {
    'transferencia procesada (200/201/400)': (r) => [200, 201, 400, 409].includes(r.status),
  });

  // 5. Petición a Worker Service
  const workerRes = http.post(`${BASE_URL}/worker/statements/request?userId=1`);
  check(workerRes, {
    'worker statement 200/201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(0.1);
}
