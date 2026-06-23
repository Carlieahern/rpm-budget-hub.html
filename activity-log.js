// Shared Firebase activity logger — used by Budget Due Date Tracker and Budget Assumptions.
// Requires firebase-config.js (defines FIREBASE_CONFIG) to be loaded first.
let _fbApp, _fbDb, _fbMod, _fbReady;

function _ensureFirebase() {
  if (_fbReady) return _fbReady;
  _fbReady = (async () => {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    _fbApp = appMod.initializeApp(FIREBASE_CONFIG);
    const auth = authMod.getAuth(_fbApp);
    await authMod.signInAnonymously(auth);
    _fbDb = fsMod.getFirestore(_fbApp);
    _fbMod = fsMod;
  })();
  return _fbReady;
}

// entry: { name, email, role, tool, action, property, description }
async function logToFirebase(entry) {
  try {
    await _ensureFirebase();
    const expireAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60-day retention (Firestore TTL field)
    await _fbMod.addDoc(_fbMod.collection(_fbDb, 'activity_log'), {
      name: entry.name || 'Unknown',
      email: entry.email || '',
      role: entry.role || '',
      tool: entry.tool || '',
      action: entry.action || '',
      property: entry.property || '',
      description: entry.description || entry.action || '',
      timestamp: _fbMod.serverTimestamp(),
      clientTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      expireAt: _fbMod.Timestamp.fromDate(expireAt)
    });
  } catch (e) {
    console.warn('Firebase activity log failed', e);
  }
}
