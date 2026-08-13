import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp-up a 20 VUs
    { duration: '15s', target: 50 }, // Mantener 50 VUs concurrentes
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de peticiones < 500ms
    http_req_failed: ['rate<0.05'],   // Fallos de HTTP < 5%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost/api';

export default function () {
  const payload = JSON.stringify({
    fromUserId: 1,
    toUserId: 2,
    amount: 10.0,
    idempotencyKey: `k6-tx-${__VU}-${__ITER}-${Date.now()}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/transactions/transfer`, payload, params);

  check(res, {
    'status is 200 or 201 or 400': (r) => [200, 201, 400].includes(r.status),
    'no 500 internal server errors': (r) => r.status !== 500,
  });

  sleep(0.1);
}
