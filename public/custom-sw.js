// Custom Service Worker for Push Notifications
self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push Received.');

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Nuevo Mensaje', body: event.data.text() };
        }
    }

    const title = data.title || 'CRM Lyon Visión';
    const options = {
        body: data.body || 'Tienes un nuevo mensaje',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'new-message',
        data: {
            url: data.url || '/',
            leadId: data.leadId
        },
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // Check if there's already a window open
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If not, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Keep the existing workbox code from next-pwa
// This will be merged with the auto-generated service worker
