<template>

    <v-main>
      <v-container fluid>
        <v-row>
          <v-col>
            <v-card>
              <v-carousel cycle show-arrows="hover">
                <v-carousel-item src="slideshow/S1.jpg" cover></v-carousel-item>
                <v-carousel-item src="slideshow/S2.jpg" cover></v-carousel-item>
                <v-carousel-item src="slideshow/S4.jpg" cover></v-carousel-item>

              </v-carousel>
            </v-card>
          </v-col>
          <v-col>
            <v-sheet class="d-flex align-content-start flex-wrap" min-height="3em">
              <v-btn :to="`/map?${cat.query_str}`" v-for="cat in categoryStore.categories" :disabled="!cat.enabled" stacked size="small" class="ma-2" width="45%" :key="cat.title"
                :text="cat.title" @click="handleCategoryClick(cat.query_str)">
                {{ cat.title }}
              </v-btn>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
 
</template>
<script lang="ts" setup>
import 'maplibre-gl/dist/maplibre-gl.css';
import { onBeforeMount } from 'vue';
import { useCategoryStore } from '../stores/categoryStore';

const categoryStore = useCategoryStore();

const handleCategoryClick = (queryStr: string) => {
  categoryStore.selectCategoryByQueryStr(queryStr);
};

onBeforeMount(async () => {
    await categoryStore.loadCategories();
});

</script>