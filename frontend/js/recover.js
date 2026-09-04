// recover.js — Recuperación de contraseña con Firebase

document.addEventListener('DOMContentLoaded', function () {
  const recoveryForm    = document.getElementById('recoveryForm');
  const recoveryEmail   = document.getElementById('recoveryEmail');
  const recoveryMessage = document.getElementById('recoveryMessage');
  const btnRecovery     = recoveryForm?.querySelector('.btn-recovery');

  function showMessage(message, type) {
    recoveryMessage.textContent  = message;
    recoveryMessage.className    = `recovery-message ${type}`;
    recoveryMessage.style.display = 'block';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  recoveryForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = recoveryEmail.value.trim();

    recoveryMessage.textContent  = '';
    recoveryMessage.className    = 'recovery-message';
    recoveryMessage.style.display = 'none';

    if (!email) {
      showMessage('Por favor ingresa tu correo electrónico', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showMessage('Por favor ingresa un correo válido', 'error');
      return;
    }

    if (btnRecovery) {
      btnRecovery.textContent = 'Enviando...';
      btnRecovery.disabled    = true;
    }

    try {
      // Usar Firebase si está disponible, sino simular
      if (typeof sendPasswordReset === 'function') {
        const result = await sendPasswordReset(email);
        if (result.success) {
          showMessage(
            `Hemos enviado instrucciones de recuperación a ${email}. Revisa tu bandeja de entrada.`,
            'success'
          );
          recoveryEmail.value = '';
        } else {
          showMessage(result.message || 'Error al enviar correo de recuperación', 'error');
        }
      } else if (typeof firebase !== 'undefined') {
        await firebase.auth().sendPasswordResetEmail(email);
        showMessage(
          `Hemos enviado instrucciones de recuperación a ${email}. Revisa tu bandeja de entrada.`,
          'success'
        );
        recoveryEmail.value = '';
      } else {
        // Fallback sin Firebase (desarrollo local)
        showMessage(
          `Instrucciones enviadas a ${email} (modo demo — Firebase no configurado).`,
          'success'
        );
        recoveryEmail.value = '';
      }
    } catch (err) {
      console.error('Password reset error:', err);
      showMessage(err.message || 'Error al enviar el correo. Intenta de nuevo.', 'error');
    } finally {
      if (btnRecovery) {
        btnRecovery.textContent = 'Enviar Instrucciones';
        btnRecovery.disabled    = false;
      }
    }
  });

  recoveryEmail?.addEventListener('input', function () {
    if (recoveryMessage.textContent) {
      recoveryMessage.textContent  = '';
      recoveryMessage.style.display = 'none';
    }
  });
});
