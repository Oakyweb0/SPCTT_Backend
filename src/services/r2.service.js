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
   * Upload an abstract PDF file to Cloudflare R2
   * Bucket: spctt2027, Folder: Abstract_pdf/
   */
  async uploadAbstractPdf({ buffer, originalName, mimeType = 'application/pdf', filePath = null }) {
    const ext = path.extname(originalName || 'document.pdf').toLowerCase() || '.pdf';
    const base = path
      .basename(originalName || 'abstract', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    const fileName = `${base}_${uniqueSuffix}${ext}`;
    const folder = (config.R2.FOLDER || 'Abstract_pdf').replace(/^\/+|\/+$/g, '');
    const key = `${folder}/${fileName}`;

    let fileBuffer = buffer;
    if (!fileBuffer && filePath && fs.existsSync(filePath)) {
      fileBuffer = fs.readFileSync(filePath);
    }

    const client = getR2Client();

    if (client && fileBuffer) {
      try {
        const command = new PutObjectCommand({
          Bucket: config.R2.BUCKET_NAME,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType || 'application/pdf'
        });

        await client.send(command);
        logger.info(`Successfully uploaded PDF to Cloudflare R2: ${key}`);

        let fileUrl = '';
        if (config.R2.PUBLIC_URL) {
          const cleanPublic = config.R2.PUBLIC_URL.replace(/\/+$/, '');
          fileUrl = `${cleanPublic}/${key}`;
        } else {
          // If no public domain, create presigned URL or standard R2 bucket object path
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
          isR2: true
        };
      } catch (r2Err) {
        logger.error(`Cloudflare R2 upload error for ${key}:`, r2Err.message);
        // Fallback to local storage if R2 fails
      }
    }

    // Local Storage Fallback if R2 not configured or errored
    try {
      const localDir = path.resolve(config.UPLOAD.DIR, folder);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      const localPath = path.resolve(localDir, fileName);
      if (fileBuffer) {
        fs.writeFileSync(localPath, fileBuffer);
      } else if (filePath && fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, localPath);
      }

      const localUrl = `/uploads/${folder}/${fileName}`;
      logger.info(`Saved abstract PDF locally (R2 fallback): ${localUrl}`);

      return {
        key,
        fileName,
        url: localUrl,
        isR2: false
      };
    } catch (localErr) {
      logger.error('Failed to save abstract PDF locally:', localErr.message);
      throw new Error(`Failed to save PDF: ${localErr.message}`);
    }
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
