<template>
  <div 
    ref="container" 
    class="timeline-visualization"
    :class="{ 'dragging': isDragging }"
  >
    <div class="timeline-header">
      <span class="indicator-title">{{ selectedIndicator?.title || 'Select Indicator' }}</span>
      <button class="close-btn" @click="$emit('close')" v-if="showCloseButton">×</button>
    </div>
    <svg ref="svg" class="timeline-chart"></svg>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from 'd3'
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface Props {
  categoryData: any
  selectedIndicator: any
  selectedYear: number
  side: 'left' | 'right'
  showCloseButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCloseButton: false
})

const emit = defineEmits<{
  yearSelected: [year: number]
  close: []
}>()

const container = ref<HTMLElement>()
const svg = ref<SVGElement>()
const isDragging = ref(false)

let svgElement: d3.Selection<SVGElement, unknown, null, undefined>
let width = 500
let height = 120
let margin = { top: 20, right: 20, bottom: 30, left: 40 }

// Dragging state
let dragStartX = 0
let dragStartY = 0
let initialX = 0
let initialY = 0

const processData = () => {
  console.log(props.categoryData)
  console.log(props.selectedIndicator)
  if (!props.categoryData || !props.selectedIndicator) return []

  const headers = props.categoryData.headers
  const rows = props.categoryData.rows
  
  // Find year columns (numeric strings)
  const yearColumns = headers.filter((header: string) => 
    /^\d{4}$/.test(header) && !isNaN(Number(header))
  ).map((year: string) => Number(year)).sort((a: number, b: number) => a - b)

  // Find the indicator field index
  const indicatorIndex = 1; //Hardcoded into the csv


  // Extract data for this indicator
  const data: Array<{ year: number; value: number | null }> = []
  
  yearColumns.forEach((year: number) => {
    const yearIndex = headers.indexOf(year.toString())
    if (yearIndex !== -1) {
      // Find a row with data for this indicator and year
      const rowWithData = rows.find((row: any[]) => 
        row[indicatorIndex] !== null && 
        row[indicatorIndex] !== undefined && 
        row[indicatorIndex] !== '' &&
        row[yearIndex] !== null && 
        row[yearIndex] !== undefined && 
        row[yearIndex] !== '' &&
        !isNaN(Number(row[yearIndex]))
      )
      
      if (rowWithData) {
        data.push({
          year,
          value: Number(rowWithData[yearIndex])
        })
      } else {
        data.push({
          year,
          value: null
        })
      }
    }
  })
  console.log(data)
  return data
}

const createChart = () => {
  console.log(svg.value)
  if (!svg.value) return

  const data = processData()
  console.log(data)
  if (data.length === 0) return

  // Clear previous chart
  d3.select(svg.value).selectAll('*').remove()

  svgElement = d3.select(svg.value)
    .attr('width', width)
    .attr('height', height)

  // Filter out null values for line chart
  const validData = data.filter(d => d.value !== null)
  
  if (validData.length === 0) {
    // Just show x-axis with years
    createAxisOnly(data)
    return
  }

  // Calculate scales
  const xScale = createXScale(data)
  const yScale = createYScale(validData)

  // Create axes
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d => d.toString())
    .tickSize(0)
    .tickPadding(8)

  const yAxis = d3.axisLeft(yScale)
    .tickSize(-width + margin.left + margin.right)
    .tickPadding(5)

  // Add axes
  svgElement.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '10px')
    .style('fill', '#666')

  svgElement.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis)
    .selectAll('text')
    .style('font-size', '10px')
    .style('fill', '#666')

  // Style grid lines
  svgElement.selectAll('.y-axis .tick line')
    .style('stroke', '#e0e0e0')
    .style('stroke-width', 1)

  // Create line generator
  const line = d3.line<{ year: number; value: number | null }>()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value!))
    .curve(d3.curveMonotoneX)

  // Add line
  svgElement.append('path')
    .datum(validData)
    .attr('class', 'timeline-line')
    .attr('d', line)
    .style('fill', 'none')
    .style('stroke', '#2563eb')
    .style('stroke-width', 2)

  // Add data points
  const circles = svgElement.selectAll('.data-point')
    .data(validData)
    .enter()
    .append('circle')
    .attr('class', 'data-point')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.value!))
    .attr('r', 4)
    .style('fill', '#2563eb')
    .style('stroke', '#fff')
    .style('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (_, d) => {
      emit('yearSelected', d.year)
    })
    .on('mouseover', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', 6)
        .style('fill', '#1d4ed8')
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', 4)
        .style('fill', '#2563eb')
    })

  // Highlight selected year
  circles.filter(d => d.year === props.selectedYear)
    .style('fill', '#dc2626')
    .attr('r', 5)
}

