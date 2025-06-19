/**
 * 格式化note内容，支持换行和Markdown链接
 * @param {string} note - 原始note内容
 * @returns {string} - 格式化后的HTML内容
 */
export function formatNoteContent(note) {
  if (!note) return ''

  let formattedNote = note

  // 1. 转义HTML特殊字符（除了我们要处理的换行和链接）
  formattedNote = formattedNote
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  // 2. 处理换行符
  formattedNote = formattedNote.replace(/\n/g, '<br>')

  // 3. 处理Markdown格式的链接 [文本](URL)
  const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
  formattedNote = formattedNote.replace(markdownLinkRegex, (match, text, url) => {
    // 清理URL，去掉可能的引号
    const cleanUrl = url.trim()
    const linkText = text || cleanUrl // 如果没有文本，使用URL作为显示文本

    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--el-color-primary); text-decoration: underline;">${linkText}</a>`
  })

  return formattedNote
}

/**
 * 提取note中的Markdown链接信息
 * @param {string} note - note内容
 * @returns {Array} - 链接信息数组
 */
export function extractLinksFromNote(note) {
  if (!note) return []

  const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
  const links = []
  let match

  while ((match = markdownLinkRegex.exec(note)) !== null) {
    const text = match[1] || match[2] // 显示文本，如果为空则使用URL
    const url = match[2].trim() // URL部分
    links.push({
      url: url,
      text: text,
      index: match.index
    })
  }

  return links
}

/**
 * 获取note的纯文本版本（用于tooltip等场景）
 * @param {string} note - note内容
 * @returns {string} - 纯文本内容
 */
export function getPlainTextNote(note) {
  if (!note) return ''

  // 移除HTML标签，保留换行
  return note
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
} 