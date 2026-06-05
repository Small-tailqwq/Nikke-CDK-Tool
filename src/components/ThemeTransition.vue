<template>
  <Teleport to="body">
    <div v-if="active" class="theme-stripe-overlay" :class="direction">
      <div class="stripe-layer stripe-layer--base">
        <div
          v-for="(d, i) in baseDelays"
          :key="'b' + i"
          class="stripe"
          :style="stripeStyle(i, d)"
        />
      </div>
      <div class="stripe-layer stripe-layer--accent">
        <div
          v-for="(d, i) in accentDelays"
          :key="'a' + i"
          class="stripe"
          :style="stripeStyle(i, d)"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: Boolean,
  direction: String, // 'star-trail' (→dark) or 'sunrise' (→light)
})

const emit = defineEmits(['switch-theme', 'complete'])

const active = ref(false)
let switchTimer = null
let completeTimer = null

// Heights and handcrafted delays extracted from the reference effect
const STRIPE_HEIGHTS = [1, 10, 3, 5, 12, 2, 6, 12, 2, 5, 10, 1, 5, 15, 2, 5, 1, 10, 1, 5, 2]
const baseDelays = [
  0.078, 0.136, 0.068, 0.024, 0.026, 0.162, 0.048, 0.074, 0.1, 0.162, 0.076, 0.04, 0.074, 0.158,
  0.054, 0.184, 0.168, 0.074, 0.118, 0.146, 0.114,
]
const accentDelays = [
  0.156, 0.272, 0.136, 0.048, 0.052, 0.324, 0.096, 0.148, 0.2, 0.324, 0.152, 0.08, 0.148, 0.316,
  0.108, 0.368, 0.336, 0.148, 0.236, 0.292, 0.228,
]

// Base layer reaches full screen expansion around 400ms-500ms based on the 50% keyframe.
// We trigger the actual theme CSS variable swap at 450ms.
const SWITCH_MS = 450

// Total animation duration (0.8s) + maximum delay (0.368s) = 1.168s. We clean up at 1200ms.
const COMPLETE_MS = 1200

function stripeStyle(i, delay) {
  return {
    height: `calc(${STRIPE_HEIGHTS[i]}% + 1px)`,
    animationDelay: `${delay}s`,
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (reducedMotion) {
        emit('switch-theme')
        emit('complete')
        active.value = false
        return
      }

      active.value = true

      switchTimer = setTimeout(() => {
        emit('switch-theme')
      }, SWITCH_MS)

      completeTimer = setTimeout(() => {
        active.value = false
        emit('complete')
      }, COMPLETE_MS)
    }
  }
)

onBeforeUnmount(() => {
  clearTimeout(switchTimer)
  clearTimeout(completeTimer)
})
</script>

<style scoped>
.theme-stripe-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
}

.stripe-layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.stripe {
  width: 100%;
  margin-top: -1px;
  transform: scaleX(0);
  will-change: transform;
  /* Single sweep animation taking exactly 0.8s */
  animation: stripe-sweep 0.8s cubic-bezier(0.785, 0.135, 0.15, 0.86) forwards;
}

/* ── Colors ── */
/* → dark: standard dark base + dark mode primary cyan accent */
.theme-stripe-overlay.star-trail .stripe-layer--base .stripe {
  background: #141414;
}
.theme-stripe-overlay.star-trail .stripe-layer--accent .stripe {
  background: #00d4ff;
}

/* → light: pure white base + light mode primary blue accent */
.theme-stripe-overlay.sunrise .stripe-layer--base .stripe {
  background: #ffffff;
}
.theme-stripe-overlay.sunrise .stripe-layer--accent .stripe {
  background: #409eff;
}

/* ── Single Sweep Animation ── */
@keyframes stripe-sweep {
  0% {
    transform: scaleX(0);
    transform-origin: 0 0;
  }
  50% {
    transform: scaleX(1);
    transform-origin: 0 0;
  }
  51% {
    transform: scaleX(1);
    transform-origin: 100% 0;
  }
  100% {
    transform: scaleX(0);
    transform-origin: 100% 0;
  }
}
</style>
