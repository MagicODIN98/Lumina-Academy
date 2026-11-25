// recover.js — Recuperación de contraseña con Firebase

document.addEventListener('DOMContentLoaded', function () {
  const recoveryForm = document.getElementById('recoveryForm');
  const recoveryEmail = document.getElementById('recoveryEmail');
  const recoveryMessage = document.getElementById('recoveryMessage');
  const btnRecovery = recoveryForm?.querySelector('.btn-recovery');

  function showMessage(message, type) {
    recoveryMessage.textContent = message;
    recoveryMessage.className = `recovery-message ${type}`;
    recoveryMessage.style.display = 'block';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  recoveryForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = recoveryEmail.value.trim();

    recoveryMessage.textContent = '';
    recoveryMessage.className = 'recovery-message';
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
      btnRecovery.disabled = true;
    }

    try {
      if (typeof sendPasswordReset !== 'function') {
        showMessage(
          'El servicio de recuperación no está disponible.',
          'error'
        );
        return;
      }

      const result = await sendPasswordReset(email);

      if (result.success) {
        showMessage(
          'Solicitud procesada. Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.',
          'success'
        );
        recoveryEmail.value = '';
      } else {
        showMessage(
          result.message || 'No se pudo solicitar la recuperación.',
          'error'
        );
      }
    } catch (err) {
      console.error('Password reset error:', err);
      showMessage(err.message || 'Error al enviar el correo. Intenta de nuevo.', 'error');
    } finally {
      if (btnRecovery) {
        btnRecovery.textContent = 'Enviar Instrucciones';
        btnRecovery.disabled = false;
      }
    }
  });

  recoveryEmail?.addEventListener('input', function () {
    if (recoveryMessage.textContent) {
      recoveryMessage.textContent = '';
      recoveryMessage.style.display = 'none';
    }
  });
});
