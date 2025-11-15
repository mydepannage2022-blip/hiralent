require('dotenv').config();
const { S3Client, PutObjectCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

async function testMinIO() {
  try {
    console.log('📋 Testing MinIO connection...');
    console.log('Endpoint:', process.env.S3_ENDPOINT);
    console.log('Bucket:', process.env.S3_BUCKET);

    // Test 1: List buckets
    console.log('\n1️⃣ Listing buckets...');
    const listCommand = new ListBucketsCommand({});
    const buckets = await s3Client.send(listCommand);
    console.log('✅ Buckets:', buckets.Buckets.map(b => b.Name));

    // Test 2: Upload a test file
    console.log('\n2️⃣ Uploading test file...');
    const testContent = Buffer.from('Hello MinIO! This is a test file.');
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: 'test/test-file.txt',
      Body: testContent,
      ContentType: 'text/plain',
    });

    await s3Client.send(uploadCommand);
    console.log('✅ File uploaded successfully!');
    console.log('📁 Check: http://localhost:9001/browser/hiralent-uploads/test/');

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMinIO();