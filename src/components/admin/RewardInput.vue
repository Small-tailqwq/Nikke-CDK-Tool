<template>
  <div ref="wrapRef" class="reward-input">
    <el-input
      ref="inputRef"
      :model-value="modelValue"
      type="textarea"
      :rows="rows"
      :autosize="{ minRows: rows, maxRows: 10 }"
      :placeholder="placeholder"
      spellcheck="false"
      @update:model-value="onInput"
      @keydown="onKeydown"
      @click="scheduleRefresh"
      @focus="onFocus"
      @blur="onBlur"
    />

    <div v-if="open && suggestions.length" class="reward-suggest" @mousedown.prevent>
      <div
        v-for="(s, i) in suggestions"
        :key="s.insert + i"
        class="reward-suggest-item"
        :class="{ active: i === activeIndex }"
        @mouseenter="activeIndex = i"
        @click="applySuggestion(s)"
      >
        <span class="reward-suggest-label">
          <template v-for="(part, pi) in s.parts" :key="pi">
            <b v-if="part.hit">{{ part.text }}</b>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
        <span class="reward-suggest-hint">{{ s.hint }}</span>
      </div>
      <div class="reward-suggest-tip">↑↓ 选择 · Enter/Tab 补全 · Esc 关闭</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  /** [{ name, count, quantities: [{ value, count }] }]，按出现频次降序 */
  pool: { type: Array, default: () => [] },
  placeholder: { type: String, default: '如：珠宝×300, 高级招募券×5（逗号分隔）' },
  rows: { type: Number, default: 3 },
})
const emit = defineEmits(['update:modelValue'])

const MAX_ITEMS = 12
/** 半角/全角逗号都视为奖励项分隔符 */
const SEPARATORS = [',', '，']

const inputRef = ref(null)
const wrapRef = ref(null)
const open = ref(false)
const activeIndex = ref(0)
const caret = ref(0)
let blurTimer = null

function textareaEl() {
  return inputRef.value?.textarea || null
}

/** 取光标所在的那一段奖励文本（上一个逗号之后 → 光标处） */
const fragmentInfo = computed(() => {
  const value = props.modelValue || ''
  const pos = Math.min(caret.value, value.length)
  let start = 0
  for (const sep of SEPARATORS) {
    const idx = value.lastIndexOf(sep, Math.max(0, pos - 1))
    if (idx >= 0 && idx + 1 > start) start = idx + 1
  }
  const raw = value.slice(start, pos)
  const trimmed = raw.replace(/^\s+/, '')
  return { fragment: trimmed, start: start + (raw.length - trimmed.length), end: pos }
})

function highlightParts(label, keyword) {
  if (!keyword) return [{ text: label, hit: false }]
  const idx = label.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx < 0) return [{ text: label, hit: false }]
  return [
    { text: label.slice(0, idx), hit: false },
    { text: label.slice(idx, idx + keyword.length), hit: true },
    { text: label.slice(idx + keyword.length), hit: false },
  ].filter((p) => p.text)
}

const suggestions = computed(() => {
  const pool = props.pool || []
  const fragment = fragmentInfo.value.fragment.trim()

  // 空片段：给出最常用的道具
  if (!fragment) {
    return pool.slice(0, 8).map((p) => ({
      insert: `${p.name}×`,
      complete: false,
      hint: `${p.count} 次`,
      parts: highlightParts(p.name, ''),
    }))
  }

  // 已经输入了 "道具×"：改为补全常用数量
  const crossIdx = fragment.lastIndexOf('×')
  if (crossIdx > 0) {
    const name = fragment.slice(0, crossIdx).trim()
    const qty = fragment.slice(crossIdx + 1).trim()
    const item = pool.find((p) => p.name === name)
    if (!item) return []
    return item.quantities
      .filter((q) => !qty || String(q.value).startsWith(qty))
      .slice(0, 8)
      .map((q) => ({
        insert: `${name}×${q.value}`,
        complete: true,
        hint: `${q.count} 次`,
        parts: highlightParts(`${name}×${q.value}`, fragment),
      }))
  }

  // 普通道具名匹配：前缀命中优先
  const key = fragment.toLowerCase()
  const hits = pool.filter((p) => p.name.toLowerCase().includes(key))
  hits.sort((a, b) => {
    const ap = a.name.toLowerCase().startsWith(key) ? 0 : 1
    const bp = b.name.toLowerCase().startsWith(key) ? 0 : 1
    return ap - bp || b.count - a.count
  })
  return hits.slice(0, MAX_ITEMS).map((p) => ({
    insert: `${p.name}×`,
    complete: false,
    hint: `${p.count} 次`,
    parts: highlightParts(p.name, fragment),
  }))
})

function syncCaret() {
  const el = textareaEl()
  if (el) caret.value = el.selectionStart ?? (props.modelValue || '').length
}

function scheduleRefresh() {
  nextTick(() => {
    syncCaret()
    activeIndex.value = 0
    open.value = true
  })
}

function onInput(value) {
  emit('update:modelValue', value)
  scheduleRefresh()
}

function onFocus() {
  if (blurTimer) clearTimeout(blurTimer)
  scheduleRefresh()
}

function onBlur() {
  // 延迟关闭，让候选项的 click 先触发
  blurTimer = setTimeout(() => (open.value = false), 150)
}

function applySuggestion(s) {
  const value = props.modelValue || ''
  const { start, end } = fragmentInfo.value
  const insert = s.complete ? `${s.insert}, ` : s.insert
  const next = value.slice(0, start) + insert + value.slice(end)
  emit('update:modelValue', next)

  const nextCaret = start + insert.length
  nextTick(() => {
    const el = textareaEl()
    if (el) {
      el.focus()
      el.setSelectionRange(nextCaret, nextCaret)
    }
    caret.value = nextCaret
    activeIndex.value = 0
    // 补全道具名后继续提示数量；补全数量后展示下一项的候选
    open.value = true
  })
}

function onKeydown(e) {
  if (e.isComposing || e.keyCode === 229) return

  if (e.key === 'Escape') {
    if (open.value) {
      e.preventDefault()
      e.stopPropagation()
      open.value = false
    }
    return
  }

  if (!open.value || suggestions.value.length === 0) {
    // 方向键/回车不拦截，但要同步光标位置
    nextTick(syncCaret)
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value =
      (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    applySuggestion(suggestions.value[activeIndex.value])
  } else {
    nextTick(syncCaret)
  }
}

onBeforeUnmount(() => {
  if (blurTimer) clearTimeout(blurTimer)
})
</script>

<style lang="scss" scoped>
.reward-input {
  position: relative;
  width: 100%;
}

.reward-suggest {
  position: absolute;
  z-index: 3000;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 260px;
  overflow-y: auto;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  padding: 4px;
}

.reward-suggest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--el-text-color-primary);

  &.active {
    background: var(--el-fill-color);
  }

  b {
    color: var(--el-color-primary);
  }
}

.reward-suggest-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reward-suggest-hint {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.reward-suggest-tip {
  padding: 6px 10px 2px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 4px;
}
</style>
