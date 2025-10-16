<template>
  <div id="comparison-container">
    <div ref="mapContainerLeft" class="map-container">
      <TimelineVisualization v-if="categoryData && availableIndicators.length > 0" :category-data="categoryData"
        :selected-indicator="categoryStore.selectedIndicators.left" :selected-year="categoryStore.selectedYear.left"
        :available-indicators="availableIndicators" side="left"
        @year-selected="(year: number) => handleYearSelected(year, 'left')"
        @indicator-changed="handleIndicatorChanged" />
      <ColorLegend v-if="categoryData && availableIndicators.length > 0 && categoryStore.selectedIndicators.left.geolevel === 'tract'"
        :selected-indicator="categoryStore.selectedIndicators.left" side="left" />
    </div>
    <div ref="mapContainerRight" class="map-container">
      <TimelineVisualization v-if="categoryData && availableIndicators.length > 0" :category-data="categoryData"
        :selected-indicator="categoryStore.selectedIndicators.right" :selected-year="categoryStore.selectedYear.right"
        :available-indicators="availableIndicators" side="right"
        @year-selected="(year: number) => handleYearSelected(year, 'right')"
        @indicator-changed="handleIndicatorChanged" />
      <ColorLegend v-if="categoryData && availableIndicators.length > 0 && categoryStore.selectedIndicators.right.geolevel === 'tract'"
        :selected-indicator="categoryStore.selectedIndicators.right" side="right" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import maplibregl from 'maplibre-gl'
import { useCategoryStore } from '../stores/categoryStore'
import { useGeoStore } from '../stores/geoStore'
import { onMounted, onUnmounted, ref, watch, toRaw, computed } from 'vue'
import * as mapStyle from '../assets/style.json'
import Compare from '../assets/maplibre-gl-compare.js'
import '../assets/maplibre-gl-compare.css'
import axios from 'axios'
import TimelineVisualization from './TimelineVisualization.vue'
import ColorLegend from './ColorLegend.vue'
import { onBeforeMount } from 'vue'

import {assignChoroplethListeners, removeChoroplethListeners} from '../assets/ChoroplethEvents.js'
import {assignPointListeners, removePointListeners} from '../assets/PointLayerEvents.js'
import { inject } from 'vue'
const emitter = inject('mitt') as any
const categoryStore = useCategoryStore()
const geoStore = useGeoStore()
const categoryData = ref<any>()
const selectedColor = '#2563eb';
const mapContainerLeft = ref<HTMLElement>()
let leftMap: maplibregl.Map | null = null

const mapContainerRight = ref<HTMLElement>()
let rightMap: maplibregl.Map | null = null

