<template>
  <Teleport to="body">
    <Transition name="iv-fade" @after-leave="onAfterLeave">
      <div
        v-if="modelValue"
        class="image-viewer-mask"
        @click.self="close"
      >
        <img
          v-if="!failed"
          :key="url"
          :src="url"
          :alt="alt"
          class="image-viewer-img"
          :class="{ 'is-loaded': loaded }"
          @load="onLoad"
          @error="onError"
          @click.stop
        />
        <div v-if="loading && !failed" class="image-viewer-loading">
          <el-icon class="iv-spinner"><Loading /></el-icon>
        </div>
        <div v-if="failed" class="image-viewer-error">
          <el-icon><Picture /></el-icon>
          <span>图片加载失败</span>
        </div>

        <button
          type="button"
          class="image-viewer-close"
          :title="'关闭'"
          @click.stop="close"
        >
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { Close, Loading, Picture } from '@element-plus/icons-vue'

interface Props {
  modelValue: boolean
  url: string
  alt?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '图片',
})
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const loaded = ref(false)
const failed = ref(false)
const loading = ref(false)
let savedOverflow = ''

function resetState() {
  loaded.value = false
  failed.value = false
  loading.value = !!props.url
}

function close() {
  emit('update:modelValue', false)
}

function onLoad() {
  loaded.value = true
  loading.value = false
}

function onError() {
  failed.value = true
  loading.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    e.preventDefault()
    close()
  }
}

function lockScroll(lock: boolean) {
  if (typeof document === 'undefined') return
  if (lock) {
    if (document.body.style.overflow !== 'hidden') {
      savedOverflow = document.body.style.overflow
    }
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = savedOverflow
  }
}

function onAfterLeave() {
  lockScroll(false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetState()
      lockScroll(true)
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  }
)

watch(
  () => props.url,
  () => {
    if (props.modelValue) resetState()
  }
)

onBeforeUnmount(() => {
  lockScroll(false)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style lang="scss" scoped>
.image-viewer-mask {
  position: fixed;
  inset: 0;
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.86);
  backdrop-filter: blur(2px);
}

.image-viewer-img {
  max-width: 92vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;

  &.is-loaded {
    opacity: 1;
    transform: scale(1);
  }
}

.image-viewer-loading,
.image-viewer-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;

  .el-icon {
    font-size: 36px;
  }
}

.iv-spinner {
  animation: iv-spin 0.9s linear infinite;
}

@keyframes iv-spin {
  to {
    transform: rotate(360deg);
  }
}

.image-viewer-close {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease;

  .el-icon {
    font-size: 22px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.85);
    transform: translateX(-50%) scale(1.06);
  }

  &:active {
    transform: translateX(-50%) scale(0.96);
  }
}

.iv-fade-enter-active,
.iv-fade-leave-active {
  transition: opacity 0.25s ease;
}

.iv-fade-enter-from,
.iv-fade-leave-to {
  opacity: 0;
}
</style>
