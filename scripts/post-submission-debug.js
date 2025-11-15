const http = require('http');

const payload = {
  assessmentId: '5e4f18a0-df3c-4711-967c-ec0e9f460522',
  questionId: 'q-1',
  language: 'python',
  code: 'print("hello world")',
  userId: 'bfb5f6ab-7c71-4dbf-b31d-ca827e545e0c'
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/submissions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  },
  timeout: 10000
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', JSON.stringify(res.headers, null, 2));
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('BODY:');
    console.log(body);
    if (res.statusCode >= 400) process.exit(2);
  });
});

req.on('error', (e) => {
  console.error('REQUEST ERROR', e.message);
  process.exit(3);
});

req.write(data);
req.end();
