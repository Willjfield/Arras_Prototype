<template>
  <div id="comparison-container">
    <div ref="mapContainerLeft" class="map-container">
      <TimelineVisualization
        v-if="categoryData && availableIndicators.length > 0"
        :category-data="categoryData"
        :selected-indicator="categoryStore.selectedIndicators.left"
        :selected-year="categoryStore.selectedYear.left"
        :available-indicators="availableIndicators"
        side="left"
        @year-selected="(year: number) => handleYearSelected(year, 'left')"
        @indicator-changed="handleIndicatorChanged"
      />
    </div>
    <div ref="mapContainerRight" class="map-container">
      <TimelineVisualization
        v-if="categoryData && availableIndicators.length > 0"
        :category-data="categoryData"
        :selected-indicator="categoryStore.selectedIndicators.right"
        :selected-year="categoryStore.selectedYear.right"
        :available-indicators="availableIndicators"
        side="right"
        @year-selected="(year: number) => handleYearSelected(year, 'right')"
        @indicator-changed="handleIndicatorChanged"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import maplibregl from 'maplibre-gl'
  import { useCategoryStore } from '../stores/categoryStore'
  import { onMounted, onUnmounted, ref, watch, toRaw, computed } from 'vue'
  import * as mapStyle from '../assets/style.json'
  import Compare from '../assets/maplibre-gl-compare.js'
  import '../assets/maplibre-gl-compare.css'
  import axios from 'axios'
  import TimelineVisualization from './TimelineVisualization.vue'

  const categoryStore = useCategoryStore()
  //const selectedCategory = ref<any>(categoryStore.selectedCategory)
  const categoryData = ref<any>()

  const mapContainerLeft = ref<HTMLElement>()
  let leftMap: maplibregl.Map | null = null

  const mapContainerRight = ref<HTMLElement>()
  let rightMap: maplibregl.Map | null = null

  const comparisonContainer = '#comparison-container'

  // Define props with default values if needed
  const props = defineProps<{
    _center: [number, number]
    _zoom: number
    _type: string
  }>()

  const leftStyle: any = JSON.parse(JSON.stringify(mapStyle))
  const rightStyle: any = JSON.parse(JSON.stringify(mapStyle))

  const handleYearSelected = (year: number, side: 'left' | 'right') => {
    categoryStore.setSelectedYear(year, side)
    joinData(side)
  }

  const handleIndicatorChanged = (indicator: any, side: 'left' | 'right') => {
    categoryStore.setSelectedIndicators({
      ...categoryStore.selectedIndicators,
      [side]: indicator
    })
    joinData(side)
  }

  const availableIndicators = computed(() => {
    if (!categoryStore.selectedCategory?.config) return []
    
    // This will be populated when the category config is loaded
    // For now, return empty array - it will be updated via the store
    return categoryStore.availableIndicators || []
  })

  const joinData = async (side: string) => {
    const geojson = (await axios.get('/geo/ChestLanTractsHarmonized.geojson')).data
    const style = side === 'left' ? leftStyle : rightStyle
    style.sources['tracts-harmonized'] = { type: 'geojson'}
    
    geojson.features.forEach((f: any) => {
      const row = categoryData.value.rows.find((r: any) => r[0] === +f.properties.geoid)
      if(row && row.length > 0){
        const headers = categoryData.value.headers
        const rowObject = row.reduce((acc: any, curr: any, index: number) => {
          acc[headers[index]] = curr
          return acc
        }, {})
        f.properties = {
              ...f.properties,
            ...rowObject
          }
        }
    })
    
    style.sources['tracts-harmonized'].data = geojson;
    const _fillColor = toRaw(categoryStore.selectedIndicators[side].fill_color)

    _fillColor[2][1][1] = ''+categoryStore.selectedYear[side]//MAKE SURE THIS WORKS WITH OTHER STYLES!

    const harmonizedLayer = style.layers.find((layer: any) => layer.id === 'tracts-harmonized-fill')
    if(harmonizedLayer){
      harmonizedLayer.paint['fill-color'] = _fillColor
    }else{
    style.layers.push({
      id: 'tracts-harmonized-fill',
      type: 'fill',
      source: 'tracts-harmonized',
      layout: {
        visibility: 'visible'
      },
      paint: {
        'fill-color': _fillColor
        }
      })
    }
    console.log('joining data', harmonizedLayer)
    side === 'left' ? leftMap?.setStyle(style) : rightMap?.setStyle(style)
  }

  let _compare: Compare | null = null
  // Watch for changes in props._type and execute function based on value
  watch(() => props._type, (newType: string) => {
    if (_compare) _compare.switchType(newType)
  })

  watch(() => categoryStore.mainData, () => {
    categoryData.value = categoryStore.getDataFromCSVString()
    joinData('left')
    joinData('right')
  })

  onMounted(() => {
    // Ensure the container is properly initialized
    if (mapContainerLeft.value) {
      
      leftMap = new maplibregl.Map({
        container: mapContainerLeft.value, // use ref instead of string id
        style: leftStyle,
        center: props._center,
        zoom: props._zoom,
        
      })

      leftMap.on('mousemove', (e: any) => {
        if (!leftMap) return
        const features = leftMap.queryRenderedFeatures(e.point, { })
        if (features.length === 0) return
      })
    }

    if (mapContainerRight.value) {
      rightMap = new maplibregl.Map({
        container: mapContainerRight.value, // use ref instead of string id
        style: rightStyle,
        center: props._center,
        zoom: props._zoom,
      })

      rightMap.on('mousemove', (e: any) => {
        if (!rightMap) return
        const features = rightMap.queryRenderedFeatures(e.point, { })
        if (features.length === 0) return
      })
    }

    if (leftMap && rightMap) {
      _compare = new Compare(leftMap, rightMap, comparisonContainer, { type: props._type })
    }
  })

  onUnmounted(() => {
    if (leftMap) {
      leftMap.remove()
    }
    if (rightMap) {
      rightMap.remove()
    }
  })
</script>
<style>
.map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  cursor: crosshair !important;
  width: 100%;
  transition: width .3s ease-in-out;
  border-left: 1px solid black;
}

.map-container.collapsed{
  width: calc(100% + 8px);
}

.maplibregl-canvas-container.maplibregl-interactive {
  cursor: crosshair !important;
}

#comparison-container{
  position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
}
</style>
