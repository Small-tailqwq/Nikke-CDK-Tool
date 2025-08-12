import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SRC_ASSETS_DIR = path.resolve(__dirname, '../src/assets');
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
 * Generate thumbnails from main announcement images
 * @returns {Promise<void>}
 */
async function generateThumbnails() {
  try {
    console.log('🖼️  生成缩略图...');

    const THUMBS_DIR = path.join(IMAGE_DIR, 'thumbs');

    // 确保缩略图目录存在
    await fs.mkdir(THUMBS_DIR, { recursive: true });

    // 缩略图配置
    const thumbnailSizes = [
      { width: 320, height: 180, suffix: '_thumb' },
      { width: 640, height: 360, suffix: '_thumb@2x' }
    ];

    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];

    // 读取主目录中的图片文件
    const files = await fs.readdir(IMAGE_DIR);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return supportedFormats.includes(ext);
    });

    if (imageFiles.length === 0) {
      console.log('📁 未找到支持的图片文件');
      return;
    }

    console.log(`📁 发现 ${imageFiles.length} 张图片需要生成缩略图...`);

    // 生成缩略图
    let successCount = 0;
    for (const filename of imageFiles) {
      const inputPath = path.join(IMAGE_DIR, filename);
      const baseName = path.basename(filename, path.extname(filename));

      try {
        for (const size of thumbnailSizes) {
          const outputFilename = `${baseName}${size.suffix}.webp`;
          const outputPath = path.join(THUMBS_DIR, outputFilename);

          // 使用 sharp 生成缩略图
          const sharp = await import('sharp');
          await sharp.default(inputPath)
            .resize(size.width, size.height, {
              fit: 'cover',
              position: 'center'
            })
            .webp({ quality: 85 })
            .toFile(outputPath);
        }

        console.log(`✅ 已生成 ${baseName} 的缩略图`);
        successCount++;
      } catch (error) {
        console.error(`❌ 生成 ${filename} 缩略图失败:`, error.message);
      }
    }

    console.log(`🎉 缩略图生成完成! (${successCount}/${imageFiles.length})`);

  } catch (error) {
    console.error('❌ 缩略图生成失败:', error.message);
    throw error;
  }
}

/**
 * Process images in the directory - convert to WebP if needed
 * @returns {Promise<void>}
 */
async function processImages() {
  // Generate thumbnails from main directory images
  await generateThumbnails();
}

/**
 * Process images in a specific directory
 * @param {string} directory - Directory to process
 * @returns {Promise<void>}
 */
async function processImageDirectory(directory) {
  try {
    const files = await fs.readdir(directory);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif'].includes(ext);
    });

    if (imageFiles.length > 0) {
      console.log(`🖼️  在 ${path.relative(PUBLIC_DIR, directory)} 发现 ${imageFiles.length} 张图片需要转换...`);

      for (const file of imageFiles) {
        const inputPath = path.join(directory, file);
        const nameWithoutExt = path.parse(file).name;
        const outputPath = path.join(directory, `${nameWithoutExt}.webp`);

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
 * Convert src/assets/doro_icon.png to public/doro_icon.webp for runtime usage
 */
async function ensureDoroIconWebp() {
  try {
    const pngPath = path.join(SRC_ASSETS_DIR, 'doro_icon.png');
    const webpOut = path.join(PUBLIC_DIR, 'doro_icon.webp');

    // Check png exists
    await fs.access(pngPath);

    // If webp already exists, skip
    try {
      await fs.access(webpOut);
      console.log('⏭️  doro_icon.webp 已存在，跳过转换...');
      return;
    } catch { }

    // Try sharp first
    try {
      const sharp = await import('sharp');
      await sharp.default(pngPath).webp({ quality: 80 }).toFile(webpOut);
      console.log('✅ 已生成 public/doro_icon.webp');
      return;
    } catch { }

    // Fallback to cwebp
    try {
      execSync(`cwebp -q 80 "${pngPath}" -o "${webpOut}"`, { stdio: 'pipe' });
      console.log('✅ 使用 cwebp 生成 public/doro_icon.webp');
    } catch (err) {
      console.warn('⚠️  未能生成 doro_icon.webp，请安装 sharp 或 cwebp');
    }
  } catch {
    // png not found — ignore
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
      return `announcement-images/${baseName}${ext}`;
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
      newCdk.image = "announcement-images/default.webp";
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
      newCdk.image = "announcement-images/default.webp";
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
    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    await fs.mkdir(SRC_ASSETS_DIR, { recursive: true });

    // 2. Prepare common webp asset for app animations
    await ensureDoroIconWebp();

    // 3. Process and convert announcement images to WebP
    await processImages();

    // 4. Read the source CDK list
    console.log(`📄 正在读取源 CDK 列表文件：${SOURCE_LIST_PATH}...`);
    const sourceListContent = await fs.readFile(SOURCE_LIST_PATH, 'utf-8');
    const sourceData = JSON.parse(sourceListContent);
    const sourceCdkList = sourceData.cdks;

    if (!Array.isArray(sourceCdkList)) {
      throw new Error('源文件不是有效的 CDK 列表格式。');
    }
    console.log(`👍 在源文件中找到 ${sourceCdkList.length} 个 CDK 项目。`);

    // 5. Process CDK items and assign local image paths
    const finalCdkList = [];
    for (const cdk of sourceCdkList) {
      const processedCdk = await processCDKItem(cdk);
      finalCdkList.push(processedCdk);
    }

    // 6. Write the new, browser-ready cdk-list.json
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

