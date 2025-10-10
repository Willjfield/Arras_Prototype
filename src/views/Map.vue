<template>
    <v-main class="d-flex align-center justify-center" style="">
        <v-container>
            <ComparisonMap :_center="[-80.337, 34.7]" :_zoom="8.5" :_type="'sideBySide'"  />
        </v-container>
    </v-main>
</template>
<style>
.full-screen-main {
    display: block;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    /* width: 100%; */
    position: absolute;
}
</style>
<script type="ts" setup>
import ml from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ref, onBeforeMount, inject } from 'vue';
import { useCategoryStore } from '../stores/categoryStore';
const categoryStore = useCategoryStore();
import ComparisonMap from '../components/ComparisonMap.vue';
import axios from 'axios';


onBeforeMount(async () => {
    try {
        await categoryStore.loadCategories();
        if (!categoryStore.selectedCategory) {
            console.error('No category selected');
            return;
        }

        const mainConfig = (await axios.get(inject('baseURL') +'/config/main.json')).data;
        const categoryConfig = (await axios.get(inject('baseURL') + categoryStore.selectedCategory.config)).data;
        
        // Set available indicators
        categoryStore.setAvailableIndicators(categoryConfig.indicators);
        
        categoryStore.setSelectedIndicators({
            left: categoryConfig.indicators[0],
            right: categoryConfig.indicators[1]
        })
        // Use the corrected Google Sheets URL format
        const googleSheetsUrl = categoryConfig.google_sheets_url;
        const data = await axios.get(googleSheetsUrl);
        categoryStore.mainData = data.data;

    } catch (error) {
        console.error('Error loading data:', error);
    }
})

</script>