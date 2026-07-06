<template>
  <Teleport to="body">
    <Transition name="iv-fade" @after-leave="onAfterLeave">
      <div
        v-if="modelValue"
        class="image-viewer-mask"
        @click.self="close"
      >
        <div
          v-if="!failed"
          class="image-viewer-scene"
          @click.stop
        >
          <div
            class="image-viewer-card"
            :class="{ 'is-loaded': loaded, 'is-dragging': dragging }"
            :style="cardStyle"
            role="img"
            tabindex="0"
            :aria-label="viewerAriaLabel"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerEnd"
            @pointercancel="onPointerEnd"
            @lostpointercapture="onPointerEnd"
            @keydown="onCardKeydown"
          >
            <div class="image-viewer-card-face image-viewer-card-front">
              <img
                :key="url"
                :src="url"
                :alt="imageAlt"
                class="image-viewer-img"
                draggable="false"
                @load="onLoad"
                @error="onError"
                @dragstart.prevent
              />
              <div class="image-viewer-edge-shade"></div>
            </div>
            <div class="image-viewer-card-face image-viewer-card-back" aria-hidden="true">
              <div class="postcard-lines"></div>
              <div class="postcard-stamp"></div>
              <div class="postcard-title">{{ backTitle }}</div>
              <div class="postcard-date">{{ backDate }}</div>
              <div class="image-viewer-edge-shade"></div>
            </div>
          </div>
        </div>
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
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { Close, Loading, Picture } from '@element-plus/icons-vue'

interface Props {
  modelValue: boolean
  url: string
  alt?: string
  title?: string
  collectedAt?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  title: '',
  collectedAt: '',
})
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const loaded = ref(false)
const failed = ref(false)
const loading = ref(false)
const dragging = ref(false)
const rotationY = ref(0)
let savedOverflow = ''
let dragStartX = 0
let dragStartRotation = 0
let pendingClientX = 0
let dragFrame = 0

const backTitle = computed(() => props.title || props.alt || '图片')
const backDate = computed(() => props.collectedAt || '收录时间未知')
const imageAlt = computed(() => props.alt || props.title || '图片')
const viewerAriaLabel = computed(
  () => `${backTitle.value}，${backDate.value}。可拖拽水平旋转，按左右方向键旋转图片，按 Home 键回到正面。`
)

const cardStyle = computed(() => {
  const normalized = ((rotationY.value % 180) + 180) % 180
  const distanceFromEdge = Math.abs(normalized - 90)
  const edgeFactor = Math.max(0, 1 - distanceFromEdge / 38)

  return {
    transform: `rotateY(${rotationY.value}deg)`,
    '--edge-blur': `${(edgeFactor * 3.2).toFixed(2)}px`,
    '--edge-brightness': (1 - edgeFactor * 0.32).toFixed(2),
    '--edge-shade-opacity': (edgeFactor * 0.62).toFixed(2),
    '--edge-highlight-opacity': (edgeFactor * 0.48).toFixed(2),
    '--edge-shadow-opacity': (0.6 + edgeFactor * 0.28).toFixed(2),
  }
})

function resetState() {
  cancelPendingDragFrame()
  loaded.value = false
  failed.value = false
  loading.value = !!props.url
  dragging.value = false
  rotationY.value = 0
}

function close() {
  cancelPendingDragFrame()
  dragging.value = false
  emit('update:modelValue', false)
}

function cancelPendingDragFrame() {
  if (!dragFrame) return
  cancelAnimationFrame(dragFrame)
  dragFrame = 0
}

function updateRotationFromClientX(clientX: number) {
  rotationY.value = dragStartRotation + (clientX - dragStartX) * 0.55
}

function onLoad() {
  loaded.value = true
  loading.value = false
}

function onError() {
  failed.value = true
  loading.value = false
}

function onPointerDown(e: PointerEvent) {
  if (!loaded.value || failed.value) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  dragging.value = true
  dragStartX = e.clientX
  pendingClientX = e.clientX
  dragStartRotation = rotationY.value
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  pendingClientX = e.clientX
  if (dragFrame) return
  dragFrame = requestAnimationFrame(() => {
    updateRotationFromClientX(pendingClientX)
    dragFrame = 0
  })
}

