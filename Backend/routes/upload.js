import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config.js';
import { extractZipAndFindInDesignFile, isValidZipFile } from '../services/zipHandler.js';
import { convertInDesignToPDF } from '../services/indesignService.js';
import { deleteMultiple } from '../utils/fileCleanup.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.tempUploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeBytes
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip') {
      return cb(new Error('Only .zip files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/upload
 * Handles zip file upload and converts InDesign files to PDF
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  let uploadedFilePath = null;
  let extractPath = null;
  let pdfPath = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    uploadedFilePath = req.file.path;
    console.log(`File uploaded: ${uploadedFilePath}`);

    // Validate zip file
    const isValid = await isValidZipFile(uploadedFilePath);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or corrupt zip file' });
    }

    // Create unique extraction directory
    const extractId = uuidv4();
    extractPath = path.join(config.tempExtractPath, extractId);

    // Extract zip and find InDesign file
    console.log('Extracting zip file...');
    const { indesignFile } = await extractZipAndFindInDesignFile(uploadedFilePath, extractPath);
    console.log(`InDesign file found: ${indesignFile}`);

    // Convert to PDF using InDesign Server
    console.log('Converting to PDF...');
    pdfPath = await convertInDesignToPDF(indesignFile, extractPath);
    console.log(`PDF generated: ${pdfPath}`);

    // Send PDF file to client
    const originalName = path.basename(req.file.originalname, '.zip');
    res.download(pdfPath, `${originalName}.pdf`, async (err) => {
      // Clean up files after sending (or if error occurs)
      await cleanupFiles([uploadedFilePath, extractPath, pdfPath]);

      if (err) {
        console.error('Error sending file:', err);
      }
    });

  } catch (error) {
    console.error('Upload error:', error);

    // Clean up files on error
    await cleanupFiles([uploadedFilePath, extractPath, pdfPath]);

    // Send appropriate error response
    if (error.message.includes('No InDesign file')) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message.includes('Cannot connect to InDesign Server')) {
      return res.status(503).json({
        error: 'InDesign Server is not available',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to process file',
      details: error.message
    });
  }
});

/**
 * Helper function to clean up temporary files
 * @param {string[]} paths - Array of file/directory paths to delete
 */
async function cleanupFiles(paths) {
  const validPaths = paths.filter(p => p !== null && p !== undefined);
  if (validPaths.length > 0) {
    await deleteMultiple(validPaths);
    console.log('Cleaned up temporary files');
  }
}

export default router;
