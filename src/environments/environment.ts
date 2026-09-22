export const environment = {
  production: false,
  /**
   * Firebase config for KeepNote sync.
   * Get these values from https://console.firebase.google.com
   * ‎+ Project settings ‎+ General ‎+ Your apps ‎+ Web app ‎+ SDK setup & config.
   *
   * Until real values are filled in, KeepNote runs in local-only mode (no sync).
   */
  firebase: {
    apiKey: 'AIzaSyCNKxxEGGxB6T2yYHcCau0uzq27ZSR7PbM',
    authDomain: 'keep-note-3fc92.firebaseapp.com',
    projectId: 'keep-note-3fc92',
    appId: '1:509993953789:web:a1fafd8abe91f19d2dd194',
    storageBucket: 'keep-note-3fc92.firebasestorage.app',
    messagingSenderId: '509993953789',
  },
};
