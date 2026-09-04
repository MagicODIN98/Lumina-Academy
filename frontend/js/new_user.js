// new_user.js — Registro de nuevo usuario con Firebase

document.addEventListener('DOMContentLoaded', function () {
  const registrationForm      = document.getElementById('registrationForm');
  const firstNameInput        = document.getElementById('firstName');
  const lastNameInput         = document.getElementById('lastName');
  const emailInput            = document.getElementById('registerEmail');
  const passwordInput         = document.getElementById('registerPassword');
  const confirmPasswordInput  = document.getElementById('confirmPassword');
  const universitySelect      = document.getElementById('universitySelect');
  const areaSelect            = document.getElementById('areaSelect');
  const togglePasswordBtn     = document.getElementById('toggleRegisterPassword');
  const toggleIcon            = document.getElementById('toggleRegisterIcon');
  const toggleConfirmBtn      = document.getElementById('toggleConfirmPassword');
  const toggleConfirmIcon     = document.getElementById('toggleConfirmIcon');
  const termsCheckbox         = document.getElementById('termsCheckbox');
  const registrationMessage   = document.getElementById('registrationMessage');
  const btnRegister           = registrationForm?.querySelector('.btn-register');

  // ── Toggle visibilidad de contraseñas ────────────────────────────
  togglePasswordBtn?.addEventListener('click', e => {
    e.preventDefault();
    const show = passwordInput.type === 'password';
    passwordInput.type    = show ? 'text' : 'password';
    toggleIcon.textContent = show ? 'Ocultar' : 'Ver';
  });

  toggleConfirmBtn?.addEventListener('click', e => {
    e.preventDefault();
    const show = confirmPasswordInput.type === 'password';
    confirmPasswordInput.type   = show ? 'text' : 'password';
    toggleConfirmIcon.textContent = show ? 'Ocultar' : 'Ver';
  });

  // ── Poblar áreas al cambiar universidad ──────────────────────────
  universitySelect?.addEventListener('change', function () {
    const codigo = this.value.trim();
    if (!codigo) {
      areaSelect.innerHTML = '<option value="">— Primero selecciona una universidad —</option>';
      areaSelect.disabled  = true;
      return;
    }
    const areas = (typeof getAreasForUniversity === 'function')
      ? getAreasForUniversity(codigo)
      : [];

    if (areas && areas.length > 0) {
      areaSelect.innerHTML = '<option value="">— Selecciona un área —</option>' +
        areas.map(a => `<option value="${a.code}|${a.name}">${a.name}</option>`).join('');
      areaSelect.disabled = false;
    } else {
      areaSelect.innerHTML = '<option value="">No hay áreas disponibles</option>';
      areaSelect.disabled  = true;
    }
    areaSelect.value = '';
  });

  // ── Helpers ──────────────────────────────────────────────────────
  function showMessage(message, type) {
    registrationMessage.textContent  = message;
    registrationMessage.className    = `registration-message ${type}`;
    registrationMessage.style.display = 'block';
  }

  function clearMessage() {
    registrationMessage.textContent  = '';
    registrationMessage.className    = 'registration-message';
    registrationMessage.style.display = 'none';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isPasswordStrong(password) {
    // Mínimo 8 caracteres, al menos una letra y un número
    return /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password);
  }

  // Limpiar mensaje al escribir en cualquier campo
  [firstNameInput, lastNameInput, emailInput,
   passwordInput, confirmPasswordInput].forEach(input => {
    input?.addEventListener('input', clearMessage);
  });

  // ── Submit ───────────────────────────────────────────────────────
  registrationForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearMessage();

    const firstName      = firstNameInput.value.trim();
    const lastName       = lastNameInput.value.trim();
    const email          = emailInput.value.trim();
    const password       = passwordInput.value.trim();
    const confirmPassword= confirmPasswordInput.value.trim();
    const university     = universitySelect.value.trim();
    const areaValue      = areaSelect.value.trim();
    const termsAccepted  = termsCheckbox.checked;

    // Validaciones
    if (!firstName || !lastName || !email || !password || !confirmPassword || !university || !areaValue) {
      showMessage('Por favor completa todos los campos', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showMessage('Por favor ingresa un correo válido', 'error');
      return;
    }
    if (!isPasswordStrong(password)) {
      showMessage('La contraseña debe tener mínimo 8 caracteres, letras y números', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showMessage('Las contraseñas no coinciden', 'error');
      confirmPasswordInput.value = '';
      return;
    }
    if (!termsAccepted) {
      showMessage('Debes aceptar los términos y condiciones', 'error');
      return;
    }

    if (btnRegister) {
      btnRegister.textContent = 'Creando cuenta...';
      btnRegister.disabled    = true;
    }

    try {
      // Obtener info de universidad y área
      const uniInfo  = (typeof getUniversityInfo === 'function')
        ? getUniversityInfo(university)
        : { name: university, image: `${university}.png` };

      const [areaCode, ...areaNameParts] = areaValue.split('|');
      const areaName = areaNameParts.join('|') || areaCode;

      // Registrar con Firebase si está disponible
      if (typeof registerUser === 'function') {
        const result = await registerUser(email, password, {
          firstName,
          lastName,
          university,
          universityName:  uniInfo.name,
          universityImage: uniInfo.image,
          area:            areaCode,
          areaName,
        });

        if (result.success) {
          showMessage('¡Cuenta creada exitosamente! Redirigiendo al login...', 'success');
          registrationForm.reset();
          passwordInput.type        = 'password';
          confirmPasswordInput.type = 'password';
          if (toggleIcon) toggleIcon.textContent = 'Ver';
          if (toggleConfirmIcon) toggleConfirmIcon.textContent = 'Ver';
          areaSelect.innerHTML = '<option value="">— Primero selecciona una universidad —</option>';
          areaSelect.disabled  = true;
          setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
          showMessage(result.message || 'Error al crear la cuenta', 'error');
        }
      } else {
        // Modo demo sin Firebase
        console.warn('Firebase no configurado — guardando en localStorage (demo)');
        localStorage.setItem('currentUser', JSON.stringify({
          name:           `${firstName} ${lastName}`,
          email,
          university,
          universityName:  uniInfo?.name || university,
          universityImage: uniInfo?.image || `${university}.png`,
          area:            areaCode,
          areaName,
          firstName,
          lastName,
        }));
        showMessage('Cuenta creada en modo demo. Redirigiendo...', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      }
    } catch (err) {
      console.error('Registration error:', err);
      showMessage(err.message || 'Error al crear la cuenta. Intenta de nuevo.', 'error');
    } finally {
      if (btnRegister) {
        btnRegister.textContent = 'Crear Cuenta';
        btnRegister.disabled    = false;
      }
    }
  });
});
