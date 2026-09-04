// profile.js — Gestión del perfil de usuario

document.addEventListener('DOMContentLoaded', function () {
  checkAuthentication();
  loadUserProfile();

  const personalForm   = document.getElementById('personalForm');
  const universityForm = document.getElementById('universityForm');
  const emailForm      = document.getElementById('emailForm');
  const passwordForm   = document.getElementById('passwordForm');

  const profileUniversitySelect = document.getElementById('profileUniversitySelect');
  const profileAreaSelect       = document.getElementById('profileAreaSelect');

  const newPasswordInput        = document.getElementById('newPassword');
  const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
  const toggleNewPasswordBtn    = document.getElementById('toggleNewPassword');
  const toggleNewPasswordIcon   = document.getElementById('toggleNewPasswordIcon');
  const toggleConfirmNewBtn     = document.getElementById('toggleConfirmNewPassword');
  const toggleConfirmNewIcon    = document.getElementById('toggleConfirmNewPasswordIcon');

  const logoutBtn       = document.getElementById('logoutBtn');
  const deleteAccountBtn= document.getElementById('deleteAccountBtn');

  // ── Toggle passwords ─────────────────────────────────────────────
  toggleNewPasswordBtn?.addEventListener('click', e => {
    e.preventDefault();
    const show = newPasswordInput.type === 'password';
    newPasswordInput.type        = show ? 'text' : 'password';
    toggleNewPasswordIcon.textContent = show ? 'Ocultar' : 'Ver';
  });

  toggleConfirmNewBtn?.addEventListener('click', e => {
    e.preventDefault();
    const show = confirmNewPasswordInput.type === 'password';
    confirmNewPasswordInput.type   = show ? 'text' : 'password';
    toggleConfirmNewIcon.textContent = show ? 'Ocultar' : 'Ver';
  });

  // ── Universidad → poblar áreas ───────────────────────────────────
  profileUniversitySelect?.addEventListener('change', function () {
    const codigo  = this.value.trim();
    const areas   = (typeof getAreasForUniversity === 'function')
      ? getAreasForUniversity(codigo) : [];

    if (areas && areas.length > 0) {
      profileAreaSelect.innerHTML = '<option value="">— Selecciona un área —</option>' +
        areas.map(a => `<option value="${a.code}|${a.name}">${a.name}</option>`).join('');
      profileAreaSelect.disabled = false;
    } else {
      profileAreaSelect.innerHTML = '<option value="">No hay áreas disponibles</option>';
      profileAreaSelect.disabled  = true;
    }
    profileAreaSelect.value = '';

    const uniInfo = (typeof getUniversityInfo === 'function')
      ? getUniversityInfo(codigo) : null;
    if (uniInfo) updateUniversityPreview(uniInfo.image, uniInfo.name);
  });

  // ── Información personal ─────────────────────────────────────────
  personalForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const firstName = document.getElementById('profileFirstName').value.trim();
    const lastName  = document.getElementById('profileLastName').value.trim();
    if (!firstName || !lastName) {
      showMessage('personalMessage', 'Completa todos los campos', 'error');
      return;
    }
    const userId = localStorage.getItem('userId');
    if (userId && typeof updateUserProfile === 'function') {
      const result = await updateUserProfile(userId, { firstName, lastName,
        name: `${firstName} ${lastName}` });
      showMessage('personalMessage', result.message, result.success ? 'success' : 'error');
      if (result.success) {
        // Actualizar localStorage
        try {
          const raw  = localStorage.getItem('currentUser');
          const user = raw ? JSON.parse(raw) : {};
          user.firstName = firstName;
          user.lastName  = lastName;
          user.name      = `${firstName} ${lastName}`;
          localStorage.setItem('currentUser', JSON.stringify(user));
        } catch (_) {}
      }
    } else {
      // Demo sin Firebase
      try {
        const raw  = localStorage.getItem('currentUser');
        const user = raw ? JSON.parse(raw) : {};
        user.firstName = firstName;
        user.lastName  = lastName;
        user.name      = `${firstName} ${lastName}`;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showMessage('personalMessage', 'Perfil actualizado (modo demo)', 'success');
      } catch (_) {
        showMessage('personalMessage', 'Error al guardar', 'error');
      }
    }
  });

  // ── Universidad ──────────────────────────────────────────────────
  universityForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const university = profileUniversitySelect.value.trim();
    const areaValue  = profileAreaSelect.value.trim();
    if (!university) {
      showMessage('universityMessage', 'Selecciona una universidad', 'error'); return;
    }
    if (!areaValue) {
      showMessage('universityMessage', 'Selecciona un área académica', 'error'); return;
    }
    const uniInfo  = (typeof getUniversityInfo === 'function')
      ? getUniversityInfo(university) : { name: university, image: `${university}.png` };
    const [areaCode, ...aNomParts] = areaValue.split('|');
    const areaName = aNomParts.join('|') || areaCode;

    const updates = {
      university, universityName: uniInfo.name, universityImage: uniInfo.image,
      area: areaCode, areaName,
    };

    const userId = localStorage.getItem('userId');
    if (userId && typeof updateUserProfile === 'function') {
      const result = await updateUserProfile(userId, updates);
      showMessage('universityMessage', result.message, result.success ? 'success' : 'error');
      if (result.success) updateUniversityPreview(uniInfo.image, uniInfo.name);
    } else {
      try {
        const raw  = localStorage.getItem('currentUser');
        const user = raw ? JSON.parse(raw) : {};
        Object.assign(user, updates);
        localStorage.setItem('currentUser', JSON.stringify(user));
        updateUniversityPreview(uniInfo.image, uniInfo.name);
        showMessage('universityMessage', 'Universidad actualizada (modo demo)', 'success');
      } catch (_) {
        showMessage('universityMessage', 'Error al guardar', 'error');
      }
    }
  });

  // ── Email ────────────────────────────────────────────────────────
  emailForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const newEmail = document.getElementById('newEmail').value.trim();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showMessage('emailMessage', 'Ingresa un correo válido', 'error'); return;
    }
    if (typeof updateUserEmail === 'function') {
      const result = await updateUserEmail(newEmail);
      showMessage('emailMessage', result.message, result.success ? 'success' : 'error');
      if (result.success) {
        document.getElementById('profileEmail').value = newEmail;
        emailForm.reset();
      }
    } else {
      showMessage('emailMessage', 'Firebase no configurado — cambio no persistido', 'error');
    }
  });

  // ── Password ─────────────────────────────────────────────────────
  passwordForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const newPassword     = newPasswordInput.value.trim();
    const confirmPassword = confirmNewPasswordInput.value.trim();
    if (!newPassword || !confirmPassword) {
      showMessage('passwordMessage', 'Completa todos los campos', 'error'); return;
    }
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      showMessage('passwordMessage',
        'La contraseña debe tener mínimo 8 caracteres, letras y números', 'error'); return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('passwordMessage', 'Las contraseñas no coinciden', 'error');
      confirmNewPasswordInput.value = ''; return;
    }
    if (typeof updateUserPassword === 'function') {
      const result = await updateUserPassword(newPassword);
      showMessage('passwordMessage', result.message, result.success ? 'success' : 'error');
      if (result.success) passwordForm.reset();
    } else {
      showMessage('passwordMessage', 'Firebase no configurado', 'error');
    }
  });

  // ── Logout ───────────────────────────────────────────────────────
  logoutBtn?.addEventListener('click', async function () {
    if (!confirm('¿Cerrar sesión?')) return;
    if (typeof logoutUser === 'function') {
      await logoutUser();
    } else {
      localStorage.removeItem('userId');
      localStorage.removeItem('currentUser');
    }
    window.location.href = 'login.html';
  });

  // ── Eliminar cuenta ──────────────────────────────────────────────
  deleteAccountBtn?.addEventListener('click', async function () {
    if (!confirm('¿Eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
    if (!confirm('Última confirmación: ¿eliminar cuenta permanentemente?')) return;
    const userId = localStorage.getItem('userId');
    if (userId && typeof deleteUserAccount === 'function') {
      const result = await deleteUserAccount(userId);
      if (result.success) {
        alert('Cuenta eliminada.');
        window.location.href = 'login.html';
      } else {
        alert('Error: ' + result.message);
      }
    } else {
      localStorage.removeItem('userId');
      localStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    }
  });
});

