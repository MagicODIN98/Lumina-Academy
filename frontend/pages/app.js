/* ═══════════════════════════════════════════════════════════════════════
   app.js — Dashboard CRYSTAL
   Gestión de perfil, navegación y conexión con la API
═══════════════════════════════════════════════════════════════════════ */

// ── Estado global del perfil ──────────────────────────────────────────
const perfil = {
  nombre:       'Usuario',
  correo:       'usuario@correo.com',
  universidad:  'UNAM',
  uniCompleto:  'Universidad Nacional Autónoma de México',
  uniImage:     'UNAM.png',
  area:         null,
  areaName:     'Área Académica',
  profileImage: null,
};

// Imágenes de perfil disponibles (avatares)
const imagenesPerfil = [
  'ahri.jpg','aurelio_sol.jpg','cepibolla.jpeg','diku.jpg','ekko.jpg',
  'gato1.jpg','gato2.jpg','gato_gojo.jpg','gato_maid.jpg','gato_pasto.jpg',
  'godman.jpg','jolunai.jpg','kirbo.jpg','kirby.jpeg','lisandra.jpg',
  'meowl.jpg','mimikiu.jpg','reze.jpg','silly.jpg','tresh.jpg',
];

let perfilPendiente = {};

// ── Helpers DOM ───────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

const dom = {
  displayName:     () => $('displayName'),
  displayEmail:    () => $('displayEmail'),
  greetingName:    () => $('greetingName'),
  avatarInitials:  () => $('avatarInitials'),
  avatarPhoto:     () => $('avatarPhoto'),
  uniLogo:         () => $('uniLogo'),
  uniName:         () => $('uniName'),
  uniSub:          () => $('uniSub'),
  areaLogo:        () => $('areaLogo'),
  areaName:        () => $('areaName'),
  areaSub:         () => $('areaSub'),
  modalAjustes:    () => $('modalAjustes'),
  inputNombre:     () => $('inputNombre'),
  inputCorreo:     () => $('inputCorreo'),
  inputUniversidad:() => $('inputUniversidad'),
  inputArea:       () => $('inputArea'),
  previewInitials: () => $('previewInitials'),
  previewPhoto:    () => $('previewPhoto'),
  modalGallery:    () => $('modalGallery'),
  galleryGrid:     () => $('galleryGrid'),
  modalConfirm:    () => $('modalConfirm'),
  confirmChanges:  () => $('confirmChanges'),
  toast:           () => $('toast'),
};

// ══════════════════════════════════════════════════════════════════════
//  MÉTODOS DE PERFIL
// ══════════════════════════════════════════════════════════════════════

function cambiarNombre(nombre) {
  const n = nombre.trim();
  if (!n) return;
  perfil.nombre = n;
  const dn = dom.displayName();  if (dn) dn.textContent = n;
  const gn = dom.greetingName(); if (gn) gn.textContent = n;
  actualizarIniciales(n);
}

function cambiarCorreo(correo) {
  const c = correo.trim();
  if (!c) return;
  perfil.correo = c;
  const de = dom.displayEmail(); if (de) de.textContent = c;
}

/**
 * Actualiza la universidad.
 * Acepta tanto un código simple ("UNAM") como "UNAM|Nombre completo".
 */
function cambiarUniversidad(valor) {
  if (!valor) return;

  let codigo, nombre, imagen;

  if (valor.includes('|')) {
    // Formato antiguo "UNAM|Universidad Nacional..."
    [codigo, ...rest] = valor.split('|');
    nombre = rest.join('|');
  } else {
    codigo = valor;
    nombre = null;
  }

  // Usar datos de universities-areas.js si están disponibles
  const uniInfo = (typeof getUniversityInfo === 'function') ? getUniversityInfo(codigo) : null;
  nombre = nombre || (uniInfo ? uniInfo.name : codigo);
  imagen = uniInfo ? uniInfo.image : `${codigo}.png`;

  perfil.universidad = codigo;
  perfil.uniCompleto = nombre;
  perfil.uniImage    = imagen;

  const uniLogo = dom.uniLogo(); if (uniLogo) uniLogo.textContent = codigo;
  const uniName = dom.uniName(); if (uniName) uniName.textContent = codigo;
  const uniSub  = dom.uniSub();  if (uniSub)  uniSub.textContent  = nombre;

  actualizarImagenUniversidad();
}

