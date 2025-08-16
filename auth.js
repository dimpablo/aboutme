// auth.js (module)
// Shared Firebase Auth + Firestore points API

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithRedirect, getRedirectResult } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBvyxPtx5PICYk60HUCERw5Cxh1TyCcZCY',
  authDomain: 'antient-9bff0.firebaseapp.com',
  projectId: 'antient-9bff0',
  storageBucket: 'antient-9bff0.firebasestorage.app',
  messagingSenderId: '311792589414',
  appId: '1:311792589414:web:5fff3154735007c2006ba7',
  measurementId: 'G-W4ZQXWRTKK'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const LS_KEY = 'dk_points';
let cachedPoints = Number(localStorage.getItem(LS_KEY) || '0') | 0;
let userUnsub = null;
let currentUser = null;
const listeners = new Set();

function notify() { listeners.forEach(fn => { try { fn({ user: currentUser, points: cachedPoints }); } catch {} }); }

async function ensureDoc(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { points: cachedPoints || 0 }, { merge: true });
    return { points: cachedPoints || 0 };
  }
  return snap.data();
}

async function startUserListener(user) {
  if (userUnsub) { userUnsub(); userUnsub = null; }
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  await ensureDoc(user.uid);
  userUnsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data() || {};
    const serverPoints = Number(data.points || 0) | 0;
    cachedPoints = serverPoints;
    localStorage.setItem(LS_KEY, String(cachedPoints));
    notify();
  });
}

async function setPoints(v) {
  v = Number(v || 0) | 0;
  cachedPoints = v;
  localStorage.setItem(LS_KEY, String(cachedPoints));
  if (currentUser) {
    try { await updateDoc(doc(db, 'users', currentUser.uid), { points: cachedPoints }); } catch { await setDoc(doc(db, 'users', currentUser.uid), { points: cachedPoints }, { merge: true }); }
  }
  notify();
}

async function incPoints(delta) { await setPoints(cachedPoints + Number(delta || 0)); }

function subscribe(fn) { listeners.add(fn); fn({ user: currentUser, points: cachedPoints }); return () => listeners.delete(fn); }

async function login() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // Fallback to redirect for environments where popup is blocked or not supported
    try {
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error('Auth error:', err);
      throw err;
    }
  }
}

async function logout() { await signOut(auth); }

// Handle redirect result if any
getRedirectResult(auth).catch(() => {}).then(() => {});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { points: cachedPoints || 0 }, { merge: true });
    } else {
      const server = Number((snap.data() || {}).points || 0) | 0;
      cachedPoints = server;
      localStorage.setItem(LS_KEY, String(cachedPoints));
    }
    await startUserListener(user);
  } else {
    if (userUnsub) { userUnsub(); userUnsub = null; }
  }
  notify();
});

window.PointsAPI = { get user() { return currentUser; }, get: () => cachedPoints, set: setPoints, inc: incPoints, subscribe, login, logout };

(function wireTopbar(){
  const pt = document.getElementById('points');
  const av = document.getElementById('avatar');
  const loginBtn = document.getElementById('loginBtn');
  const nameEl = document.getElementById('userName');
  if (!pt && !av && !loginBtn) return;
  subscribe(({ user, points }) => {
    if (pt) pt.textContent = points + ' баллов';
    if (user) {
      if (av) {
        const img = av.querySelector('img');
        if (img && user.photoURL) img.src = user.photoURL;
        av.style.display = 'block';
      }
      if (loginBtn) { loginBtn.style.display = 'none'; }
      if (nameEl) { nameEl.textContent = user.displayName || ''; }
    } else {
      if (av) av.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (nameEl) nameEl.textContent = '';
    }
  });
  if (loginBtn) loginBtn.addEventListener('click', () => login());
  if (av) av.addEventListener('click', () => { if (confirm('Выйти из аккаунта?')) logout(); });
})();