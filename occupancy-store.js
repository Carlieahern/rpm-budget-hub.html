// Occupancy submission store — Firestore-backed, used by the Budget Approval app.
// Reuses the shared Hub Firebase project (FIREBASE_CONFIG from firebase-config.js).
// Writes to its OWN collection `occupancy_submissions` — completely separate from
// the Hub activity logger (`activity_log`). Does not touch activity tracking.
//
// Doc ID = `<propertyCode>_<budgetYear>` so each property/year is unique and a
// duplicate check is a direct lookup. Occupancy values are stored exactly as the
// user enters them (whole-number percentages, e.g. 95 or 95.2) — the SharePoint
// flow is what divides by 100.
//
// Retention: each doc carries an `expireAt` timestamp = March 1 of (budgetYear + 1),
// i.e. the remainder of the budget year plus 2 months. A Firestore TTL policy on the
// `expireAt` field auto-deletes after that date. (Enable the TTL policy once in the
// Firebase console: Firestore > collection occupancy_submissions > TTL field expireAt.)

let _occApp, _occDb, _occMod, _occReady;

function _ensureOccFirebase() {
  if (_occReady) return _occReady;
  _occReady = (async () => {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    _occApp = appMod.getApps && appMod.getApps().length
      ? appMod.getApp()
      : appMod.initializeApp(FIREBASE_CONFIG);
    const auth = authMod.getAuth(_occApp);
    if (!auth.currentUser) await authMod.signInAnonymously(auth);
    _occDb = fsMod.getFirestore(_occApp);
    _occMod = fsMod;
  })();
  return _occReady;
}

function _occDocId(code, year) {
  return `${String(code).trim()}_${String(year).trim()}`;
}

// Returns the existing submission for this property/year, or null if none.
// Shape: { propertyCode, budgetYear, pms, occupancy:{jan..dec}, submitterName,
//          submitterEmail, clientTime }
async function getOccupancySubmission(code, year) {
  await _ensureOccFirebase();
  const ref = _occMod.doc(_occDb, 'occupancy_submissions', _occDocId(code, year));
  const snap = await _occMod.getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Saves (or fully replaces) the submission for this property/year.
// entry: { pms, propertyCode, budgetYear, occupancy:{jan..dec}, submitterName, submitterEmail }
async function saveOccupancySubmission(entry) {
  await _ensureOccFirebase();
  const year = Number(entry.budgetYear);
  // Remainder of the budget year + 2 months → March 1 of the next year.
  const expireAt = new Date(year + 1, 2, 1);
  const ref = _occMod.doc(_occDb, 'occupancy_submissions', _occDocId(entry.propertyCode, year));
  await _occMod.setDoc(ref, {
    propertyCode: String(entry.propertyCode).trim(),
    budgetYear: year,
    pms: entry.pms || '',
    occupancy: entry.occupancy || {},
    submitterName: entry.submitterName || '',
    submitterEmail: entry.submitterEmail || '',
    submittedAt: _occMod.serverTimestamp(),
    clientTime: new Date().toISOString(),
    expireAt: _occMod.Timestamp.fromDate(expireAt)
  });
}
