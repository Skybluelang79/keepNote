export const environment = {
  production: false,
  /**
   * Firebase config for KeepNote sync.
   * Get these values from https://console.firebase.google.com
   * → Project settings → General → Your apps → Web app → SDK setup & config.
   *
   * Until real values are filled in, KeepNote runs in local-only mode (no sync).
   */
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project',
    appId: 'YOUR_APP_ID',
  },
};