function actualizarImagenUniversidad() {
  const uniLogoElement = dom.uniLogo();
  if (!uniLogoElement) return;

  const existing = uniLogoElement.querySelector('img');
  if (existing) existing.remove();

  const imagenPath = `assets/images/${perfil.uniImage}`;
  const img = document.createElement('img');
  img.src   = imagenPath;
  img.alt   = perfil.uniCompleto;
  img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
  img.onerror = () => { img.style.display = 'none'; uniLogoElement.textContent = perfil.universidad; };

  uniLogoElement.textContent = '';
  uniLogoElement.appendChild(img);
}

function cambiarArea(valor) {
  if (!valor) return;
  const [codigo, ...rest] = valor.split('|');
  const nombre = rest.join('|') || codigo;
  perfil.area     = codigo;
  perfil.areaName = nombre;

  const al = dom.areaLogo(); if (al) al.textContent = codigo.substring(0, 4).toUpperCase();
  const an = dom.areaName(); if (an) an.textContent = nombre;
  const as = dom.areaSub();  if (as) as.textContent = perfil.uniCompleto;
}

function cambiarFotografia(imageName) {
  perfil.profileImage = imageName;
  const foto = dom.avatarPhoto();
  if (!foto) return;
  if (imageName) {
    foto.src = `assets/user_icons/${imageName}`;
    foto.classList.add('visible');
    document.querySelectorAll('.avatar-initials').forEach(el => el.classList.add('hidden'));
  } else {
    foto.src = '';
    foto.classList.remove('visible');
    document.querySelectorAll('.avatar-initials').forEach(el => el.classList.remove('hidden'));
  }
}

// ── Detección de cambios ──────────────────────────────────────────────
function detectarCambios() {
  const cambios = [];
  if (perfilPendiente.nombre      !== undefined && perfilPendiente.nombre      !== perfil.nombre)
    cambios.push({ key: 'Nombre',          val: perfilPendiente.nombre });
  if (perfilPendiente.correo      !== undefined && perfilPendiente.correo      !== perfil.correo)
    cambios.push({ key: 'Correo',          val: perfilPendiente.correo });
  if (perfilPendiente.universidad !== undefined && perfilPendiente.universidad !== perfil.universidad)
    cambios.push({ key: 'Universidad',     val: perfilPendiente.universidad });
  if (perfilPendiente.area        !== undefined && perfilPendiente.area        !== perfil.area)
    cambios.push({ key: 'Área Académica',  val: perfilPendiente.areaName ?? perfilPendiente.area });
  if (perfilPendiente.profileImage !== undefined && perfilPendiente.profileImage !== perfil.profileImage)
    cambios.push({ key: 'Foto', val: perfilPendiente.profileImage ? 'Imagen seleccionada' : 'Eliminada' });
  return cambios;
}

function confirmarCambios() {
  const cambios = detectarCambios();
  if (cambios.length === 0) { mostrarToast('Sin cambios que guardar.'); return; }

  const container = dom.confirmChanges();
  if (container)
    container.innerHTML = cambios
      .map(c => `<div class="change-row"><span class="change-key">${c.key}</span><span class="change-val">${c.val}</span></div>`)
      .join('');

  cerrarModal('modalAjustes');
  abrirModal('modalConfirm');
}

