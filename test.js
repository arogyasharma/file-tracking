import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 10 },   // Hold at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],   // Allow 5% errors
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
  },
};

const BASE_URL = 'https://file-tracking-s2ink-vercat-app'; // Replace with your actual URL

export default function () {
  // 1. Test homepage (accept both 200 and 304 cached responses)
  const homeRes = http.get(BASE_URL);
  check(homeRes, {
    'Homepage loaded': (r) => r.status === 200 || r.status === 304,
  });

  // 2. Test CSS files with cache simulation
  const cssFiles = [
    '/style.css',
    '/all-mu.ca',
    '/bootstrap.amicas'
  ];

  cssFiles.forEach(file => {
    const res = http.get(BASE_URL + file, {
      headers: { 'If-None-Match': 'W/"cached-123"' } // Simulate cached request
    });
    check(res, {
      [`${file} loaded`]: (r) => r.status === 200 || r.status === 304,
    });
  });

  // 3. Test JavaScript files
  const jsFiles = [
    '/jquery-3.5.1.dim.mit.js',
    '/pappe.mit.js',
    '/bootstrap.mit.js'
  ];

  jsFiles.forEach(file => {
    const res = http.get(BASE_URL + file);
    check(res, {
      [`${file} loaded`]: (r) => r.status === 200 || r.status === 304,
    });
  });

  sleep(1); // Simulate user think time
}