const createAxisOnly = (data: Array<{ year: number; value: number | null }>) => {
  const xScale = createXScale(data)
  
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d => d.toString())
    .tickSize(0)
    .tickPadding(8)

  svgElement.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '10px')
    .style('fill', '#666')

  // Add "No data" text
  svgElement.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#999')
    .text('No data available')
}

const createXScale = (data: Array<{ year: number; value: number | null }>) => {
  const years = data.map(d => d.year)
  
  // Create custom scale with variable spacing
  const yearPositions: number[] = []
  let currentPos = margin.left
  
  for (let i = 0; i < years.length; i++) {
    yearPositions.push(currentPos)
    
    if (i < years.length - 1) {
      const currentYear = years[i]
      const nextYear = years[i + 1]
      const gap = nextYear - currentYear
      
      // Larger spacing for decade gaps, smaller for consecutive years
      const spacing = gap <= 1 ? 25 : gap <= 10 ? 50 : 90
      currentPos += spacing
    }
  }
  
  return d3.scaleOrdinal<number, number>()
    .domain(years)
    .range(yearPositions)
}

const createYScale = (data: Array<{ year: number; value: number | null }>) => {
  const values = data.map(d => d.value!).filter(v => v !== null && !isNaN(v))
  if (values.length === 0) return d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top])
  
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || 1
  
  return d3.scaleLinear()
    .domain([min - padding, max + padding])
    .range([height - margin.bottom, margin.top])
}

// Dragging functionality
const startDrag = (event: MouseEvent) => {
  if (!container.value) return
  
  isDragging.value = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  
  const rect = container.value.getBoundingClientRect()
  initialX = rect.left
  initialY = rect.top
  
  document.addEventListener('mousemove', drag)
  document.addEventListener('mouseup', endDrag)
  event.preventDefault()
}

const drag = (event: MouseEvent) => {
  if (!container.value || !isDragging.value) return
  
  const deltaX = event.clientX - dragStartX
  const deltaY = event.clientY - dragStartY
  
  const newX = initialX + deltaX
  const newY = initialY + deltaY
  
  // Keep within map bounds (basic constraint)
  const mapContainer = container.value.parentElement
  if (mapContainer) {
    const mapRect = mapContainer.getBoundingClientRect()
    const containerRect = container.value.getBoundingClientRect()
    
    const constrainedX = Math.max(0, Math.min(newX - mapRect.left, mapRect.width - containerRect.width))
    const constrainedY = Math.max(0, Math.min(newY - mapRect.top, mapRect.height - containerRect.height))
    
    container.value.style.left = `${constrainedX}px`
    container.value.style.top = `${constrainedY}px`
  }
}

const endDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', drag)
  document.removeEventListener('mouseup', endDrag)
}

// Watch for data changes
watch([() => props.categoryData, () => props.selectedIndicator, () => props.selectedYear], 
  () => {
    nextTick(() => {
      createChart()
    })
  }, 
  { deep: true }
)

onMounted(() => {
  if (container.value) {
    container.value.addEventListener('mousedown', startDrag)
  }
  nextTick(() => {
    createChart()
  })
})

onUnmounted(() => {
  if (container.value) {
    container.value.removeEventListener('mousedown', startDrag)
  }
  document.removeEventListener('mousemove', drag)
  document.removeEventListener('mouseup', endDrag)
})
</script>

<style scoped>
.timeline-visualization {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 350px;
  height: 150px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  cursor: move;
  z-index: 1000;
  user-select: none;
}

.timeline-visualization.dragging {
  cursor: grabbing;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 8px 8px 0 0;
}

.indicator-title {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-wrap: initial;
    line-height: 1em;
    max-width: none;
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.timeline-chart {
  width: 100%;
  height: calc(100% - 40px);
}

/* D3 styles */
:deep(.x-axis .tick text) {
  font-size: 10px;
  fill: #6b7280;
}

:deep(.y-axis .tick text) {
  font-size: 10px;
  fill: #6b7280;
}

:deep(.y-axis .tick line) {
  stroke: #e5e7eb;
  stroke-width: 1;
}

:deep(.timeline-line) {
  fill: none;
  stroke: #2563eb;
  stroke-width: 2;
}

:deep(.data-point) {
  fill: #2563eb;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
}

:deep(.data-point:hover) {
  fill: #1d4ed8;
}
</style>