const comparisonContainer = '#comparison-container'
//const isProduction = typeof process !== 'undefined' && typeof  process?.env !== 'undefined' && process?.env?.NODE_ENV === 'production';
const baseURL = ''//(isProduction ? 'https://willjfield.github.io/Arras_Prototype/' : '.')
let geojson: any;
onBeforeMount(async () => {
  geojson = (await axios.get(baseURL + '/geo/ChestLanTractsHarmonized.geojson')).data
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
  const geolevel = categoryStore.selectedIndicators[side].geolevel
  const mainLayer = categoryStore.selectedIndicators[side].layers.main
  const _map = side === 'left' ? leftMap : rightMap
  const icons = categoryStore.selectedIndicators[side].icons

      _map.loadImage(icons.main.filename).then((image: any) => {
        if(!_map.hasImage(icons.main.name)) {
          _map.addImage(icons.main.name, image.data);
        }
        
        _map.setLayoutProperty(mainLayer, 'icon-image', icons.main.name);
        _map.setLayoutProperty(mainLayer, 'visibility', 'visible');

      })

  switch (geolevel) {
    case 'tract':
      removePointListeners(_map, side)
      assignChoroplethListeners(_map, side, emitter)
      break
    case 'point':
      removeChoroplethListeners(_map, side)
      assignPointListeners(_map, side, emitter)
      break
  }

}

const availableIndicators = computed(() => {
  if (!categoryStore.selectedCategory?.config) return []

  // This will be populated when the category config is loaded
  // For now, return empty array - it will be updated via the store
  return categoryStore.availableIndicators || []
})

const joinData = async (side: string) => {
  const style = side === 'left' ? leftStyle : rightStyle
  const _map = side === 'left' ? leftMap : rightMap
  const harmonizedLayer = style.layers.find((layer: any) => layer.id === 'tracts-harmonized-fill')
  const harmonizedOutlineLayer = style.layers.find((layer: any) => layer.id === 'tracts-harmonized-outline')
  const qualityChildcareLayer = style.layers.find((layer: any) => layer.id === 'quality-childcare')
  if (categoryStore.selectedIndicators[side].geolevel !== 'tract') {
    harmonizedLayer.layout.visibility = 'none'
    harmonizedOutlineLayer.layout.visibility = 'none'
   if(categoryStore.selectedIndicators[side].geolevel === 'point') {
     qualityChildcareLayer.layout.visibility = 'visible'
   }
   removeChoroplethListeners(_map as any, side)
  } else {
    harmonizedLayer.layout.visibility = 'visible'
    harmonizedOutlineLayer.layout.visibility = 'visible'
    qualityChildcareLayer.layout.visibility = 'none'
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
    style.sources['tracts-harmonized'] = { type: 'geojson' }

    style.sources['tracts-harmonized'].data = geojson;
    const layerFillStyle = categoryStore.selectedIndicators[side].style;
    let _fillColor: any[] = toRaw(categoryStore.selectedIndicators[side].fill_color)

    _fillColor = [..._fillColor, layerFillStyle.min.value, layerFillStyle.min.color, layerFillStyle.max.value, layerFillStyle.max.color]

    //THIS WORKS FOR GRADIENTS BUT NOT ALL EXPRESSIONS!
    _fillColor[2][1][1] = '' + categoryStore.selectedYear[side]

    if (harmonizedLayer) {
      harmonizedLayer.paint['fill-color'] = _fillColor
      harmonizedOutlineLayer.paint['line-color'] = ['case', ['==', ['get', 'geoid'], geoStore.getGeoSelection(side as 'left' | 'right')], ['literal', selectedColor], '#0000']
    } else {
      //TODO: Put these in style.json and just style them here
      harmonizedLayer.paint = {
        'fill-color': _fillColor,
        'fill-opacity': {
          'stops': [
            // zoom is 5 -> circle radius will be 1px
            [10, 1],
            // zoom is 10 -> circle radius will be 2px
            [12, .65]
          ]
        }
      }
      harmonizedOutlineLayer.paint = {
        'line-width': 2,
        'line-color': ['case', ['==', ['get', 'geoid'], geoStore.getGeoSelection(side as 'left' | 'right')], ['literal', '#000f'], '#0000']
      }
    }
    
  }
  _map.setStyle(style)
}

let _compare: Compare | null = null
// Watch for changes in props._type and execute function based on value
watch(() => props._type, (newType: string) => {
  if (_compare) _compare.switchType(newType)
})

watch(() => categoryStore.mainData, (val: any) => {
  categoryData.value = categoryStore.getDataFromCSVString()
  joinData('left')
  joinData('right')
  if(categoryStore.selectedIndicators.left.geolevel === 'tract') {
    removePointListeners(leftMap as any, 'left')
    assignChoroplethListeners(leftMap as any, 'left', emitter)
  } else {
    removeChoroplethListeners(leftMap as any, 'left')
    assignPointListeners(leftMap as any, 'left', emitter)
  }
  if(categoryStore.selectedIndicators.right.geolevel === 'tract') {
    removePointListeners(rightMap as any, 'right')
    assignChoroplethListeners(rightMap as any, 'right', emitter)
  } else {
    removeChoroplethListeners(rightMap as any, 'right')
    assignPointListeners(rightMap as any, 'right', emitter)
  }
})

const setupMap = (container: HTMLElement, style: any, side: 'left' | 'right') => {
  const map = new maplibregl.Map({
    container: container,
    style: style,
    center: props._center,
    zoom: props._zoom,
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
    removeChoroplethListeners(leftMap as any, 'left')
    leftMap.remove()
  }
  if (rightMap) {
    removeChoroplethListeners(rightMap as any, 'right')
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
