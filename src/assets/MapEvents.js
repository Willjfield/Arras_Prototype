import { useCategoryStore } from '../stores/categoryStore'
import { useGeoStore } from '../stores/geoStore'
const categoryStore = useCategoryStore()
const geoStore = useGeoStore()
const selectedColor = '#2563eb';

function onChoroplethClick(map, side, e, emitter) {
    console.log('CLICK')
    if (!map) return
    const features = map.queryRenderedFeatures(e.point, {
        layers: [categoryStore.selectedIndicators[side].layers.main]
    })
    if (features.length === 0 || features[0].properties.geoid === geoStore.getGeoSelection(side)) {
        geoStore.setGeoSelection('total', side)
        if (categoryStore.selectedIndicators[side].geolevel === 'tract') {
            map.setPaintProperty(categoryStore.selectedIndicators[side].layers.outline, 'line-color', '#0000')
        }
        emitter.emit(`tract-${side}-hovered`, null)
        return
    }

    geoStore.setGeoSelection(features[0].properties.geoid, side)
    if (categoryStore.selectedIndicators[side].geolevel === 'tract') {
        map.setPaintProperty(categoryStore.selectedIndicators[side].layers.outline, 'line-color', [
            'case',
            ['==', ['get', 'geoid'], features[0].properties.geoid],
            ['literal', selectedColor],
            '#0000'
        ])
    }
}

function onChoroplethMouseMove(map, side, e, emitter) {
    if (!map) return
    const features = map.queryRenderedFeatures(e.point, {
        layers: [categoryStore.selectedIndicators[side].layers.main]
    })
    if (categoryStore.selectedIndicators[side].layers.outline && features.length > 0 && categoryStore.selectedIndicators[side].geolevel === 'tract') {
        map.setPaintProperty(categoryStore.selectedIndicators[side].layers.outline, 'line-color', [
            'case',
            ['==', ['get', 'geoid'], geoStore.getGeoSelection(side)],
            ['literal', selectedColor],
            ['==', ['get', 'geoid'], features[0].properties.geoid],
            ['literal', '#000f'],
            '#0000'
        ])
    }

    if (features.length === 0) {
        // No features under cursor, unhighlight and emit null
        if (categoryStore.selectedIndicators[side].geolevel === 'tract') {
            map.setPaintProperty(categoryStore.selectedIndicators[side].layers.main, 'fill-outline-color', '#0000')
        }
        emitter.emit(`tract-${side}-hovered`, null)
        return
    }

    // Highlight the hovered feature
    if (categoryStore.selectedIndicators[side].geolevel === 'tract') {
        map.setPaintProperty(categoryStore.selectedIndicators[side].layers.main, 'fill-outline-color', [
            'case',
            ['==', ['get', 'geoid'], features[0].properties.geoid],
            ['literal', '#000f'],

            '#0000'
        ])
    }
    emitter.emit(`tract-${side}-hovered`, features[0].properties.geoid)
}

function onChoroplethMouseLeave(map, side, e, emitter) {
    if (!map) return
    // Unhighlight when mouse leaves the map
    map.setPaintProperty(categoryStore.selectedIndicators[side].layers.main, 'fill-outline-color', null)
    if (categoryStore.selectedIndicators[side].layers.outline) {
      map.setPaintProperty(categoryStore.selectedIndicators[side].layers.outline, 'line-color', '#0000')
    }
    emitter.emit(`tract-${side}-hovered`, null)
}

// Store function references for each map instance
const mapListeners = new Map()

function assignChoroplethListeners(map, side, emitter) {
    if (!map) return
    
    // Remove existing listeners first to prevent duplicates
    removeChoroplethListeners(map, side)
    
    // Create function references
    const clickHandler = (e) => onChoroplethClick(map, side, e, emitter)
    const mousemoveHandler = (e) => onChoroplethMouseMove(map, side, e, emitter)
    const mouseleaveHandler = (e) => onChoroplethMouseLeave(map, side, e, emitter)
    
    // Store the handlers
    const mapKey = `${side}-${map._container?.id || 'default'}`
    mapListeners.set(mapKey, {
        click: clickHandler,
        mousemove: mousemoveHandler,
        mouseleave: mouseleaveHandler
    })
    
    // Add the listeners
    map.on('click', clickHandler)
    map.on('mousemove', mousemoveHandler)
    map.on('mouseleave', mouseleaveHandler)
}

function removeChoroplethListeners(map, side) {
    if (!map) return
    
    const mapKey = `${side}-${map._container?.id || 'default'}`
    const listeners = mapListeners.get(mapKey)
    
    if (listeners) {
        map.off('click', listeners.click)
        map.off('mousemove', listeners.mousemove)
        map.off('mouseleave', listeners.mouseleave)
        mapListeners.delete(mapKey)
    }
}

export {assignChoroplethListeners, removeChoroplethListeners}