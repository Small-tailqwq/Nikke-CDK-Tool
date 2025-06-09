import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';
import { fileURLToPath } from 'node:url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SOURCE_LIST_PATH = path.resolve(PUBLIC_DIR, 'cdk-list.source.json'); // Source of truth
const OUTPUT_LIST_PATH = path.resolve(PUBLIC_DIR, 'cdk-list.json');       // File for the browser
const IMAGE_DIR = path.resolve(PUBLIC_DIR, 'announcement-images');

// --- Helper Functions ---

/**
 * Sanitize a string to be used as a filename.
 * @param {string} str The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeFilename(str) {
  // Replace slashes and remove characters that are invalid in filenames.
  return str.replace(/[\/\\?%*:|"<>]/g, '-');
}

/**
 * Downloads a file from a URL to a local path.
 * @param {string} url The URL of the file to download.
 * @param {string} destPath The destination path to save the file.
 * @returns {Promise<void>}
 */
async function downloadImage(url, destPath) {
  console.log(`📥 Downloading ${url}`);
  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: 15000, // 15-second timeout
    });
    await pipeline(response.data, createWriteStream(destPath));
    console.log(`✅ Downloaded to ${destPath}`);
  } catch (error) {
    console.error(`❌ Failed to download ${url}:`, error.message);
    // Don't re-throw, allow script to continue for other images
  }
}


// --- Main Execution ---
async function main() {
  console.log('�� Starting pre-build script to process CDK list and images...');

  try {
    // 1. Ensure directories exist
    await fs.mkdir(IMAGE_DIR, { recursive: true });

    // 2. Read the source CDK list
    console.log(`📄 Reading source CDK list from ${SOURCE_LIST_PATH}...`);
    const sourceListContent = await fs.readFile(SOURCE_LIST_PATH, 'utf-8');
    const sourceData = JSON.parse(sourceListContent);
    const sourceCdkList = sourceData.cdks;

    if (!Array.isArray(sourceCdkList)) {
      throw new Error('Source file is not a valid CDK list.');
    }
    console.log(`👍 Found ${sourceCdkList.length} CDK items in source.`);

    // 3. Process images and create the new list for the browser
    const downloadQueue = [];
    const existingFiles = new Set(await fs.readdir(IMAGE_DIR));
    const finalCdkList = [];

    for (const cdk of sourceCdkList) {
      const newCdk = { ...cdk }; // Create a copy to modify
      if (newCdk.image) {
        const originalUrl = newCdk.image;
        let fileExtension = path.extname(new URL(originalUrl).pathname);
        if (!fileExtension || fileExtension.length > 5) fileExtension = '.png'; // Default extension and basic validation
        const filename = `${sanitizeFilename(newCdk.code)}${fileExtension}`;

        // IMPORTANT: The path for the browser must be an absolute path from the public root
        newCdk.image = `/announcement-images/${filename}`;

        if (!existingFiles.has(filename)) {
          const localPath = path.join(IMAGE_DIR, filename);
          downloadQueue.push(() => downloadImage(originalUrl, localPath));
        }
      }
      finalCdkList.push(newCdk);
    }

    // Run downloads sequentially to avoid overwhelming the network/server
    if (downloadQueue.length > 0) {
      console.log(`Found ${downloadQueue.length} new images to download.`);
      for (const download of downloadQueue) {
        await download();
      }
    } else {
      console.log('✅ All images are already cached.');
    }

    // 4. Write the new, browser-ready cdk-list.json
    const finalData = { ...sourceData, cdks: finalCdkList };
    await fs.writeFile(OUTPUT_LIST_PATH, JSON.stringify(finalData, null, 2));
    console.log(`✅ New cdk-list.json created for browser at ${OUTPUT_LIST_PATH}`);

    // 5. Clean up the now-obsolete manifest file if it exists
    try {
      const manifestPath = path.resolve(PUBLIC_DIR, 'image-manifest.json');
      await fs.unlink(manifestPath);
      console.log('🗑️  Cleaned up old image-manifest.json.');
    } catch (error) {
      if (error.code !== 'ENOENT') { // ENOENT means file doesn't exist, which is fine
        console.warn('Could not clean up manifest file:', error.message);
      }
    }

    console.log('🎉 Pre-build script finished successfully!');
  } catch (error) {
    console.error('🔥 Pre-build script failed:', error);
    process.exit(1); // Exit with error code to fail the build
  }
}

main();
