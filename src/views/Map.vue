<template>
    <v-main class="d-flex align-center justify-center" style="">
        <v-container>
            <ComparisonMap :_center="[-80.537, 34.7963]" :_zoom="9.57" :_type="'sideBySide'" />
        </v-container>
    </v-main>
</template>
<style>
.full-screen-main{
    display: block;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    /* width: 100%; */
    position: absolute;
}
</style>
<script>
import ml from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import educationCsv from '../assets/education.csv?raw';
import { nextTick } from 'vue';
import ComparisonMap from '../components/ComparisonMap.vue';

export default {
    name: 'Map',
    components: {
        ComparisonMap
    },
    data() {
        return {}
    },
    watch: {},
    mounted() { },
    methods: {}
}
</script>