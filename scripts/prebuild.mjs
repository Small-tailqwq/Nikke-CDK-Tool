import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SOURCE_LIST_PATH = path.resolve(PUBLIC_DIR, 'cdk-list.source.json');
const OUTPUT_LIST_PATH = path.resolve(PUBLIC_DIR, 'cdk-list.json');
const IMAGE_DIR = path.resolve(PUBLIC_DIR, 'announcement-images');

// --- Helper Functions ---

/**
 * Sanitize a string to be used as a filename.
 * @param {string} str The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeFilename(str) {
  return str.replace(/[\/\\?%*:|"<>]/g, '-');
}

/**
 * Check if a CDK item is a group
 * @param {object} cdk 
 * @returns {boolean}
 */
function isCDKGroup(cdk) {
  return cdk.type === 'group' && Array.isArray(cdk.cdks);
}

/**
 * Convert image to WebP format using sharp (if available) or cwebp
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @returns {Promise<boolean>} Success status
 */
async function convertToWebP(inputPath, outputPath) {
  try {
    // Try using sharp first (if installed)
    try {
      const sharp = await import('sharp');
      await sharp.default(inputPath)
        .webp({ quality: 80 })
        .toFile(outputPath);
      console.log(`✅ 使用 sharp 转换 ${path.basename(inputPath)} 为 WebP 格式`);
      return true;
    } catch (sharpError) {
      // Fallback to cwebp command line tool
      try {
        execSync(`cwebp -q 80 "${inputPath}" -o "${outputPath}"`, { stdio: 'pipe' });
        console.log(`✅ 使用 cwebp 转换 ${path.basename(inputPath)} 为 WebP 格式`);
        return true;
      } catch (cwebpError) {
        console.warn(`⚠️  无法转换 ${path.basename(inputPath)}: 未找到可用的转换工具`);
        console.warn('请安装 sharp (npm install sharp) 或 cwebp 命令行工具以进行图像转换');
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ 转换失败 ${path.basename(inputPath)}:`, error.message);
    return false;
  }
}

/**
 * Process images in the directory - convert to WebP if needed
 * @returns {Promise<void>}
 */
async function processImages() {
  try {
    const files = await fs.readdir(IMAGE_DIR);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif'].includes(ext);
    });

    if (imageFiles.length > 0) {
      console.log(`🖼️  发现 ${imageFiles.length} 张图片需要转换...`);

      for (const file of imageFiles) {
        const inputPath = path.join(IMAGE_DIR, file);
        const nameWithoutExt = path.parse(file).name;
        const outputPath = path.join(IMAGE_DIR, `${nameWithoutExt}.webp`);

        // Check if WebP version already exists
        try {
          await fs.access(outputPath);
          console.log(`⏭️  ${nameWithoutExt}.webp 已存在，跳过转换...`);
          continue;
        } catch {
          // WebP doesn't exist, proceed with conversion
        }

        const success = await convertToWebP(inputPath, outputPath);
        if (success) {
          // Optionally remove original file after successful conversion
          // await fs.unlink(inputPath);
          // console.log(`🗑️  已删除原文件 ${file}`);
        }
      }
    }
  } catch (error) {
    console.warn('无法处理图片:', error.message);
  }
}

/**
 * Generate local image path for CDK
 * @param {string} cdkCode CDK code or group ID
 * @returns {string} Local image path
 */
function generateLocalImagePath(cdkCode) {
  const filename = `${sanitizeFilename(cdkCode)}.webp`;
  return `/announcement-images/${filename}`;
}

/**
 * Check if local image file exists (WebP first, then fallback formats)
 * @param {string} cdkCode CDK code or group ID
 * @returns {Promise<string|null>} Image path if found, null otherwise
 */
async function findImageFile(cdkCode) {
  const baseName = sanitizeFilename(cdkCode);
  const extensions = ['.webp', '.png', '.jpg', '.jpeg'];

  for (const ext of extensions) {
    try {
      const filePath = path.join(IMAGE_DIR, `${baseName}${ext}`);
      await fs.access(filePath);
      return `/announcement-images/${baseName}${ext}`;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Process a single CDK item (either single CDK or CDK group)
 * @param {object} cdk 
 * @returns {Promise<object>} Processed CDK item
 */
async function processCDKItem(cdk) {
  const newCdk = { ...cdk };

  if (isCDKGroup(cdk)) {
    // Process CDK group - use groupId for image name
    const groupImagePath = await findImageFile(cdk.groupId);
    if (groupImagePath) {
      newCdk.image = groupImagePath;
    } else {
      newCdk.image = "/announcement-images/default.webp";
    }

    // Process each CDK in the group (usually no individual images for group items)
    if (newCdk.cdks) {
      newCdk.cdks = await Promise.all(newCdk.cdks.map(async (subCdk) => {
        const processedSubCdk = { ...subCdk };

        // Remove image field from sub-CDKs since they typically don't have individual images
        if (processedSubCdk.image) {
          delete processedSubCdk.image;
        }

        return processedSubCdk;
      }));
    }
  } else {
    // Process single CDK
    const cdkImagePath = await findImageFile(cdk.code);
    if (cdkImagePath) {
      newCdk.image = cdkImagePath;
    } else {
      newCdk.image = "/announcement-images/default.webp";
    }
  }

  return newCdk;
}

// --- Main Execution ---
async function main() {
  console.log('🚀 开始执行预构建脚本，处理 CDK 列表...');

  try {
    // 1. Ensure directories exist
    await fs.mkdir(IMAGE_DIR, { recursive: true });

    // 2. Process and convert images to WebP
    await processImages();

    // 3. Read the source CDK list
    console.log(`📄 正在读取源 CDK 列表文件：${SOURCE_LIST_PATH}...`);
    const sourceListContent = await fs.readFile(SOURCE_LIST_PATH, 'utf-8');
    const sourceData = JSON.parse(sourceListContent);
    const sourceCdkList = sourceData.cdks;

    if (!Array.isArray(sourceCdkList)) {
      throw new Error('源文件不是有效的 CDK 列表格式。');
    }
    console.log(`👍 在源文件中找到 ${sourceCdkList.length} 个 CDK 项目。`);

    // 4. Process CDK items and assign local image paths
    const finalCdkList = [];
    for (const cdk of sourceCdkList) {
      const processedCdk = await processCDKItem(cdk);
      finalCdkList.push(processedCdk);
    }

    // 5. Write the new, browser-ready cdk-list.json
    const finalData = { ...sourceData, cdks: finalCdkList };
    await fs.writeFile(OUTPUT_LIST_PATH, JSON.stringify(finalData, null, 2));
    console.log(`✅ 已为浏览器创建新的 cdk-list.json 文件：${OUTPUT_LIST_PATH}`);

    console.log('🎉 预构建脚本执行成功！');
  } catch (error) {
    console.error('🔥 预构建脚本执行失败:', error);
    process.exit(1);
  }
}

main();

