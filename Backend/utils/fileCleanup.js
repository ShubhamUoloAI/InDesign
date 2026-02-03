import fs from 'fs/promises';
import path from 'path';

/**
 * Deletes a file or directory recursively
 * @param {string} targetPath - Path to delete
 */
export async function deleteFile(targetPath) {
  try {
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.unlink(targetPath);
    }
  } catch (error) {
    // Ignore errors if file doesn't exist
    if (error.code !== 'ENOENT') {
      console.error(`Error deleting ${targetPath}:`, error.message);
    }
  }
}

/**
 * Deletes multiple files or directories
 * @param {string[]} paths - Array of paths to delete
 */
export async function deleteMultiple(paths) {
  await Promise.all(paths.map(p => deleteFile(p)));
}

/**
 * Cleans up temporary files older than specified age
 * @param {string} dirPath - Directory to clean
 * @param {number} maxAgeHours - Maximum age in hours (default: 24)
 */
export async function cleanupOldFiles(dirPath, maxAgeHours = 24) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      try {
        const stats = await fs.stat(fullPath);
        const age = now - stats.mtimeMs;

        if (age > maxAgeMs) {
          await deleteFile(fullPath);
          console.log(`Cleaned up old file: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Error checking file ${fullPath}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`Error cleaning up directory ${dirPath}:`, error.message);
  }
}

/**
 * Ensures a directory exists and is empty
 * @param {string} dirPath - Directory path
 */
export async function ensureEmptyDirectory(dirPath) {
  try {
    // Remove directory if it exists
    await fs.rm(dirPath, { recursive: true, force: true });
    // Create fresh directory
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create empty directory: ${error.message}`);
  }
}

/**
 * Gets the size of a file or directory in bytes
 * @param {string} targetPath - Path to check
 * @returns {Promise<number>} - Size in bytes
 */
export async function getSize(targetPath) {
  try {
    const stats = await fs.stat(targetPath);

    if (stats.isFile()) {
      return stats.size;
    }

    if (stats.isDirectory()) {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const sizes = await Promise.all(
        entries.map(entry => getSize(path.join(targetPath, entry.name)))
      );
      return sizes.reduce((total, size) => total + size, 0);
    }

    return 0;
  } catch (error) {
    return 0;
  }
}
