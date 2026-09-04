// auth-functions.js — Autenticación Firebase con fallback a modo demo

// ── Helpers ──────────────────────────────────────────────────────────
function _firebaseDisponible() {
  return window._firebaseReady === true &&
         typeof firebase !== 'undefined' &&
         firebase.apps && firebase.apps.length > 0;
}

function getFirebaseErrorMessage(code) {
  const msgs = {
    'auth/email-already-in-use':  'Este correo ya está registrado',
    'auth/invalid-email':         'Correo inválido',
    'auth/weak-password':         'La contraseña es muy débil (mínimo 6 caracteres)',
    'auth/user-not-found':        'Usuario no encontrado',
    'auth/wrong-password':        'Contraseña incorrecta',
    'auth/too-many-requests':     'Demasiados intentos. Intenta más tarde',
    'auth/user-disabled':         'Esta cuenta ha sido desactivada',
    'auth/requires-recent-login': 'Por favor inicia sesión de nuevo para confirmar',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/invalid-credential':    'Credenciales inválidas. Verifica tu correo y contraseña',
    'auth/network-request-failed':'Error de red. Verifica tu conexión a Internet',
  };
  return msgs[code] || 'Error de autenticación. Intenta de nuevo';
}

// ── REGISTRO ──────────────────────────────────────────────────────────
async function registerUser(email, password, userProfile) {
  if (!_firebaseDisponible()) {
    // Modo demo: guardar en localStorage
    const uid = 'demo_' + Date.now();
    localStorage.setItem('userId', uid);
    const profileData = {
      email, uid,
      firstName:      userProfile.firstName,
      lastName:       userProfile.lastName,
      name:           `${userProfile.firstName} ${userProfile.lastName}`.trim(),
      university:     userProfile.university,
      universityName: userProfile.universityName,
      universityImage:userProfile.universityImage,
      area:           userProfile.area || null,
      areaName:       userProfile.areaName || null,
      createdAt:      new Date().toISOString(),
    };
    localStorage.setItem('currentUser', JSON.stringify(profileData));
    return { success: true, userId: uid, message: 'Cuenta creada (modo demo)' };
  }

  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = cred.user;
    localStorage.setItem('userId', user.uid);
    await saveUserProfile(user.uid, {
      email,
      firstName:      userProfile.firstName,
      lastName:       userProfile.lastName,
      name:           `${userProfile.firstName} ${userProfile.lastName}`.trim(),
      university:     userProfile.university,
      universityName: userProfile.universityName,
      universityImage:userProfile.universityImage,
      area:           userProfile.area || null,
      areaName:       userProfile.areaName || null,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    });
    return { success: true, userId: user.uid, message: 'Usuario registrado exitosamente' };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message, message: getFirebaseErrorMessage(error.code) };
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────────
async function loginUser(email, password) {
  if (!_firebaseDisponible()) {
    // Modo demo: aceptar cualquier credencial
    const existing = localStorage.getItem('currentUser');
    const user = existing ? JSON.parse(existing) : null;
    if (user && user.email === email) {
      localStorage.setItem('userId', user.uid || 'demo_user');
      return { success: true, userId: user.uid || 'demo_user',
               userProfile: user, message: 'Sesión iniciada (modo demo)' };
    }
    // Si no hay usuario guardado, crear uno temporal
    const demoUser = {
      name: 'Usuario Demo', email,
      university: 'UNAM',
      universityName: 'Universidad Nacional Autónoma de México',
      universityImage: 'UNAM.png',
    };
    localStorage.setItem('currentUser', JSON.stringify(demoUser));
    localStorage.setItem('userId', 'demo_user');
    return { success: true, userId: 'demo_user',
             userProfile: demoUser, message: 'Sesión iniciada (modo demo)' };
  }

  try {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = cred.user;
    localStorage.setItem('userId', user.uid);
    const userProfile = await getUserProfile(user.uid);
    return { success: true, userId: user.uid, userProfile, message: 'Sesión iniciada exitosamente' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message, message: getFirebaseErrorMessage(error.code) };
  }
}

// ── LOGOUT ────────────────────────────────────────────────────────────
async function logoutUser() {
  localStorage.removeItem('userId');
  localStorage.removeItem('currentUser');
  if (!_firebaseDisponible()) {
    return { success: true, message: 'Sesión cerrada' };
  }
  try {
    await firebase.auth().signOut();
    return { success: true, message: 'Sesión cerrada exitosamente' };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message, message: 'Error al cerrar sesión' };
  }
}

