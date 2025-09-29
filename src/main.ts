import { createApp, nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router';
import vuetify from './plugins/vuetify.js'
import App from './App.vue'
import mitt from 'mitt';
import './style.css';
const emitter = mitt();

const app = createApp(App)
app.provide('mitt', emitter)

const router = createRouter({
    history: createWebHistory(),
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

app.use(vuetify).use(router)

app.mount('#app')
