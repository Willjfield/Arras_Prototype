import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";

export class PointStaticTimeToMap extends DataToMap {
    constructor(data: IndicatorConfig) {
        super(data);
    }
}