// ── ESTADO AUTH ───────────────────────────────────────────────────────
function getCurrentUser() {
  if (!_firebaseDisponible()) {
    const raw = localStorage.getItem('currentUser');
    return Promise.resolve(raw ? JSON.parse(raw) : null);
  }
  return new Promise(resolve => {
    firebase.auth().onAuthStateChanged(user => resolve(user));
  });
}

async function isUserAuthenticated() {
  if (!_firebaseDisponible()) {
    return !!(localStorage.getItem('userId') || localStorage.getItem('currentUser'));
  }
  const user = await getCurrentUser();
  return user !== null;
}

// ── PERFIL EN BD ──────────────────────────────────────────────────────
async function saveUserProfile(userId, profileData) {
  if (!_firebaseDisponible()) {
    localStorage.setItem('currentUser', JSON.stringify({ ...profileData, uid: userId }));
    return { success: true, message: 'Perfil guardado (local)' };
  }
  try {
    await firebase.database().ref(`users/${userId}`).set(profileData);
    return { success: true, message: 'Perfil guardado exitosamente' };
  } catch (error) {
    console.error('Save profile error:', error);
    return { success: false, error: error.message, message: 'Error al guardar el perfil' };
  }
}

async function getUserProfile(userId) {
  if (!_firebaseDisponible()) {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  try {
    const snap = await firebase.database().ref(`users/${userId}`).once('value');
    return snap.val();
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
}

async function updateUserProfile(userId, updates) {
  updates.updatedAt = new Date().toISOString();

  if (!_firebaseDisponible()) {
    try {
      const raw  = localStorage.getItem('currentUser');
      const user = raw ? JSON.parse(raw) : {};
      const updated = { ...user, ...updates };
      localStorage.setItem('currentUser', JSON.stringify(updated));
      return { success: true, message: 'Perfil actualizado (local)' };
    } catch (_) {
      return { success: false, message: 'Error al actualizar perfil' };
    }
  }
  try {
    await firebase.database().ref(`users/${userId}`).update(updates);
    return { success: true, message: 'Perfil actualizado exitosamente' };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message, message: 'Error al actualizar el perfil' };
  }
}

// ── SEGURIDAD ─────────────────────────────────────────────────────────
async function updateUserEmail(newEmail) {
  if (!_firebaseDisponible()) {
    return { success: false, message: 'Requiere Firebase configurado' };
  }
  try {
    const user = await getCurrentUser();
    if (user) {
      await user.updateEmail(newEmail);
      await updateUserProfile(user.uid, { email: newEmail });
      return { success: true, message: 'Correo actualizado exitosamente' };
    }
    return { success: false, message: 'No hay sesión activa' };
  } catch (error) {
    console.error('Update email error:', error);
    return { success: false, error: error.message, message: getFirebaseErrorMessage(error.code) };
  }
}

async function updateUserPassword(newPassword) {
  if (!_firebaseDisponible()) {
    return { success: false, message: 'Requiere Firebase configurado' };
  }
  try {
    const user = await getCurrentUser();
    if (user) {
      await user.updatePassword(newPassword);
      return { success: true, message: 'Contraseña actualizada exitosamente' };
    }
    return { success: false, message: 'No hay sesión activa' };
  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, error: error.message, message: getFirebaseErrorMessage(error.code) };
  }
}

async function sendPasswordReset(email) {
  if (!_firebaseDisponible()) {
    return { success: false, message: 'Requiere Firebase configurado para enviar correos' };
  }
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    return { success: true, message: 'Correo de recuperación enviado' };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message, message: getFirebaseErrorMessage(error.code) };
  }
}

async function deleteUserAccount(userId) {
  localStorage.removeItem('userId');
  localStorage.removeItem('currentUser');
  if (!_firebaseDisponible()) {
    return { success: true, message: 'Cuenta eliminada (modo demo)' };
  }
  try {
    const user = await getCurrentUser();
    if (user && user.uid === userId) {
      await firebase.database().ref(`users/${userId}`).remove();
      await user.delete();
      return { success: true, message: 'Cuenta eliminada exitosamente' };
    }
    return { success: false, message: 'No se pudo verificar la cuenta' };
  } catch (error) {
    console.error('Delete account error:', error);
    return { success: false, error: error.message, message: getFirebaseErrorMessage(error.code) };
  }
}
