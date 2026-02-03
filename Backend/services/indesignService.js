import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import config from "../config/config.js";

/**
 * Converts an InDesign file to PDF using desktop Adobe InDesign
 * @param {string} indesignFilePath - Path to the .indd or .idml file
 * @param {string} outputDir - Directory to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF file
 */
export async function convertInDesignToPDF(indesignFilePath, outputDir) {
  try {
    // Verify InDesign file exists
    const fileExists = await checkFileExists(indesignFilePath);
    if (!fileExists) {
      throw new Error(`InDesign file not found: ${indesignFilePath}`);
    }

    // Generate output PDF path
    const filename = path.basename(
      indesignFilePath,
      path.extname(indesignFilePath)
    );
    const pdfPath = path.join(outputDir, `${filename}.pdf`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Create and execute ExtendScript
    await executeInDesignScript(indesignFilePath, pdfPath);

    // Verify PDF was created
    const pdfExists = await checkFileExists(pdfPath);
    if (!pdfExists) {
      throw new Error("PDF was not generated successfully");
    }

    return pdfPath;
  } catch (error) {
    throw new Error(`Failed to convert InDesign to PDF: ${error.message}`);
  }
}

/**
 * Executes ExtendScript via desktop InDesign application
 * @param {string} indesignFilePath - Path to the InDesign file
 * @param {string} pdfOutputPath - Path where PDF should be saved
 */
async function executeInDesignScript(indesignFilePath, pdfOutputPath) {
  // Create temporary ExtendScript file
  const scriptPath = path.join(
    os.tmpdir(),
    `indesign_export_${Date.now()}.jsx`
  );

  // ExtendScript to open InDesign file and export to PDF
  const script = `
#target indesign

try {
  $.writeln("Starting InDesign conversion script...");

  // Suppress all dialogs and user interaction
  app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;

  $.writeln("Opening InDesign document...");

  // Open the InDesign document
  var sourceFile = File("${indesignFilePath.replace(/\\/g, "/")}");
  if (!sourceFile.exists) {
    throw new Error("Source file not found: " + sourceFile.fsName);
  }

  var doc = app.open(sourceFile, false); // false = don't show dialogs

  $.writeln("Document opened successfully. Pages: " + doc.pages.length);

  // Check for missing fonts (don't fail, just warn)
  if (doc.fonts.length > 0) {
    $.writeln("Document has " + doc.fonts.length + " fonts");
  }

  // Export to PDF
  var pdfFile = File("${pdfOutputPath.replace(/\\/g, "/")}");

  $.writeln("Configuring PDF export preferences...");

  // Set PDF export preset (using default High Quality Print preset)
  app.pdfExportPreferences.pageRange = PageRange.ALL_PAGES;

  $.writeln("Starting PDF export...");

  // Export the document
  doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false);

  $.writeln("PDF export completed successfully");

  // Close the document without saving
  doc.close(SaveOptions.NO);

  $.writeln("Document closed. Conversion complete.");

  // Quit InDesign to ensure process terminates
  app.quit();

  // Return success message
  "SUCCESS";

} catch (err) {
  $.writeln("ERROR occurred: " + err.message);

  // Close document if it's open
  if (typeof doc !== 'undefined') {
    try {
      $.writeln("Attempting to close document...");
      doc.close(SaveOptions.NO);
    } catch (e) {
      $.writeln("Could not close document: " + e.message);
    }
  }

  // Try to quit InDesign
  try {
    app.quit();
  } catch (e) {}

  // Write error to stderr
  $.writeln("ERROR: " + err.message);
  throw err;
}
`;

  try {
    // Write script to temporary file
    await fs.writeFile(scriptPath, script, "utf8");

    // Execute InDesign with the script
    await runInDesignWithScript(scriptPath);

    // Clean up temporary script file
    await fs.unlink(scriptPath).catch(() => {});
  } catch (error) {
    // Clean up temporary script file on error
    await fs.unlink(scriptPath).catch(() => {});
    throw error;
  }
}

/**
 * Runs Adobe InDesign with an ExtendScript file
 * @param {string} scriptPath - Path to the .jsx script file
 */
async function runInDesignWithScript(scriptPath) {
  return new Promise(async (resolve, reject) => {
    console.log("[InDesign] Starting InDesign process...");
    const platform = os.platform();
    let indesignPath = config.indesignAppPath;
    let args;

    // Default paths if not configured
    if (!indesignPath) {
      if (platform === "darwin") {
        // macOS default path
        indesignPath =
          "/Applications/Adobe InDesign 2024/Adobe InDesign 2024.app/Contents/MacOS/Adobe InDesign 2024";
      } else if (platform === "win32") {
        // Windows default path (adjust version as needed)
        indesignPath =
          "C:\\Program Files\\Adobe\\Adobe InDesign 2024\\InDesign.exe";
      } else {
        reject(new Error("Unsupported platform for Adobe InDesign automation"));
        return;
      }
    }

    // Set up command arguments based on platform
    if (platform === "darwin") {
      // macOS: Create AppleScript file to execute the ExtendScript
      const appleScriptPath = scriptPath.replace(".jsx", ".scpt");
      const appleScriptContent = `tell application "Adobe InDesign 2026"
\tactivate
\tset scriptFile to POSIX file "${scriptPath}"
\tdo script scriptFile language javascript
end tell`;

      await fs.writeFile(appleScriptPath, appleScriptContent, "utf8");

      indesignPath = "osascript";
      args = [appleScriptPath];
    } else if (platform === "win32") {
      // Windows: Use -ScriptPath argument
      args = ["-ScriptPath", scriptPath];
    } else {
      reject(new Error("Unsupported platform for Adobe InDesign automation"));
      return;
    }

    // Set up environment to suppress macOS duplicate class warnings
    const env = {
      ...process.env,
      OBJC_DISABLE_INITIALIZE_FORK_SAFETY: "YES",
    };

    const childProcess = spawn(indesignPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: env,
      detached: false,
    });

    console.log(`[InDesign] Process spawned with PID: ${childProcess.pid}`);

    let stdout = "";
    let stderr = "";
    let isResolved = false;

    // Set a timeout for the InDesign process (5 minutes)
    const timeout = setTimeout(() => {
      if (!isResolved) {
        console.log("[InDesign] Process timeout - killing InDesign...");
        childProcess.kill("SIGTERM");
        setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill("SIGKILL");
          }
        }, 5000);
        reject(
          new Error(
            "InDesign process timed out after 5 minutes. This may indicate missing fonts, missing links, or InDesign waiting for user input."
          )
        );
      }
    }, 5 * 60 * 1000); // 5 minutes timeout

    childProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      console.log("[InDesign stdout]:", output.trim());
    });

    childProcess.stderr.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      console.log("[InDesign stderr]:", output.trim());
    });

    childProcess.on("error", (error) => {
      isResolved = true;
      clearTimeout(timeout);
      reject(
        new Error(
          `Failed to launch InDesign: ${error.message}. Please ensure InDesign is installed at: ${indesignPath}`
        )
      );
    });

    childProcess.on("close", (code) => {
      isResolved = true;
      clearTimeout(timeout);

      console.log(`[InDesign] Process closed with exit code: ${code}`);

      // Filter out macOS objc duplicate class warnings (they're harmless)
      const filteredStderr = stderr
        .split("\n")
        .filter(
          (line) =>
            !line.includes("Class AdobeSimpleURLSession") &&
            !line.includes("objc[") &&
            !line.includes("is implemented in both") &&
            !line.includes("One of the duplicates must be removed")
        )
        .join("\n")
        .trim();

      if (code !== 0 || filteredStderr.includes("ERROR:")) {
        console.log("[InDesign] Conversion FAILED");
        reject(
          new Error(
            `InDesign script execution failed: ${
              filteredStderr || stdout || `Exit code ${code}`
            }`
          )
        );
      } else {
        console.log("[InDesign] Conversion SUCCESS");
        resolve(stdout);
      }
    });
  });
}

/**
 * Checks if a file exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Tests if Adobe InDesign application is available
 * @returns {Promise<boolean>}
 */
export async function testInDesignConnection() {
  try {
    const platform = os.platform();
    let indesignPath = config.indesignAppPath;

    if (!indesignPath) {
      if (platform === "darwin") {
        indesignPath =
          "/Applications/Adobe InDesign 2024/Adobe InDesign 2024.app/Contents/MacOS/Adobe InDesign 2024";
      } else if (platform === "win32") {
        indesignPath =
          "C:\\Program Files\\Adobe\\Adobe InDesign 2024\\InDesign.exe";
      } else {
        return false;
      }
    }

    const exists = await checkFileExists(indesignPath);
    return exists;
  } catch (error) {
    return false;
  }
}
