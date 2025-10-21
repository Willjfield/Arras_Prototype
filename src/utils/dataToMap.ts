import type { IndicatorConfig } from '../types/IndicatorConfig'
export class DataToMap {
    private readonly data: IndicatorConfig;

    constructor(_data: IndicatorConfig) {
        this.data = _data;
    }

    generateGeojson(){}

    setPaintAndLayoutProperties() {}

    removeOldEvents() {}

    addNewEvents() {}

}