import sharp from 'sharp';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../src/config/env.js';

async function createHeader() {
  const inputImagePath = 'd:/Ratan_Sir/SPCTT/header_banner.png';
  const meta = await sharp(inputImagePath).metadata();
  const width = meta.width;   // 2103
  const height = meta.height; // 527

  // 1. Read base full image directly without cropping
  const baseImage = await sharp(inputImagePath)
    .toBuffer();

  // 2. SVG overlay with requested gradient & updated name:
  // "Society for Pediatric Cellular Therapy and Transplant"
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Requested Gradient: from-[#13254A]/95 via-[#13254A]/75 to-[#13254A]/40 -->
        <linearGradient id="overlayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#13254A" stop-opacity="0.95" />
          <stop offset="50%" stop-color="#13254A" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#13254A" stop-opacity="0.40" />
        </linearGradient>

        <!-- Drop Shadow Filter for Text -->
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.85" />
        </filter>
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4" />
        </filter>
      </defs>

      <!-- Exact Gradient Overlay -->
      <rect width="${width}" height="${height}" fill="url(#overlayGrad)" />

      <!-- Top Pill Badge -->
      <g filter="url(#badgeShadow)">
        <rect x="${width / 2 - 360}" y="70" width="720" height="76" rx="38" fill="#13254A" stroke="rgba(255,255,255,0.45)" stroke-width="2.5" />
        <text x="${width / 2}" y="120" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="3">
          SPCTT 2027 ANNUAL CONFERENCE
        </text>
      </g>

      <!-- Main Headline: Society for Pediatric Cellular Therapy and Transplant -->
      <text x="${width / 2}" y="270" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="56" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-0.3" filter="url(#textShadow)">
        Society for Pediatric Cellular Therapy and Transplant
      </text>

      <!-- Subtitle (Date & Venue) -->
      <text x="${width / 2}" y="360" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="0.4" filter="url(#textShadow)">
        March 6-7, 2027 &#8226; Taj Vivanta, Dwarka, New Delhi
      </text>
    </svg>
  `);

  // 3. Composite full image & apply top rounded corners (32px radius)
  const compositeBuffer = await sharp(baseImage)
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .png({ quality: 95 })
    .toBuffer();

  const maskSvg = Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="32" ry="32" fill="#fff" />
    </svg>
  `);

  const finalBuffer = await sharp(compositeBuffer)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png({ quality: 95 })
    .toBuffer();

  const outputPath = 'd:/Ratan_Sir/SPCTT/final_email_header_v5.png';
  fs.writeFileSync(outputPath, finalBuffer);
  console.log('Generated full banner image at:', outputPath);

  // 4. Upload to Cloudflare R2
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2.ACCESS_KEY_ID,
      secretAccessKey: config.R2.SECRET_ACCESS_KEY
    }
  });

  const key = 'assets/spctt_header_banner_v5.png';
  await client.send(new PutObjectCommand({
    Bucket: config.R2.BUCKET_NAME,
    Key: key,
    Body: finalBuffer,
    ContentType: 'image/png'
  }));
  console.log(`Uploaded to R2: https://pub-32253d31098b4cfc9f901824d48b3dc5.r2.dev/${key}`);
}

createHeader().catch(console.error);
