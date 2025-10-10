<template>
  <div id="comparison-container">
    <div ref="mapContainerLeft" class="map-container">
      <TimelineVisualization v-if="categoryData && availableIndicators.length > 0" :category-data="categoryData"
        :selected-indicator="categoryStore.selectedIndicators.left" :selected-year="categoryStore.selectedYear.left"
        :available-indicators="availableIndicators" side="left"
        @year-selected="(year: number) => handleYearSelected(year, 'left')"
        @indicator-changed="handleIndicatorChanged" />
      <ColorLegend v-if="categoryData && availableIndicators.length > 0"
        :selected-indicator="categoryStore.selectedIndicators.left"
        side="left" />
    </div>
    <div ref="mapContainerRight" class="map-container">
      <TimelineVisualization v-if="categoryData && availableIndicators.length > 0" :category-data="categoryData"
        :selected-indicator="categoryStore.selectedIndicators.right" :selected-year="categoryStore.selectedYear.right"
        :available-indicators="availableIndicators" side="right"
        @year-selected="(year: number) => handleYearSelected(year, 'right')"
        @indicator-changed="handleIndicatorChanged" />
      <ColorLegend v-if="categoryData && availableIndicators.length > 0"
        :selected-indicator="categoryStore.selectedIndicators.right"
        side="right" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import maplibregl from 'maplibre-gl'
import { useCategoryStore } from '../stores/categoryStore'
import { useGeoStore } from '../stores/geoStore'
import { onMounted, onUnmounted, ref, watch, toRaw, computed, inject } from 'vue'
import * as mapStyle from '../assets/style.json'
import Compare from '../assets/maplibre-gl-compare.js'
import '../assets/maplibre-gl-compare.css'
import axios from 'axios'
import TimelineVisualization from './TimelineVisualization.vue'
import ColorLegend from './ColorLegend.vue'
import { onBeforeMount } from 'vue'
//import { useEmitter } from 'mitt'
const emitter = inject('mitt') as any
const categoryStore = useCategoryStore()
const geoStore = useGeoStore()
//const selectedCategory = ref<any>(categoryStore.selectedCategory)
const categoryData = ref<any>()
const selectedColor = '#2563eb';
const selectedColorRef = ref(selectedColor);
const mapContainerLeft = ref<HTMLElement>()
let leftMap: maplibregl.Map | null = null

const mapContainerRight = ref<HTMLElement>()
let rightMap: maplibregl.Map | null = null

const comparisonContainer = '#comparison-container'

let geojson: any;
onBeforeMount(async () => {
  geojson = (await axios.get(inject('baseURL') + '/geo/ChestLanTractsHarmonized.geojson')).data
})
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
  const style = side === 'left' ? leftStyle : rightStyle
  style.sources['tracts-harmonized'] = { type: 'geojson' }

  geojson.features.forEach((f: any) => {
    const row = categoryData.value.rows.find((r: any) => r[0] === +f.properties.geoid)
    if (row && row.length > 0) {
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
  const layerFillStyle = categoryStore.selectedIndicators[side].style;
  let _fillColor: any[] = toRaw(categoryStore.selectedIndicators[side].fill_color)

  _fillColor = [..._fillColor, layerFillStyle.min.value, layerFillStyle.min.color, layerFillStyle.max.value, layerFillStyle.max.color]

  //THIS WORKS FOR GRADIENTS BUT NOT ALL EXPRESSIONS!
  _fillColor[2][1][1] = '' + categoryStore.selectedYear[side]
  
  const harmonizedLayer = style.layers.find((layer: any) => layer.id === 'tracts-harmonized-fill')
  const harmonizedOutlineLayer = style.layers.find((layer: any) => layer.id === 'tracts-harmonized-outline')
  if (harmonizedLayer) {
    harmonizedLayer.paint['fill-color'] = _fillColor
    harmonizedOutlineLayer.paint['line-color'] = ['case', ['==', ['get', 'geoid'], geoStore.getGeoSelection(side as 'left' | 'right')], ['literal', selectedColorRef.value], '#0000']
  } else {
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
    style.layers.push({
      id: 'tracts-harmonized-outline',
      type: 'line',
      source: 'tracts-harmonized',
      layout: {
        visibility: 'visible'
      },
      paint: {
        'line-width': 2,
        'line-color': ['case', ['==', ['get', 'geoid'], geoStore.getGeoSelection(side as 'left' | 'right')], ['literal', '#000f'], '#0000']
      }
    })
  }
  //console.log('joining data', harmonizedLayer)
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

const setupMap = (container: HTMLElement, style: any, side: 'left' | 'right') => {
  const map = new maplibregl.Map({
    container: container,
    style: style,
    center: props._center,
    zoom: props._zoom,
  })

  // Click handler for selecting tracts
  map.on('click', (e: any) => {
    if (!map) return
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['tracts-harmonized-fill']
    })
    if (features.length === 0 || features[0].properties.geoid === geoStore.getGeoSelection(side)){
      geoStore.setGeoSelection('total', side)
      map.setPaintProperty('tracts-harmonized-outline', 'line-color', '#0000')
      emitter.emit(`tract-${side}-hovered`, null)
        return
    }
    
    geoStore.setGeoSelection(features[0].properties.geoid, side)
    map.setPaintProperty('tracts-harmonized-outline', 'line-color', [
      'case', 
      ['==', ['get', 'geoid'], features[0].properties.geoid], 
      ['literal', selectedColorRef.value], 
      '#0000'
    ])
  })

  // Mouse move handler for hover effects
  map.on('mousemove', (e: any) => {
    if (!map) return
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['tracts-harmonized-fill']
    })
    
    if (features.length === 0) {
      // No features under cursor, unhighlight and emit null
      map.setPaintProperty('tracts-harmonized-fill', 'fill-outline-color', '#0000')
      emitter.emit(`tract-${side}-hovered`, null)
      return
    }
    
    // Highlight the hovered feature
    map.setPaintProperty('tracts-harmonized-fill', 'fill-outline-color', [
      'case', 
      ['==', ['get', 'geoid'], features[0].properties.geoid], 
      ['literal', '#000f'], 
      '#0000'
    ])
    
    emitter.emit(`tract-${side}-hovered`, features[0].properties.geoid)
  })

  // Mouse leave handler
  map.on('mouseleave', () => {
    if (!map) return
    // Unhighlight when mouse leaves the map
    map.setPaintProperty('tracts-harmonized-fill', 'fill-outline-color', null)
    emitter.emit(`tract-${side}-hovered`, null)
  })
  document.querySelectorAll('.maplibregl-compact-show').forEach((element: any) => {
    element.classList.remove('maplibregl-compact-show')
  })
  return map
}

onMounted(() => {
  // Setup left map
  if (mapContainerLeft.value) {
    leftMap = setupMap(mapContainerLeft.value, leftStyle, 'left')
  }

  // Setup right map
  if (mapContainerRight.value) {
    rightMap = setupMap(mapContainerRight.value, rightStyle, 'right')
  }

  // Initialize comparison when both maps are ready
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

.map-container.collapsed {
  width: calc(100% + 8px);
}

.maplibregl-canvas-container.maplibregl-interactive {
  cursor: crosshair !important;
}

#comparison-container {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
</style>
