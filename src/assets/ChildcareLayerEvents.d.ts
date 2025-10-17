import { Map } from 'maplibre-gl';

/**
 * Event emitter interface for map events
 */
interface EventEmitter {
  emit(event: string, data: any): void;
}

/**
 * Assigns point layer event listeners to a map instance
 * @param map - The MapLibre GL map instance
 * @param side - The side identifier ('left' or 'right')
 * @param emitter - Event emitter for communicating with other components
 */
export function assignChildcareListeners(
  map: Map,
  side: 'left' | 'right' | string,
  emitter: EventEmitter
): void;

/**
 * Removes point layer event listeners from a map instance
 * @param map - The MapLibre GL map instance
 * @param side - The side identifier ('left' or 'right')
 */
export function removeChildcareListeners(
  map: Map,
  side: 'left' | 'right' | string
): void;
