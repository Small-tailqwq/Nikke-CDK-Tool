import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNavStore = defineStore('nav', () => {
  const isRainbowMode = ref(false)

  const setRainbowMode = (value: boolean) => {
    isRainbowMode.value = value
  }

  return {
    isRainbowMode,
    setRainbowMode
  }
}) 