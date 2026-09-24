import sharp from 'sharp';
import fs from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../src/config/env.js';

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function createHeader() {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2.ACCESS_KEY_ID,
      secretAccessKey: config.R2.SECRET_ACCESS_KEY
    }
  });

  console.log('Fetching raw background image from Cloudflare R2: assets/assets_imgi_2_page_header.png...');
  let baseImageBuffer;
  try {
    const getRes = await client.send(new GetObjectCommand({
      Bucket: config.R2.BUCKET_NAME,
      Key: 'assets/assets_imgi_2_page_header.png'
    }));
    baseImageBuffer = await streamToBuffer(getRes.Body);
  } catch (e) {
    console.log('Fetching from URL fallback...');
    const resp = await fetch('https://pub-32253d31098b4cfc9f901824d48b3dc5.r2.dev/assets/assets_imgi_2_page_header.png');
    baseImageBuffer = Buffer.from(await resp.arrayBuffer());
  }

  const meta = await sharp(baseImageBuffer).metadata();
  const width = meta.width || 1200;
  const height = meta.height || 350;
  console.log(`Image dimensions: ${width}x${height}`);

  // Scale dimensions proportionally for SVG text elements
  // The layout has:
  // - Top badge around 18% from top
  // - Main title around 52% from top
  // - Subtitle around 78% from top
  const badgeWidth = Math.round(width * 0.42);
  const badgeHeight = Math.round(height * 0.16);
  const badgeY = Math.round(height * 0.12);
  const badgeX = Math.round((width - badgeWidth) / 2);
  const badgeTextY = Math.round(badgeY + badgeHeight * 0.68);
  const badgeFontSize = Math.round(height * 0.055);

  const titleY = Math.round(height * 0.54);
  const titleFontSize = Math.round(height * 0.095);

  const subTitleY = Math.round(height * 0.76);
  const subTitleFontSize = Math.round(height * 0.065);

  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradient Overlay matching: from-[#13254A]/95 via-[#13254A]/75 to-[#13254A]/40 -->
        <linearGradient id="overlayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#13254A" stop-opacity="0.95" />
          <stop offset="50%" stop-color="#13254A" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#13254A" stop-opacity="0.40" />
        </linearGradient>

        <!-- Shadow for High Contrast Clarity on Email Clients -->
        <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.8" />
        </filter>
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000000" flood-opacity="0.45" />
        </filter>
      </defs>

      <!-- Gradient Overlay -->
      <rect width="${width}" height="${height}" fill="url(#overlayGrad)" />

      <!-- Top Badge Pill -->
      <g filter="url(#badgeShadow)">
        <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="${Math.round(badgeHeight / 2)}" fill="#13254A" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
        <text x="${width / 2}" y="${badgeTextY}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${badgeFontSize}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">
          SPCTT 2027 ANNUAL CONFERENCE
        </text>
      </g>

      <!-- Main Headline -->
      <text x="${width / 2}" y="${titleY}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${titleFontSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-0.2" filter="url(#textGlow)">
        Society for Pediatric Cellular Therapy and Transplant
      </text>

      <!-- Subtitle (Date & Venue) -->
      <text x="${width / 2}" y="${subTitleY}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${subTitleFontSize}" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="0.3" filter="url(#textGlow)">
        March 6-7, 2027 • Taj Vivanta, Dwarka, New Delhi
      </text>
    </svg>
  `);

  // Composite the gradient overlay and typography onto base image
  const styledBannerBuffer = await sharp(baseImageBuffer)
    .composite([
      { input: svgOverlay, top: 0, left: 0 }
    ])
    .png({ quality: 95 })
    .toBuffer();

  const localOutputPath = 'd:/Ratan_Sir/SPCTT/Spctt_Backend/uploads/spctt_styled_header.png';
  fs.writeFileSync(localOutputPath, styledBannerBuffer);
  console.log('Saved styled header locally at:', localOutputPath);

  // Upload to Cloudflare R2
  const targetKey = 'assets/assets_imgi_2_page_header_styled.png';
  await client.send(new PutObjectCommand({
    Bucket: config.R2.BUCKET_NAME,
    Key: targetKey,
    Body: styledBannerBuffer,
    ContentType: 'image/png'
  }));

  const publicUrl = `https://pub-32253d31098b4cfc9f901824d48b3dc5.r2.dev/${targetKey}`;
  console.log(`✅ Successfully uploaded styled header to Cloudflare R2: ${publicUrl}`);
}

createHeader().catch(console.error);

