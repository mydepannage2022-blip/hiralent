(async () => {
  try {
  // Allow overriding the base URL (useful if localhost resolves to ::1 on your machine).
  const base = process.env.BASE_URL || 'http://127.0.0.1:5000/api/v1';
  const url = `${base.replace(/\/$/, '')}/submissions`;
    // Allow overriding USER_ID via env for flexibility in CI/local runs.
    const body = {
      assessmentId: 'local-test',
      questionId: 'local-q',
      language: 'python',
      code: 'print("hello from node test")',
      userId: process.env.USER_ID || 'dev-user'
    };

  console.log('posting to', url);
  const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('STATUS', res.status);
    const text = await res.text();
    try {
      console.log('BODY', JSON.parse(text));
    } catch (e) {
      console.log('BODY', text);
    }
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
