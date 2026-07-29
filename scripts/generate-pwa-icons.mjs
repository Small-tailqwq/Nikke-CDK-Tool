import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconsDir = join(publicDir, 'icons')
mkdirSync(iconsDir, { recursive: true })

const SOURCE = join(publicDir, 'doro_icon.webp')

const render = async (size, contentScale, background, outFile) => {
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background || { r: 20, g: 20, b: 20, alpha: 1 },
    },
  })

  const content = await sharp(SOURCE)
    .resize(Math.round(size * (contentScale || 1)), Math.round(size * (contentScale || 1)), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return canvas
    .composite([{ input: content, gravity: 'center' }])
    .png()
    .toFile(join(iconsDir, outFile))
}

const run = async () => {
  await render(192, 1, { r: 20, g: 20, b: 20, alpha: 1 }, 'icon-192.png')
  await render(512, 1, { r: 20, g: 20, b: 20, alpha: 1 }, 'icon-512.png')
  // Maskable：内容限制在 80% 安全区，留出可裁剪边距
  await render(512, 0.8, { r: 20, g: 20, b: 20, alpha: 1 }, 'maskable-512.png')
  console.log('✅ PWA 图标已生成到 public/icons/')
}

run().catch((err) => {
  console.error('生成 PWA 图标失败:', err)
  process.exit(1)
})
