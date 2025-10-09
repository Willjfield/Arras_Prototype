import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGeoStore = defineStore('geo', () => {
  const geoSelection = ref<any>({
    left: 'total',
    right: 'total'
  })

  const setGeoSelection = (geo: any, side: 'left' | 'right') => {
    geoSelection.value[side] = geo
  }
  const resetGeoSelection = () => {
    geoSelection.value = {
      left: 'total',
      right: 'total'
    }
  }
  const getGeoSelection = (side: 'left' | 'right') => {
    return geoSelection.value[side]
  }

  return {
    geoSelection,
    setGeoSelection,
    getGeoSelection,
    resetGeoSelection
  }
})