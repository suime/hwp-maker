if('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const scope = new URL(registration.scope);
        if (scope.origin === window.location.origin && (scope.pathname === '/' || scope.pathname === '/rhwp-studio/')) {
          registration.unregister();
        }
      }
    });
  });
}
