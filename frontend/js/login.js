// login.js — Inicio de sesión con Firebase

document.addEventListener('DOMContentLoaded', function () {
  const loginForm        = document.getElementById('loginForm');
  const emailInput       = document.getElementById('email');
  const passwordInput    = document.getElementById('password');
  const togglePasswordBtn= document.getElementById('togglePassword');
  const toggleIcon       = document.getElementById('toggleIcon');
  const errorMessage     = document.getElementById('errorMessage');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const btnLogin         = loginForm?.querySelector('.btn-login');

  // ── Toggle contraseña ────────────────────────────────────────────
  togglePasswordBtn?.addEventListener('click', function (e) {
    e.preventDefault();
    const isPass = passwordInput.type === 'password';
    passwordInput.type    = isPass ? 'text' : 'password';
    toggleIcon.textContent = isPass ? 'Ocultar' : 'Ver';
  });

  // ── Limpiar error al escribir ────────────────────────────────────
  [emailInput, passwordInput].forEach(input => {
    input?.addEventListener('input', () => {
      errorMessage.classList.remove('show');
      errorMessage.textContent = '';
      if (forgotPasswordLink) forgotPasswordLink.style.fontWeight = '600';
    });
  });

  // ── Mostrar error ────────────────────────────────────────────────
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.type  = 'password';
    }
    if (toggleIcon) toggleIcon.textContent = 'Ver';
    if (forgotPasswordLink) forgotPasswordLink.style.fontWeight = '700';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── Submit ───────────────────────────────────────────────────────
  loginForm?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email    = emailInput.value.trim();
    const password = passwordInput.value.trim();

    errorMessage.classList.remove('show');

    if (!email || !password) {
      showError('Por favor completa todos los campos');
      return;
    }
    if (email.includes('@') && !isValidEmail(email)) {
      showError('Por favor ingresa un correo válido');
      return;
    }

    if (btnLogin) {
      btnLogin.textContent = 'Iniciando sesión...';
      btnLogin.disabled    = true;
    }

    try {
      // Firebase disponible
      if (typeof loginUser === 'function') {
        const result = await loginUser(email, password);
        if (result.success) {
          // Normalizar y guardar perfil en localStorage
          const profile  = result.userProfile || {};
          const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
          const normalizedUser = {
            ...profile,
            name:            profile.name || fullName || 'Usuario',
            email:           profile.email || email,
            university:      profile.university || profile.universidad || 'UNAM',
            universityName:  profile.universityName || profile.uniCompleto || 'Universidad Nacional Autónoma de México',
            universityImage: profile.universityImage || profile.uniImage || 'UNAM.png',
            profileImage:    profile.user_icon || profile.profileImage || null,
            user_icon:       profile.user_icon || null,
          };
          localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
          window.location.href = 'dashboard.html';
        } else {
          showError(result.message || 'Error al iniciar sesión');
        }
      } else {
        // Modo demo sin Firebase (para desarrollo local)
        console.warn('Firebase no está configurado — modo demo');
        localStorage.setItem('currentUser', JSON.stringify({
          name:           'Usuario Demo',
          email:          email,
          university:     'UNAM',
          universityName: 'Universidad Nacional Autónoma de México',
          universityImage:'UNAM.png',
        }));
        window.location.href = 'dashboard.html';
      }
    } catch (err) {
      console.error('Login error:', err);
      showError(err.message || 'Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      if (btnLogin) {
        btnLogin.textContent = 'Iniciar Sesión';
        btnLogin.disabled    = false;
      }
    }
  });
});
