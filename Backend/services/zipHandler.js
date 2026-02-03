import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';

/**
 * Extracts a zip file and finds InDesign files
 * @param {string} zipPath - Path to the zip file
 * @param {string} extractPath - Path to extract the contents to
 * @returns {Promise<{indesignFile: string, extractedPath: string}>}
 */
export async function extractZipAndFindInDesignFile(zipPath, extractPath) {
  try {
    // Extract the zip file
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    // Find InDesign file (.indd or .idml)
    const indesignFile = await findInDesignFile(extractPath);

    if (!indesignFile) {
      throw new Error('No InDesign file (.indd or .idml) found in the zip');
    }

    return {
      indesignFile,
      extractedPath: extractPath
    };
  } catch (error) {
    if (error.message.includes('No InDesign file')) {
      throw error;
    }
    throw new Error(`Failed to extract zip file: ${error.message}`);
  }
}

/**
 * Recursively searches for InDesign files in a directory
 * @param {string} dirPath - Directory to search
 * @returns {Promise<string|null>} - Path to the InDesign file or null
 */
async function findInDesignFile(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip system directories
        if (entry.name.startsWith('.') || entry.name === '__MACOSX') {
          continue;
        }

        // Recursively search subdirectories
        const found = await findInDesignFile(fullPath);
        if (found) return found;
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.indd' || ext === '.idml') {
          return fullPath;
        }
      }
    }

    return null;
  } catch (error) {
    throw new Error(`Error searching for InDesign file: ${error.message}`);
  }
}

/**
 * Validates that a file is a valid zip file
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>}
 */
export async function isValidZipFile(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    return zipEntries.length > 0;
  } catch (error) {
    return false;
  }
}
