import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let s3ClientInstance = null;

function getR2Client() {
  if (s3ClientInstance) return s3ClientInstance;

  const { ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY } = config.R2;

  if (ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
    try {
      s3ClientInstance = new S3Client({
        region: 'auto',
        endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: ACCESS_KEY_ID,
          secretAccessKey: SECRET_ACCESS_KEY
        }
      });
      logger.info(`Cloudflare R2 Client initialized for bucket: ${config.R2.BUCKET_NAME}`);
      return s3ClientInstance;
    } catch (err) {
      logger.warn('Failed to initialize Cloudflare R2 client:', err.message);
      return null;
    }
  }

  return null;
}

export const r2Service = {
  /**
   * Check if Cloudflare R2 credentials are fully configured
   */
  isConfigured() {
    const { ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY } = config.R2;
    return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
  },

  /**
   * General Upload strictly to Cloudflare R2 (Handles both Images and PDFs)
   * Target Bucket: spctt2027, Folder: Abstract_pdf/
   */
  async uploadFile({ buffer, originalName, mimeType = '', folder = null, filePath = null }) {
    const ext = path.extname(originalName || '').toLowerCase() || (mimeType?.includes('pdf') ? '.pdf' : '.jpg');
    const base = path
      .basename(originalName || 'file', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    const fileName = `${base}_${uniqueSuffix}${ext}`;
    
    // Store in Cloudflare R2 Abstract_pdf folder
    const targetFolder = (folder || config.R2.FOLDER || 'Abstract_pdf').replace(/^\/+|\/+$/g, '');
    const key = `${targetFolder}/${fileName}`;

    let fileBuffer = buffer;
    if (!fileBuffer && filePath && fs.existsSync(filePath)) {
      fileBuffer = fs.readFileSync(filePath);
    }

    if (!fileBuffer) {
      throw new Error('No file buffer provided for Cloudflare upload.');
    }

    const client = getR2Client();
    if (!client) {
      throw new Error('Cloudflare R2 client is not initialized. Please verify R2 credentials.');
    }

    const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(ext);
    const detectedMime = mimeType || (isImage ? (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg') : 'application/pdf');

    try {
      const command = new PutObjectCommand({
        Bucket: config.R2.BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: detectedMime
      });

      await client.send(command);
      logger.info(`Successfully uploaded to Cloudflare R2 (${config.R2.BUCKET_NAME}/${key}) [${detectedMime}]`);

      let fileUrl = '';
      if (config.R2.PUBLIC_URL) {
        const cleanPublic = config.R2.PUBLIC_URL.replace(/\/+$/, '');
        fileUrl = `${cleanPublic}/${key}`;
      } else {
        try {
          fileUrl = await this.getPresignedUrl(key, 86400 * 7); // 7 days valid
        } catch (signErr) {
          fileUrl = `https://${config.R2.BUCKET_NAME}.${config.R2.ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
        }
      }

      return {
        key,
        fileName,
        url: fileUrl,
        isR2: true,
        contentType: detectedMime,
        isImage
      };
    } catch (r2Err) {
      logger.error(`Cloudflare R2 upload error for ${key}:`, r2Err.message);
      throw new Error(`Failed to upload to Cloudflare R2: ${r2Err.message}`);
    }
  },

  /**
   * Upload an abstract document / image strictly to Cloudflare R2
   */
  async uploadAbstractDocument({ buffer, originalName, mimeType, filePath = null }) {
    return this.uploadFile({ buffer, originalName, mimeType, folder: 'Abstract_pdf', filePath });
  },

  /**
   * Upload an abstract PDF file strictly to Cloudflare R2 (spctt2027/Abstract_pdf)
   */
  async uploadAbstractPdf({ buffer, originalName, mimeType = 'application/pdf', filePath = null }) {
    return this.uploadFile({ buffer, originalName, mimeType, folder: 'Abstract_pdf', filePath });
  },

  /**
   * Generate a Presigned Download/View URL for a file stored in R2
   */
  async getPresignedUrl(key, expiresInSeconds = 3600) {
    const client = getR2Client();
    if (!client) {
      throw new Error('Cloudflare R2 client is not configured.');
    }

    const command = new GetObjectCommand({
      Bucket: config.R2.BUCKET_NAME,
      Key: key
    });

    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  },

  /**
   * Delete a file from Cloudflare R2
   */
  async deleteFile(key) {
    const client = getR2Client();
    if (!client) return false;

    try {
      const command = new DeleteObjectCommand({
        Bucket: config.R2.BUCKET_NAME,
        Key: key
      });
      await client.send(command);
      logger.info(`Deleted file from Cloudflare R2: ${key}`);
      return true;
    } catch (err) {
      logger.warn(`Could not delete file from Cloudflare R2 (${key}):`, err.message);
      return false;
    }
  }
};

export default r2Service;
