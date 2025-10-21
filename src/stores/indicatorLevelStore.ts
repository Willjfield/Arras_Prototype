import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import { useThemeLevelStore } from './themeLevelStore'

const themeLevelStore = useThemeLevelStore()

const indicatorLevelStore = (storeName: 'left' | 'right') => {

    const currentThemeIndicators = themeLevelStore.getAllCurrentThemeIndicators()
    const currentIndicator = ref<IndicatorConfig | null>(null)

    // Set the default indicator for the side
    const defaultForSide = currentThemeIndicators?.find((i: IndicatorConfig) => storeName.includes(i.default as string)) || null
    currentIndicator.value = defaultForSide
   
    function setIndicatorFromIndicatorShortName(indicatorShortName: string) {
        const indicator = currentThemeIndicators?.find((i: IndicatorConfig) => i.short_name === indicatorShortName) || null
        if (indicator) {
            currentIndicator.value = indicator
        } else {
            currentIndicator.value = null
        }
    }

    function getCurrentIndicator() : IndicatorConfig | null {
        return currentIndicator.value || null
    }
    
    return { setIndicatorFromIndicatorShortName, getCurrentIndicator }
  }

  // This is where the difference is to make unique stores:
  export const useIndicatorLevelStore = (storeName: 'left' | 'right') => {
    const store = defineStore(`${storeName}-indicator`, () => indicatorLevelStore(storeName))
    return store()
  }
  
  export default useIndicatorLevelStore


