importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// These values are from your firebase-applet-config.json
firebase.initializeApp({
  projectId: "gen-lang-client-0892608340",
  appId: "1:125742770018:web:090acdba5c079228d52e3b",
  apiKey: "AIzaSyCMcW7iSo5-cMcIATzgzBW9lS-IXQiRQCE",
  authDomain: "gen-lang-client-0892608340.firebaseapp.com",
  messagingSenderId: "125742770018",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
