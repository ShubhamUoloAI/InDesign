import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  port: process.env.PORT || 5000,
  indesignAppPath: process.env.INDESIGN_APP_PATH || null, // Will use default path for platform if not set
  tempUploadPath: path.join(__dirname, '..', process.env.TEMP_UPLOAD_PATH || './temp/uploads'),
  tempExtractPath: path.join(__dirname, '..', process.env.TEMP_EXTRACT_PATH || './temp/extracted'),
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024,
};

export default config;
