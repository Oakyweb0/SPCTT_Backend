import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../src/config/env.js';

async function uploadHeaderImage() {
  const imagePath = 'D:/Ratan_Sir/SPCTT/imgi_2_page_header.png';
  if (!fs.existsSync(imagePath)) {
    console.error('File not found at:', imagePath);
    return;
  }

  const fileContent = fs.readFileSync(imagePath);
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2.ACCESS_KEY_ID,
      secretAccessKey: config.R2.SECRET_ACCESS_KEY
    }
  });

  const key = 'assets/imgi_2_page_header.png';
  const command = new PutObjectCommand({
    Bucket: config.R2.BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: 'image/png'
  });

  await client.send(command);
  console.log('Successfully uploaded image to R2:');
  console.log(`${config.R2.PUBLIC_URL}/${key}`);
}

uploadHeaderImage().catch(console.error);