function guardarPerfil() {
  const cambios = detectarCambios();
  if (cambios.length === 0) return;

  if (perfilPendiente.nombre      !== undefined && perfilPendiente.nombre      !== perfil.nombre)
    cambiarNombre(perfilPendiente.nombre);
  if (perfilPendiente.correo      !== undefined && perfilPendiente.correo      !== perfil.correo)
    cambiarCorreo(perfilPendiente.correo);
  if (perfilPendiente.universidad !== undefined && perfilPendiente.universidad !== perfil.universidad)
    cambiarUniversidad(perfilPendiente.universidad);
  if (perfilPendiente.area        !== undefined && perfilPendiente.area        !== perfil.area)
    cambiarArea(`${perfilPendiente.area}|${perfilPendiente.areaName ?? perfilPendiente.area}`);
  if (perfilPendiente.profileImage !== undefined && perfilPendiente.profileImage !== perfil.profileImage) {
    cambiarFotografia(perfilPendiente.profileImage);
    sincronizarPreviewFoto(perfilPendiente.profileImage);
  }

  cerrarModal('modalConfirm');
  guardarUsuarioEnLocalStorage();
  guardarPerfilEnFirebase()
    .then(() => mostrarToast('✓ Cambios guardados correctamente'))
    .catch(err => { console.error(err); mostrarToast('⚠ Error al guardar en la nube'); });

  perfilPendiente = {};
}

// ── Helpers UI ────────────────────────────────────────────────────────
function actualizarIniciales(nombre) {
  const tokens = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  const ini = tokens.length >= 2
    ? (tokens[0][0] + tokens[1][0]).toUpperCase()
    : (nombre || 'US').substring(0, 2).toUpperCase();
  document.querySelectorAll('.avatar-initials').forEach(el => el.textContent = ini);
}

function sincronizarPreviewFoto(imageName) {
  const prev = dom.previewPhoto();
  if (!prev) return;
  if (imageName) {
    prev.src = `assets/user_icons/${imageName}`;
    prev.classList.add('visible');
  } else {
    prev.src = '';
    prev.classList.remove('visible');
  }
}

function abrirModal(id)  { const m = $(id); if (m) m.classList.add('open'); }
function cerrarModal(id) { const m = $(id); if (m) m.classList.remove('open'); }

