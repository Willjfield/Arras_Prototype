import { useCategoryStore } from '../stores/categoryStore'
import { useGeoStore } from '../stores/geoStore'
import maplibregl from 'maplibre-gl'
import axios from 'axios'
const categoryStore = useCategoryStore()
const geoStore = useGeoStore()
const selectedColor = '#2563eb';
let popup: maplibregl.Popup | null = null

function onChildcareIndicatorSelected(data: any) {
    const rows = data.rows
    const headers = data.headers
    const latIndex = headers.indexOf('Lat')
    const lngIndex = headers.indexOf('Lng')

    return ({
        type: 'FeatureCollection',
        features: rows.map((row: Array<any>, idx: number) => {
            const properties: any = {}
            headers.forEach((header: string, _idx: number) => properties[header.replaceAll(' ','_')] = row[_idx])
            properties.geoid = +row[0]
            return {
                type: 'Feature',
                id: idx,
                geometry: {
                    type: 'Point',
                    coordinates: [+row[lngIndex], +row[latIndex]]
                },
                properties
            }
        })
    })
}
function onPointClick(map: maplibregl.Map, side: 'left' | 'right', e: maplibregl.MapMouseEvent, emitter: EventEmitter) {

    if (!map) return
    const features = map.queryRenderedFeatures(e.point, {
        layers: [categoryStore.selectedIndicators[side].layers.main]
    })

    if (features.length === 0 || features[0].properties.geoid === geoStore.getGeoSelection(side)) {
        geoStore.setGeoSelection('total', side)
        map.setLayoutProperty(categoryStore.selectedIndicators[side].layers.main, 'icon-size', 1)
        map.setPaintProperty(categoryStore.selectedIndicators[side].layers.main, 'icon-color', '#888')

        emitter.emit(`tract-${side}-hovered`, null)
        return
    }

    geoStore.setGeoSelection(features[0].properties.geoid, side)
}

function onPointmousemove(map: maplibregl.Map, side: 'left' | 'right', e: maplibregl.MapMouseEvent, emitter: EventEmitter) {

    if (!map) return
    const features = map.queryRenderedFeatures(e.point, {
        layers: [categoryStore.selectedIndicators[side].layers.main]
    })
    if (popup) { popup.remove(); }
    if (features.length === 0) {
        // No features under cursor, unhighlight and emit null
        // map.setPaintProperty(categoryStore.selectedIndicators[side].layers.main, 'fill-outline-color', '#0000')
        map.setLayoutProperty(categoryStore.selectedIndicators[side].layers.main, 'icon-size', 0.75)
        map.setPaintProperty(categoryStore.selectedIndicators[side].layers.main, 'icon-color', '#888')

        emitter.emit(`tract-${side}-hovered`, null)
        return
    }

    // Create a popup, but don't add it to the map yet.
    popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false
    });
    let dateField = features[0].properties.Last_ABC_Inspection_Date;
    if (dateField) {
        dateField = new Date(dateField).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    popup.setLngLat(features[0].geometry.coordinates).setHTML(
        `<div class="popup-content">
        <div class="blur-background"></div>
        <h3>${features[0].properties.Provider_Name} </h3>
        <p>Operator: ${features[0].properties.Operator}<br/>
        Provider: ${features[0].properties.Provider_Name}<br/>
        ${features[0].properties.Street_Address}<br/>
        ${features[0].properties.City}, ${features[0].properties.State} ${features[0].properties.Zip_Code}<br>
        ${features[0].properties.Phone_Number}
        </p>
        <table>
            <tr>
                <td>Capacity</td>
                <td>${features[0].properties.Capacity}</td>
            </tr>
            <tr style="display: ${features[0].properties.ABC_Level ? 'table-row' : 'none'}">
                <td>ABC Level</td>
                <td>${features[0].properties.ABC_Level}<br/>(Last Inspection:<br/>${dateField})</td>
            </tr>
            <tr style="display: ${features[0].properties.Breastfeeding_Friendly ? 'table-row' : 'none'}">
                <td>Breastfeeding Friendly</td>
                <td>${features[0].properties.Breastfeeding_Friendly === 'FALSE' ? 'No' : 'Yes'}</td>
            </tr>
            <tr style="display: ${features[0].properties.Early_Head_Start ? 'table-row' : 'none'}">
                <td>Early Head Start</td>
                <td>${features[0].properties.Head_Start === 'FALSE' ? 'No' : 'Yes'}</td>
            </tr>
            <tr style="display: ${features[0].properties.Head_Start ? 'table-row' : 'none'}">
                <td>Head Start</td>
                <td>${features[0].properties.Head_Start === 'FALSE' ? 'No' : 'Yes'}</td>
            </tr>
            <tr style="display: ${features[0].properties.First_Steps ? 'table-row' : 'none'}">
                <td>First Steps</td>
                <td>${features[0].properties.First_Steps === 'FALSE' ? 'No' : 'Yes'}</td>
            </tr>
            </table>
        </div>`).addTo(map);

    // Highlight the hovered feature
    const numGeoSelection = geoStore.getGeoSelection(side) === 'total' ? -1 : parseInt(geoStore.getGeoSelection(side))
        //log(categoryStore.selectedIndicators[side])
    map.setLayoutProperty(categoryStore.selectedIndicators[side].layers.main, 'icon-size', [
        'case',
        ['==', ['to-number', ['get', 'geoid']], ['to-number', features[0].properties.geoid]],
        1,
        // ['==', ['to-number', ['get', 'geoid']], numGeoSelection],
        // 1,
        0.75
    ])
    map.setPaintProperty(categoryStore.selectedIndicators[side].layers.main, 'icon-color', [
        'case',
        ['==', ['to-number', ['get', 'geoid']], ['to-number', features[0].properties.geoid]],
        ['literal', selectedColor],
        // ['==', ['to-number', ['get', 'geoid']], numGeoSelection],
        // ['literal', selectedColor],
        ['literal', '#888']
    ])
    //emitter.emit(`tract-${side}-hovered`, +features[0].properties.geoid)
}

function onPointMouseLeave(map, side, e, emitter) {
    if (!map) return
}

// Store function references for each map instance
const mapListeners = new Map()

function assignChildcareListeners(map, side, emitter) {
    if (!map) return

    // Remove existing listeners first to prevent duplicates
    removeChildcareListeners(map, side)

    // Create function references
    const clickHandler = (e) => onPointClick(map, side, e, emitter)
    const mousemoveHandler = (e) => onPointmousemove(map, side, e, emitter)
    const mouseleaveHandler = (e) => onPointMouseLeave(map, side, e, emitter)

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

function removeChildcareListeners(map, side) {
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

export { assignChildcareListeners, removeChildcareListeners, onChildcareIndicatorSelected }