// Base path per GitHub Pages
const base = "/albo-d-oro-fantamattone/";
const baseUrl = new URL(base, self.location.origin);

self.importScripts('./service-worker-assets.js');
self.addEventListener('install', event => event.waitUntil(onInstall(event)));
self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

const cacheNamePrefix = 'offline-cache-';
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
const offlineAssetsInclude = [ /\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/ ];
const offlineAssetsExclude = [ /^service-worker\.js$/ ];
const manifestUrlList = self.assetsManifest.assets.map(asset => new URL(asset.url, baseUrl).href);

async function onInstall(event) {
    console.info('Service worker: Install');

    const cache = await caches.open(cacheName);
    
    // Gestisci gli errori durante il caching - se una risorsa fallisce, continua con le altre
    const cachePromises = self.assetsManifest.assets
        .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
        .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
        .map(async asset => {
            try {
                const assetUrl = new URL(asset.url, baseUrl).href;
                const request = new Request(assetUrl, { cache: 'no-cache' });
                await cache.add(request);
            } catch (err) {
                console.warn('Failed to cache:', asset.url, err);
                // Se fallisce con cache.add, prova con fetch e poi put
                try {
                    const assetUrl = new URL(asset.url, baseUrl).href;
                    const response = await fetch(assetUrl, { cache: 'no-cache' });
                    if (response.ok) {
                        await cache.put(assetUrl, response);
                    }
                } catch (fetchErr) {
                    console.warn('Failed to cache with fetch:', asset.url, fetchErr);
                }
            }
        });
    
    await Promise.allSettled(cachePromises);
}

async function onActivate(event) {
    console.info('Service worker: Activate');

    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key => caches.delete(key)));
}

async function onFetch(event) {
    let cachedResponse = null;
    if (event.request.method === 'GET') {
        const shouldServeIndexHtml = event.request.mode === 'navigate'
            && !manifestUrlList.some(url => url === event.request.url);

        const request = shouldServeIndexHtml ? new Request(new URL('index.html', baseUrl).href) : event.request;
        const cache = await caches.open(cacheName);
        cachedResponse = await cache.match(request);
    }

    return cachedResponse || fetch(event.request);
}
