<template>
  <div class="custom-checkbox-wrapper" :class="{ disabled: disabled }">
    <el-checkbox
      :model-value="modelValue"
      :disabled="disabled"
      :show-label="false"
      class="custom-checkbox"
      @click.stop=""
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import type { CheckboxValueType } from 'element-plus'

interface Props {
  modelValue: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: CheckboxValueType): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<Emits>()

const handleChange = (value: CheckboxValueType) => {
  const boolValue = !!value
  emit('update:modelValue', boolValue)
  emit('change', value)
}
</script>

<style lang="scss" scoped>
.custom-checkbox-wrapper {
  --color-checkbox-border-light: rgba(0, 0, 0, 0.2);
  --color-checkbox-border-dark: rgba(255, 255, 255, 0.3);
  --checkbox-bg: radial-gradient(circle, rgba(0, 0, 0, 0.15) 0%, transparent 70%);
  --checkbox-size: 1.5em; /* 24px 转换为相对单位 */

  position: absolute;
  top: 0.5em;
  left: 0.5em;
  z-index: 20;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: 0.375em; /* 6px */
  background: var(--el-bg-color);
  border: 2px solid var(--color-checkbox-border-light);
  box-sizing: border-box;
  box-shadow: 0 0.0625em 0.1875em rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform: translateZ(0); /* 硬件加速 */

  /* 背景处理策略：提高在动态背景上的可见性 */
  &::after {
    content: '';
    position: absolute;
    width: 120%;
    height: 120%;
    background: var(--checkbox-bg);
    border-radius: inherit;
    z-index: -1;
    transition: opacity 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  /* 悬停效果 */
  &:hover:not(.disabled) {
    box-shadow: 0 0.1875em 0.5em rgba(0, 0, 0, 0.2);
    transform: scale(1.05) translateZ(0);
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);

    &::after {
      --checkbox-bg: radial-gradient(circle, rgba(0, 0, 0, 0.25) 0%, transparent 70%);
    }
  }

  /* 禁用状态 */
  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    
    &::after {
      --checkbox-bg: radial-gradient(circle, rgba(0, 0, 0, 0.08) 0%, transparent 70%);
    }
  }

  /* 暗色模式适配 */
  @media (prefers-color-scheme: dark) {
    border-color: var(--color-checkbox-border-dark);
    --checkbox-bg: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);

    &:hover:not(.disabled)::after {
      --checkbox-bg: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, transparent 70%);
    }

    &.disabled::after {
      --checkbox-bg: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
    }
  }

  /* Element Plus 暗色模式 */
  html.dark & {
    border-color: var(--color-checkbox-border-dark);
    --checkbox-bg: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);

    &:hover:not(.disabled)::after {
      --checkbox-bg: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, transparent 70%);
    }

    &.disabled::after {
      --checkbox-bg: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
    }
  }
}

.custom-checkbox {
  --inner-size: 0.875em; /* 14px 转换为相对单位 */

  pointer-events: auto;
  margin: 0;
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: inherit;
  transition: all 0.2s ease;

  /* 选中状态样式 */
  &.is-checked {
    &::after {
      content: '✓';
      position: absolute;
      top: 1px;
      left: 1px;
      right: 1px;
      bottom: 1px;
      background: var(--el-color-primary);
      border-radius: calc(0.375em - 1px);
      border: none;
      z-index: 2;
      transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      will-change: transform;

      /* 对勾符号样式 */
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75em; /* 12px */
      font-weight: bold;
      line-height: 1;

      /* 初始状态：从中心点开始缩放 */
      transform: scale(0) translateZ(0);
      transform-origin: center;
    }
  }

  /* 选中状态的缩放动画 */
  &.is-checked::after {
    transform: scale(1) translateZ(0);
  }

  /* 悬停状态增强 */
  &:hover.is-checked::after {
    background: var(--el-color-primary-light-3);
    transform: scale(1.05) translateZ(0);
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  /* 激活状态增强 */
  &:active.is-checked::after {
    background: var(--el-color-primary-dark-2);
    transform: scale(0.95) translateZ(0);
    transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  /* 聚焦状态 */
  &.is-focus.is-checked::after {
    box-shadow: 0 0 0 0.125em var(--el-color-primary-light-5);
  }

  /* 禁用状态 */
  &.is-disabled.is-checked {
    opacity: 0.6;

    &::after {
      background: var(--el-color-primary);
      transform: scale(1) translateZ(0);
    }
  }

  /* 未选中状态的过渡准备 */
  &:not(.is-checked)::after {
    content: '';
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    bottom: 1px;
    background: transparent;
    border-radius: calc(0.375em - 1px);
    border: none;
    z-index: 2;
    transform: scale(0) translateZ(0);
    transform-origin: center;
    transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    will-change: transform;
  }

  /* 未选中状态的交互效果保持透明 */
  &:not(.is-checked):hover::after,
  &:not(.is-checked):active::after {
    background: transparent !important;
  }

  /* 隐藏Element Plus原生样式 */
  :deep(.el-checkbox__input) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    position: relative;
    z-index: 1;
    background: transparent !important;

    .el-checkbox__inner {
      width: 0 !important;
      height: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      opacity: 0 !important;
      visibility: hidden !important;

      &::after {
        content: none !important;
        display: none !important;
      }
    }

    /* 所有状态下都隐藏内部小框 */
    &.is-checked .el-checkbox__inner,
    &.is-disabled .el-checkbox__inner,
    &.is-focus .el-checkbox__inner,
    &:hover .el-checkbox__inner {
      width: 0 !important;
      height: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }

    /* 确保所有状态下input元素背景都透明 */
    &.is-checked,
    &.is-disabled,
    &.is-focus,
    &:hover {
      background: transparent !important;
    }
  }

  /* 移除标签 */
  :deep(.el-checkbox__label) {
    display: none;
  }
}
</style>