function onPointerEnd(e: PointerEvent) {
  if (!dragging.value) return
  pendingClientX = e.clientX
  cancelPendingDragFrame()
  updateRotationFromClientX(pendingClientX)
  dragging.value = false
  const target = e.currentTarget as HTMLElement
  if (target.hasPointerCapture?.(e.pointerId)) {
    target.releasePointerCapture(e.pointerId)
  }
}

function onCardKeydown(e: KeyboardEvent) {
  if (!loaded.value || failed.value) return

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    rotationY.value -= 15
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    rotationY.value += 15
  } else if (e.key === 'Home') {
    e.preventDefault()
    rotationY.value = 0
  }
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
  cancelPendingDragFrame()
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

.image-viewer-scene {
  max-width: 92vw;
  max-height: 85vh;
  perspective: 1400px;
}

.image-viewer-card {
  --edge-blur: 0px;
  --edge-brightness: 1;
  --edge-shade-opacity: 0;
  --edge-highlight-opacity: 0;
  --edge-shadow-opacity: 0.6;

  position: relative;
  display: inline-block;
  transform-style: preserve-3d;
  cursor: grab;
  touch-action: none;
  user-select: none;
  opacity: 0;
  transition: opacity 0.25s ease;
  will-change: transform;

  &.is-loaded {
    opacity: 1;
  }

  &.is-dragging {
    cursor: grabbing;
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.86);
    outline-offset: 8px;
  }
}

.image-viewer-card-face {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, var(--edge-shadow-opacity));
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  filter: blur(var(--edge-blur)) brightness(var(--edge-brightness));
  transform: translateZ(0);
}

.image-viewer-card-front {
  position: relative;
}

.image-viewer-card-back {
  position: absolute;
  inset: 0;
  transform: rotateY(180deg);
  background:
    linear-gradient(90deg, transparent 49.6%, rgba(116, 82, 48, 0.24) 49.8%, rgba(116, 82, 48, 0.24) 50.2%, transparent 50.4%),
    radial-gradient(circle at 16% 18%, rgba(120, 84, 48, 0.12) 0 1px, transparent 1.5px),
    radial-gradient(circle at 84% 78%, rgba(120, 84, 48, 0.10) 0 1px, transparent 1.5px),
    linear-gradient(135deg, #f3e1bd 0%, #dec293 52%, #c9a878 100%);
  color: rgba(58, 42, 25, 0.78);
  font-family: var(--cdk-font-mono, ui-monospace, SFMono-Regular, Consolas, monospace);

  &::before {
    content: '';
    position: absolute;
    inset: 12px;
    border: 1px solid rgba(89, 63, 36, 0.2);
    border-radius: 7px;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      -12deg,
      rgba(255, 255, 255, 0.06) 0 8px,
      transparent 8px 18px
    );
    pointer-events: none;
    mix-blend-mode: soft-light;
  }
}

.image-viewer-edge-shade {
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: none;
  opacity: var(--edge-shade-opacity);
  background:
    linear-gradient(90deg, rgba(255, 255, 255, var(--edge-highlight-opacity)) 0%, transparent 18%, transparent 78%, rgba(0, 0, 0, 0.55) 100%),
    radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.52) 100%);
}

.postcard-lines {
  position: absolute;
  top: 28%;
  right: 8%;
  width: 34%;
  height: 36%;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0 20px,
    rgba(94, 66, 38, 0.22) 20px 21px,
    transparent 21px 30px
  );
}

.postcard-stamp {
  position: absolute;
  top: 8%;
  right: 8%;
  width: clamp(44px, 12%, 74px);
  aspect-ratio: 1;
  border: 1px dashed rgba(94, 66, 38, 0.38);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.12);

  &::after {
    content: 'NIKKE';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(8px, 1.6vw, 12px);
    letter-spacing: 1px;
    color: rgba(94, 66, 38, 0.42);
    transform: rotate(-8deg);
  }
}

.postcard-title,
.postcard-date {
  position: absolute;
  max-width: 42%;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(255, 248, 224, 0.16);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.22);
  word-break: break-word;
}

.postcard-title {
  top: 8%;
  left: 8%;
  font-size: clamp(13px, 2vw, 22px);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.postcard-date {
  right: 8%;
  bottom: 8%;
  text-align: right;
  font-size: clamp(11px, 1.4vw, 16px);
  font-weight: 600;
}

.image-viewer-img {
  display: block;
  max-width: 92vw;
  max-height: 85vh;
  object-fit: contain;
  pointer-events: none;
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