let toastTimer = null;
function mostrarToast(msg) {
  const t = dom.toast();
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Modal de ajustes ──────────────────────────────────────────────────
function abrirModalAjustes() {
  const inputNombre = dom.inputNombre();
  const inputCorreo = dom.inputCorreo();
  const uniSel      = dom.inputUniversidad();
  const areaSel     = dom.inputArea();

  if (inputNombre) inputNombre.value = perfil.nombre;
  if (inputCorreo) inputCorreo.value = perfil.correo;
  if (uniSel)      uniSel.value      = perfil.universidad;

  poblarAreasEnModal(perfil.universidad);

  if (perfil.area && areaSel) {
    areaSel.value = `${perfil.area}|${perfil.areaName}`;
  }

  sincronizarPreviewFoto(perfil.profileImage);
  perfilPendiente = {};
  renderizarGaleria();
  abrirModal('modalAjustes');
}

function poblarAreasEnModal(universidadCodigo) {
  const areaSel = dom.inputArea();
  if (!areaSel) return;

  if (!universidadCodigo) {
    areaSel.innerHTML = '<option value="">— Primero selecciona una universidad —</option>';
    areaSel.disabled  = true;
    return;
  }

  const areas = (typeof getAreasForUniversity === 'function') ? getAreasForUniversity(universidadCodigo) : [];
  if (areas && areas.length > 0) {
    areaSel.innerHTML = '<option value="">— Selecciona un área —</option>' +
      areas.map(a => `<option value="${a.code}|${a.name}">${a.name}</option>`).join('');
    areaSel.disabled = false;
  } else {
    areaSel.innerHTML = '<option value="">No hay áreas disponibles</option>';
    areaSel.disabled  = true;
  }
}

// ── Temas (datos de ejemplo) ──────────────────────────────────────────
const temas = [
  { nombre: 'Matemáticas', pct: 82, nivel: 'high' },
  { nombre: 'Español',     pct: 67, nivel: 'mid'  },
  { nombre: 'Historia',    pct: 45, nivel: 'low'  },
  { nombre: 'Ciencias',    pct: 71, nivel: 'mid'  },
  { nombre: 'Geografía',   pct: 38, nivel: 'low'  },
];

function renderizarTemas() {
  const lista = $('temaList');
  const badge = $('temasBadge');
  if (!lista) return;
  lista.innerHTML = temas.map(t => `
    <div class="tema-item">
      <span class="tema-name">${t.nombre}</span>
      <div class="tema-bar-wrap">
        <div class="tema-bar ${t.nivel}" style="width:${t.pct}%"></div>
      </div>
      <span class="tema-pct">${t.pct}%</span>
    </div>`).join('');
  if (badge) badge.textContent = `${temas.length} activos`;
}

// ── Galería de imágenes ───────────────────────────────────────────────
function renderizarGaleria() {
  const grid = dom.galleryGrid();
  if (!grid) return;
  grid.innerHTML = imagenesPerfil.map(img => `
    <div class="gallery-item ${perfil.profileImage === img ? 'selected' : ''}" data-image="${img}">
      <img src="assets/user_icons/${img}" alt="${img}" loading="lazy"/>
      <div class="gallery-item-overlay">
        <svg viewBox="0 0 24 24" fill="currentColor" class="gallery-checkmark">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => seleccionarImagen(item.dataset.image));
  });
}

function seleccionarImagen(imageName) {
  perfilPendiente.profileImage = imageName;
  sincronizarPreviewFoto(imageName);
  const grid = dom.galleryGrid();
  if (grid) {
    grid.querySelectorAll('.gallery-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.image === imageName);
    });
  }
  cerrarModal('modalGallery');
}

// ── Renderizar panel universidad ──────────────────────────────────────
function renderizarUniversidades() {
  const lista = $('universidadesList');
  if (!lista) return;
  const imagenPath = `assets/images/${perfil.uniImage}`;
  lista.innerHTML = `
    <div class="universidad-item">
      <div class="uni-item-image">
        <img src="${imagenPath}" alt="${perfil.uniCompleto}"
             onerror="this.style.display='none'">
      </div>
      <div class="uni-item-content">
        <h4 class="uni-item-name">${perfil.uniCompleto}</h4>
        <p  class="uni-item-code">Código: ${perfil.universidad}</p>
      </div>
    </div>`;
}

// ── Firebase ──────────────────────────────────────────────────────────
function obtenerPartesNombre(nombreCompleto) {
  const tokens    = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
  const firstName = tokens.shift() || '';
  const lastName  = tokens.join(' ');
  return { firstName, lastName };
}

function guardarUsuarioEnLocalStorage() {
  const { firstName, lastName } = obtenerPartesNombre(perfil.nombre);
  localStorage.setItem('currentUser', JSON.stringify({
    name:            perfil.nombre,
    email:           perfil.correo,
    university:      perfil.universidad,
    universityName:  perfil.uniCompleto,
    universityImage: perfil.uniImage,
    area:            perfil.area,
    areaName:        perfil.areaName,
    profileImage:    perfil.profileImage,
    user_icon:       perfil.profileImage,
    firstName, lastName,
  }));
}

async function guardarPerfilEnFirebase() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId || typeof updateUserProfile !== 'function') return;
    await updateUserProfile(userId, {
      name:            perfil.nombre,
      email:           perfil.correo,
      university:      perfil.universidad,
      universityName:  perfil.uniCompleto,
      universityImage: perfil.uniImage,
      area:            perfil.area,
      areaName:        perfil.areaName,
      user_icon:       perfil.profileImage,
      updatedAt:       new Date().toISOString(),
    });
    guardarUsuarioEnLocalStorage();
  } catch (err) {
    console.error('Firebase save error:', err);
    throw err;
  }
}

// ── Función para navegar al test ──────────────────────────────────────
function irAlTest(params = {}) {
  const qs = new URLSearchParams({
    universidad: params.universidad || perfil.universidad,
    total:       params.total       || 10,
    nivel:       params.nivel       || 'mixto',
    ...(params.area ? { area: params.area } : {}),
  });
  window.location.href = `test.html?${qs.toString()}`;
}

// ══════════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Cargar datos de perfil: Firebase primero, localStorage como fallback
  const userId = localStorage.getItem('userId');
  let perfilCargado = false;

  if (userId && typeof getUserProfile === 'function') {
    try {
      const userProfile = await getUserProfile(userId);
      if (userProfile) {
        const u        = userProfile;
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        perfil.nombre       = String(u.name || fullName || u.nombre || 'Usuario').trim();
        perfil.correo       = String(u.email || 'usuario@correo.com').trim();
        perfil.universidad  = String(u.university || 'UNAM').trim();
        perfil.uniCompleto  = String(u.universityName || 'Universidad Nacional Autónoma de México').trim();
        perfil.uniImage     = String(u.universityImage || 'UNAM.png').trim();
        perfil.area         = u.area || null;
        perfil.areaName     = String(u.areaName || 'Área Académica').trim();
        perfil.profileImage = u.user_icon || u.profileImage || null;
        perfilCargado       = true;
        guardarUsuarioEnLocalStorage();
      }
    } catch (err) {
      console.warn('Firebase load error, using localStorage:', err);
    }
  }

  if (!perfilCargado) {
    try {
      const raw  = localStorage.getItem('currentUser');
      const user = raw ? JSON.parse(raw) : null;
      if (user) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
        perfil.nombre       = String(user.name || fullName || 'Usuario').trim();
        perfil.correo       = String(user.email || 'usuario@correo.com').trim();
        perfil.universidad  = String(user.university || 'UNAM').trim();
        perfil.uniCompleto  = String(user.universityName || 'Universidad Nacional Autónoma de México').trim();
        perfil.uniImage     = String(user.universityImage || 'UNAM.png').trim();
        perfil.area         = user.area || null;
        perfil.areaName     = String(user.areaName || 'Área Académica').trim();
        perfil.profileImage = user.user_icon || user.profileImage || null;
      }
    } catch (err) {
      console.warn('localStorage parse error:', err);
    }
  }

  // 2. Actualizar UI con datos de perfil
  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set('displayName',  perfil.nombre);
  set('displayEmail', perfil.correo);
  set('greetingName', perfil.nombre);
  set('uniLogo',      perfil.universidad);
  set('uniName',      perfil.universidad);
  set('uniSub',       perfil.uniCompleto);

  // Área
  if (perfil.area && perfil.areaName) {
    set('areaLogo', perfil.area.substring(0, 4).toUpperCase());
    set('areaName', perfil.areaName);
    set('areaSub',  perfil.uniCompleto);
  } else {
    set('areaLogo', 'ÁREA');
    set('areaName', 'Área Académica');
    set('areaSub',  perfil.uniCompleto);
  }

  actualizarIniciales(perfil.nombre);
  if (perfil.profileImage) cambiarFotografia(perfil.profileImage);
  actualizarImagenUniversidad();
  renderizarTemas();
  renderizarUniversidades();

  // 3. ── Tarjetas del menú principal ───────────────────────────────
  const cards = document.querySelectorAll('.main-grid .card');
  // Tarjeta 1: Practicar (examen normal con universidad del usuario)
  const cardPracticar = cards[0];
  if (cardPracticar) {
    cardPracticar.style.cursor = 'pointer';
    cardPracticar.setAttribute('tabindex', '0');
    const go = () => irAlTest({ total: 10, nivel: 'mixto' });
    cardPracticar.addEventListener('click', go);
    cardPracticar.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  // Tarjeta 2: Tópico Específico (examen filtrado por área si la tiene)
  const cardTopico = cards[1];
  if (cardTopico) {
    cardTopico.style.cursor = 'pointer';
    const go2 = () => irAlTest({ total: 10, nivel: 'mixto', area: perfil.area });
    cardTopico.addEventListener('click', go2);
    cardTopico.addEventListener('keydown', e => { if (e.key === 'Enter') go2(); });
  }

  // Tarjeta 3: Tema a Mejorar (examen de dificultad baja para refuerzo)
  const cardMejorar = cards[2];
  if (cardMejorar) {
    cardMejorar.style.cursor = 'pointer';
    const go3 = () => irAlTest({ total: 10, nivel: 'facil' });
    cardMejorar.addEventListener('click', go3);
    cardMejorar.addEventListener('keydown', e => { if (e.key === 'Enter') go3(); });
  }

  // 4. ── Eventos del modal de ajustes ──────────────────────────────
  $('btnAjustes')?.addEventListener('click', abrirModalAjustes);
  $('modalClose')?.addEventListener('click', () => cerrarModal('modalAjustes'));
  $('btnCancelar')?.addEventListener('click', () => cerrarModal('modalAjustes'));

  $('btnGuardar')?.addEventListener('click', () => {
    perfilPendiente.nombre      = dom.inputNombre()?.value.trim()  || perfil.nombre;
    perfilPendiente.correo      = dom.inputCorreo()?.value.trim()  || perfil.correo;
    perfilPendiente.universidad = dom.inputUniversidad()?.value    || perfil.universidad;

    const areaVal = dom.inputArea()?.value || '';
    if (areaVal) {
      const [aCode, ...aNomParts] = areaVal.split('|');
      perfilPendiente.area     = aCode;
      perfilPendiente.areaName = aNomParts.join('|') || aCode;
    }
    confirmarCambios();
  });

  $('btnConfirmCancel')?.addEventListener('click', () => {
    cerrarModal('modalConfirm');
    abrirModal('modalAjustes');
  });
  $('btnConfirmOk')?.addEventListener('click', guardarPerfil);

  // Cambiar universidad → poblar áreas
  dom.inputUniversidad()?.addEventListener('change', e => {
    perfilPendiente.universidad = e.target.value;
    poblarAreasEnModal(e.target.value);
    // Reset área
    perfilPendiente.area     = undefined;
    perfilPendiente.areaName = undefined;
    const areaSel = dom.inputArea();
    if (areaSel) areaSel.value = '';
  });

  // Cambiar área
  dom.inputArea()?.addEventListener('change', e => {
    const val = e.target.value;
    if (val) {
      const [code, ...nomParts] = val.split('|');
      perfilPendiente.area     = code;
      perfilPendiente.areaName = nomParts.join('|') || code;
    }
  });

  // Galería
  $('btnOpenGallery')?.addEventListener('click', () => abrirModal('modalGallery'));
  $('modalGalleryClose')?.addEventListener('click', () => cerrarModal('modalGallery'));
  dom.modalGallery()?.addEventListener('click', e => {
    if (e.target === dom.modalGallery()) cerrarModal('modalGallery');
  });

  $('btnRemovePhoto')?.addEventListener('click', () => {
    perfilPendiente.profileImage = null;
    sincronizarPreviewFoto(null);
  });

  // Cambiar universidad/área desde el panel inferior
  $('btnCambiarUni')?.addEventListener('click',  abrirModalAjustes);
  $('btnCambiarArea')?.addEventListener('click', abrirModalAjustes);

  // Cerrar modales al clic fuera
  $('modalAjustes')?.addEventListener('click', e => {
    if (e.target === $('modalAjustes')) cerrarModal('modalAjustes');
  });
  $('modalConfirm')?.addEventListener('click', e => {
    if (e.target === $('modalConfirm')) { cerrarModal('modalConfirm'); abrirModal('modalAjustes'); }
  });

  // Escape cierra todo
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cerrarModal('modalAjustes'); cerrarModal('modalConfirm'); cerrarModal('modalGallery'); }
  });

  console.log('✅ Dashboard CRYSTAL inicializado');
});
