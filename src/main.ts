import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
import vuetify from './plugins/vuetify.js'
import App from './App.vue'
import mitt from 'mitt';
import './style.css';
const emitter = mitt();

const app = createApp(App)
const pinia = createPinia()
app.provide('mitt', emitter)

const historyString = process.env.NODE_ENV === 'production' ? '/Arras_Prototype/' : '';
const router = createRouter({
    history: createWebHistory(historyString),
    routes: [
        {
            path: '/',
            name: 'landing',
            component: () => import('./views/Landing.vue'),
            meta: { title: 'Landing' }
        },
        {
            path: '/Map',
            name: 'map',
            component: () => import('./views/Map.vue'),
            meta: { title: 'Map' }
        }
    ]
})

app.use(pinia).use(vuetify).use(router)

app.mount('#app')
