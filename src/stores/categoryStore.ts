import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export interface Category {
  title: string
  query_str: string
  enabled?: boolean
  description: string
  spreadsheetId?: string
  config?: string
  mainData?: string
}

export const useCategoryStore = defineStore('category', () => {
  // State
  const categories = ref<Category[]>([])
  const selectedCategory = ref<Category | null>(null)
  const loading = ref(false)
  const mainData = ref<string>('')
  const selectedIndicators = ref<any>({
    left: null,
    right: null
  })
  const selectedYear = ref<any>({
    left: 1990,
    right: 2010
  })
  // Actions
  const loadCategories = async () => {
    try {
      loading.value = true
      const response = await axios.get('/config/main.json')
      categories.value = response.data.categories
      selectCategoryByQueryStr(window.location.search.replace('?', ''))
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      loading.value = false
    }
  }

  const selectCategoryByQueryStr = (queryStr: string) => {
    const category = categories.value.find(cat => cat.query_str === queryStr)
    if (category) {
      selectedCategory.value = category
      return category
    }
    return null
  }

  const getCategoryByQueryStr = (queryStr: string) => {
    return categories.value.find(cat => cat.query_str === queryStr)
  }

  const getDataFromCSVString = () =>{
    const headers = mainData.value.split('\n')[0].split(',')
    const rows = mainData.value.split('\n').map(r => r.split(',').map(c => isNaN(+c) ? c : +c)).slice(1)
    return { headers, rows }
  }

  const setSelectedYear = (year: number, side: string) => {
    selectedYear.value[side] = year
  }

  const setSelectedIndicators = (indicators: any) => {
    selectedIndicators.value = indicators
  }

  // Getters
  const enabledCategories = () => {
    return categories.value.filter(cat => cat.enabled !== false)
  }

  return {
    // State
    categories,
    selectedCategory,
    loading,
    selectedYear,
    selectedIndicators,
    // Actions
    loadCategories,
    selectCategoryByQueryStr,
    getCategoryByQueryStr,
    mainData,
    getDataFromCSVString,
    setSelectedYear,
    setSelectedIndicators,
    // Getters
    enabledCategories
  }
})
