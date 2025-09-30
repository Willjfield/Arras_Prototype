<template>
  <div id="comparison-container">
    <div ref="mapContainerLeft" class="map-container"/>
    <div ref="mapContainerRight" class="map-container"/>
  </div>
</template>

<script lang="ts" setup>
  import maplibregl from 'maplibre-gl'

  import { onMounted, onUnmounted, ref, watch } from 'vue'
  import * as mapStyle from '../assets/style.json'
  //import { indicators } from '../assets/indicators.json'
  import Compare from '../assets/maplibre-gl-compare.js'
  import '../assets/maplibre-gl-compare.css'

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

  const leftStyle = JSON.parse(JSON.stringify(mapStyle))
  leftStyle.layers.find(f=>f.id==='tracts-2022-fill').layout.visibility='none'
  // leftStyle.layers = leftStyle.layers.map(l => {
  //   if (choroplethIDs.has(l.id)) {
  //     l.paint['fill-color'] = indicators.find(i => i.field === defaultLeftIndicator)['fill-color']
  //   }
  //   return l
  // })

  const rightStyle = JSON.parse(JSON.stringify(mapStyle))
  // rightStyle.layers = rightStyle.layers.map(l => {
  //   if (choroplethIDs.has(l.id)) {
  //     l.paint['fill-color'] = indicators.find(i => i.field === defaultRightIndicator)['fill-color']
  //   }
  //   return l
  // })

  let _compare: Compare
  // Watch for changes in props._type and execute function based on value
  watch(() => props._type, (newType, oldType) => {
    console.log(`Type changed from ${oldType} to ${newType}`)
    if (_compare) _compare.switchType(newType)
  })

  onMounted(() => {
    console.log('mnt')
    // Ensure the container is properly initialized
    if (mapContainerLeft.value) {
      
      leftMap = new maplibregl.Map({
        container: mapContainerLeft.value, // use ref instead of string id
        style: leftStyle,
        center: props._center,
        zoom: props._zoom,
        
      })

      leftMap.on('mousemove', e => {
        const features = leftMap.queryRenderedFeatures(e.point, { })
        if (features.length === 0) return
        //console.log(features[0]?.properties)
      })
    }

    if (mapContainerRight.value) {
      rightMap = new maplibregl.Map({
        container: mapContainerRight.value, // use ref instead of string id
        style: rightStyle,
        center: props._center,
        zoom: props._zoom,
      })

      rightMap.on('mousemove', e => {
        const features = rightMap.queryRenderedFeatures(e.point, { })
        if (features.length === 0) return
        console.log(features[0]?.properties)
      })
    }

    _compare = new Compare(leftMap, rightMap, comparisonContainer, { type: props._type })
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