// ── Auth check ───────────────────────────────────────────────────────
async function checkAuthentication() {
  if (typeof isUserAuthenticated === 'function') {
    const auth = await isUserAuthenticated();
    if (!auth) window.location.href = 'login.html';
  } else {
    // Demo: verificar localStorage
    const user = localStorage.getItem('currentUser') || localStorage.getItem('userId');
    if (!user) window.location.href = 'login.html';
  }
}

// ── Cargar perfil ────────────────────────────────────────────────────
async function loadUserProfile() {
  const userId = localStorage.getItem('userId');
  let userProfile = null;

  if (userId && typeof getUserProfile === 'function') {
    userProfile = await getUserProfile(userId);
  }
  if (!userProfile) {
    try {
      const raw = localStorage.getItem('currentUser');
      userProfile = raw ? JSON.parse(raw) : null;
    } catch (_) {}
  }
  if (!userProfile) return;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  const fullName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ').trim();
  set('profileFirstName', userProfile.firstName || fullName.split(' ')[0] || '');
  set('profileLastName',  userProfile.lastName  || fullName.split(' ').slice(1).join(' ') || '');
  set('profileEmail',     userProfile.email     || '');

  const uniSelect  = document.getElementById('profileUniversitySelect');
  const areaSelect = document.getElementById('profileAreaSelect');

  if (uniSelect && userProfile.university) {
    uniSelect.value = userProfile.university;

    const areas = (typeof getAreasForUniversity === 'function')
      ? getAreasForUniversity(userProfile.university) : [];

    if (areas && areas.length > 0) {
      areaSelect.innerHTML = '<option value="">— Selecciona un área —</option>' +
        areas.map(a => `<option value="${a.code}|${a.name}">${a.name}</option>`).join('');
      areaSelect.disabled = false;
      if (userProfile.area && userProfile.areaName) {
        areaSelect.value = `${userProfile.area}|${userProfile.areaName}`;
      }
    }

    const uniInfo = (typeof getUniversityInfo === 'function')
      ? getUniversityInfo(userProfile.university) : null;
    if (uniInfo) updateUniversityPreview(uniInfo.image, uniInfo.name);
  }
}

// ── Preview universidad ──────────────────────────────────────────────
function updateUniversityPreview(imageUrl, universityName) {
  const previewDiv = document.getElementById('universityImagePreview');
  if (!previewDiv) return;
  const imageName  = imageUrl.endsWith('.png') ? imageUrl : imageUrl + '.png';
  previewDiv.innerHTML = `
    <div class="preview-item">
      <img src="assets/images/${imageName}" alt="${universityName}"
           class="university-logo"
           onerror="this.style.display='none'">
      <p class="university-name">${universityName}</p>
    </div>`;
}

// ── Mostrar mensajes ─────────────────────────────────────────────────
function showMessage(elementId, message, type) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent  = message;
  el.className    = `profile-message ${type}`;
  el.style.display = 'block';
  if (type === 'success') {
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  }
}
