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

// ── HUB QUICK LINKS ─────────────────────────────────────────────────────────
// Stored in Firestore (collection `hub_links`) rather than localStorage so the
// links an admin adds are visible to everyone, not just their own browser.
// Sorted client-side: an orderBy() query would silently drop any document that
// is missing the sort field.
async function hubLinksLoad(){
  await _ensureFirebase();
  const snap = await _fbMod.getDocs(_fbMod.collection(_fbDb, 'hub_links'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function hubLinksAdd(entry){
  await _ensureFirebase();
  const ref = await _fbMod.addDoc(_fbMod.collection(_fbDb, 'hub_links'), {
    label: entry.label || '',
    url: entry.url || '',
    icon: entry.icon || '',
    order: entry.order ?? Date.now(),
    createdBy: entry.createdBy || '',
    createdAt: _fbMod.serverTimestamp()
  });
  return ref.id;
}

async function hubLinksDelete(id){
  await _ensureFirebase();
  await _fbMod.deleteDoc(_fbMod.doc(_fbDb, 'hub_links', id));
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
