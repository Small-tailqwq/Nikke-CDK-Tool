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

const STRIPE_HEIGHTS = [7, 13, 5, 11, 8, 6, 14, 9, 5, 12, 4, 6]
const baseDelays = [0.02, 0.05, 0, 0.04, 0.01, 0.06, 0.03, 0.02, 0.05, 0.01, 0.04, 0]
const accentDelays = baseDelays.map((delay) => delay + 0.03)

// All rows are opaque from 306ms to 468ms; swap inside that shared plateau.
const SWITCH_MS = 340
const COMPLETE_MS = 820

function stripeStyle(i, delay) {
  return {
    height: `calc(${STRIPE_HEIGHTS[i]}% + 1px)`,
    animationDelay: `${delay}s`,
  }
}

watch(
  () => props.visible,
  (val) => {
    clearTimeout(switchTimer)
    clearTimeout(completeTimer)
    active.value = false
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
  },
  { immediate: true }
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
  animation: stripe-sweep 0.72s cubic-bezier(0.785, 0.135, 0.15, 0.86) forwards;
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
  30%,
  64% {
    transform: scaleX(1);
    transform-origin: 0 0;
  }
  65% {
    transform: scaleX(1);
    transform-origin: 100% 0;
  }
  100% {
    transform: scaleX(0);
    transform-origin: 100% 0;
  }
}
</style>
