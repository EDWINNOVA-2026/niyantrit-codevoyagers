/* global firebase */
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);
const configParam = params.get("config");
let firebaseConfig = null;

if (configParam) {
  try {
    firebaseConfig = JSON.parse(decodeURIComponent(configParam));
  } catch (error) {
    firebaseConfig = null;
  }
}

if (firebaseConfig) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const title = notification.title || "Niyantrit";
    const options = {
      body: notification.body || "New update available",
      icon: notification.icon || "/favicon.ico",
    };

    self.registration.showNotification(title, options);
  });
}
