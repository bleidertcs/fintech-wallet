import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '20s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export default function () {
  // 1. Health Liveness & Readiness Checks
  const liveRes = http.get(`${BASE_URL}/api/users/health/live`);
  check(liveRes, { 'user-service liveness 200': (r) => r.status === 200 });

  const txHealthRes = http.get(`${BASE_URL}/api/transactions/health/ready`);
  check(txHealthRes, { 'transaction-service readiness 200': (r) => r.status === 200 });

  const authHealthRes = http.get(`${BASE_URL}/api/auth/health/live`);
  check(authHealthRes, { 'auth-service liveness 200': (r) => r.status === 200 });

  sleep(0.5);
}
