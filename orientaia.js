// ─── AUTH ─────────────────────────────────────────────────────────────────────
const AUTH = { user: null };

function initAuth() {
  const session = JSON.parse(localStorage.getItem('orientaia_session') || 'null');
  if (session && session.userId) {
    const users = JSON.parse(localStorage.getItem('orientaia_users') || '[]');
    const user = users.find(u => u.id === session.userId);
    if (user) {
      AUTH.user = { id: user.id, name: user.name, email: user.email };
      loadUserData();
    }
  }
  renderNav();
}

function loadUserData() {
  if (!AUTH.user) return;
  const data = JSON.parse(
    localStorage.getItem('orientaia_ud_' + AUTH.user.id) || '{"favorites":[],"history":[]}'
  );
  STATE.favorites = data.favorites || [];
  STATE.history   = data.history   || [];
}

function saveUserData() {
  if (!AUTH.user) return;
  localStorage.setItem('orientaia_ud_' + AUTH.user.id, JSON.stringify({
    favorites: STATE.favorites,
    history:   STATE.history
  }));
}

function openAuth(tab) {
  document.getElementById('auth-modal').classList.add('open');
  switchAuthTab(tab || 'login');
  clearAuthErrors();
}

function closeAuth() {
  document.getElementById('auth-modal').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('auth-modal')) closeAuth();
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-' + tab).classList.add('active');
  clearAuthErrors();
}

function clearAuthErrors() {
  document.querySelectorAll('.auth-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

function showAuthError(formId, msg) {
  const el = document.getElementById(formId + '-error');
  el.textContent = msg;
  el.classList.add('show');
}

function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = Math.imul(31, h) + pw.charCodeAt(i) | 0;
  }
  return h.toString(36);
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-password').value;

  if (!email || !pw) { showAuthError('login', 'Completa todos los campos.'); return; }

  const users = JSON.parse(localStorage.getItem('orientaia_users') || '[]');
  const user  = users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hashPassword(pw)
  );

  if (!user) { showAuthError('login', 'Correo o contraseña incorrectos.'); return; }

  AUTH.user = { id: user.id, name: user.name, email: user.email };
  localStorage.setItem('orientaia_session', JSON.stringify({ userId: user.id }));
  loadUserData();
  closeAuth();
  renderNav();
  showToast('👋 ¡Bienvenido de vuelta, ' + user.name.split(' ')[0] + '!');
}

function doRegister() {
  const name    = document.getElementById('reg-name').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const pw      = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;

  if (!name || !email || !pw || !confirm) {
    showAuthError('register', 'Completa todos los campos.'); return;
  }
  if (pw.length < 6) {
    showAuthError('register', 'La contraseña debe tener al menos 6 caracteres.'); return;
  }
  if (pw !== confirm) {
    showAuthError('register', 'Las contraseñas no coinciden.'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError('register', 'Ingresa un correo válido.'); return;
  }

  const users = JSON.parse(localStorage.getItem('orientaia_users') || '[]');
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    showAuthError('register', 'Ya existe una cuenta con ese correo.'); return;
  }

  const newUser = { id: 'u_' + Date.now(), name, email, passwordHash: hashPassword(pw) };
  users.push(newUser);
  localStorage.setItem('orientaia_users', JSON.stringify(users));

  AUTH.user = { id: newUser.id, name: newUser.name, email: newUser.email };
  localStorage.setItem('orientaia_session', JSON.stringify({ userId: newUser.id }));
  saveUserData();
  closeAuth();
  renderNav();
  showToast('🎉 ¡Cuenta creada! Bienvenido/a, ' + name.split(' ')[0] + '.');
}

function logout() {
  AUTH.user = null;
  localStorage.removeItem('orientaia_session');
  STATE.favorites = JSON.parse(sessionStorage.getItem('orientaia_favs')    || '[]');
  STATE.history   = JSON.parse(sessionStorage.getItem('orientaia_history') || '[]');
  renderNav();
  goTo('home');
  showToast('Sesión cerrada. ¡Hasta pronto!');
}

function continueAsGuest() {
  closeAuth();
  showToast('Continuando como invitado. Tus datos se guardarán en esta sesión.');
}

function renderNav() {
  const guestEl = document.getElementById('nav-auth-guest');
  const userEl  = document.getElementById('nav-auth-user');

  if (AUTH.user) {
    guestEl.style.display = 'none';
    userEl.style.display  = 'flex';
    const initials = AUTH.user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('nav-user-avatar').textContent = initials;
    document.getElementById('nav-user-name').textContent   = AUTH.user.name.split(' ')[0];
  } else {
    guestEl.style.display = 'flex';
    userEl.style.display  = 'none';
  }
}

// ─── STATE ────────────────────────────────────────────────────────────────────
const STATE = {
  role: null,
  area: null,
  tasks: [],
  budget: 'free',
  favorites: JSON.parse(sessionStorage.getItem('orientaia_favs')    || '[]'),
  history:   JSON.parse(sessionStorage.getItem('orientaia_history') || '[]'),
  currentTool: null,
  currentResults: [],
  sortMode: 'match'
};

// ─── TOOLS DATABASE ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    emoji: '💬',
    category: 'Asistente de IA general',
    developer: 'OpenAI',
    desc: 'El asistente de IA más popular del mundo. Ideal para redacción, análisis, responder preguntas, generar ideas y programar.',
    tasks: ['writing', 'analysis', 'code', 'research', 'communication', 'translation'],
    roles: ['estudiante', 'profesional', 'emprendedor', 'empresa'],
    hasFree: true,
    priceFree: 'Gratis (limitado)',
    pricePaid: 'USD $20/mes (Plus)',
    budget: ['free', 'low', 'medium'],
    pros: ['Muy versátil', 'Interfaz intuitiva', 'Memoria de contexto', 'Plugins y GPTs personalizados'],
    cons: ['Puede alucinar datos', 'Límites en versión gratuita', 'Requiere verificar fuentes'],
    useCases: ['Redactar correos y reportes', 'Resumir documentos largos', 'Generar código básico', 'Crear presentaciones de texto', 'Traducir contenido'],
    plans: [
      { name: 'Free',  price: '$0',            desc: 'GPT-4o mini, límites diarios',          highlight: false },
      { name: 'Plus',  price: 'USD $20/mes',   desc: 'GPT-4o, acceso prioritario, plugins',   highlight: true  },
      { name: 'Team',  price: 'USD $25/usuario', desc: 'Para equipos, mayor contexto',         highlight: false }
    ],
    howTo: [
      'Ve a chat.openai.com y crea una cuenta gratuita',
      'Escribe tu solicitud en el cuadro de texto con el mayor detalle posible',
      'Revisa la respuesta y pide ajustes si es necesario',
      'Usa el botón de copiar para exportar el contenido generado'
    ],
    link: 'https://chat.openai.com',
    tags: ['Escritura', 'Código', 'Análisis', 'Gratis']
  },
  {
    id: 'claude',
    name: 'Claude',
    emoji: '🧠',
    category: 'Asistente de IA avanzado',
    developer: 'Anthropic',
    desc: 'Asistente de IA con capacidad de procesar textos muy largos. Excelente para análisis profundo, redacción académica y razonamiento complejo.',
    tasks: ['writing', 'analysis', 'research', 'code', 'communication'],
    roles: ['estudiante', 'profesional', 'empresa'],
    hasFree: true,
    priceFree: 'Gratis (100K tokens)',
    pricePaid: 'USD $20/mes (Pro)',
    budget: ['free', 'low', 'medium'],
    pros: ['Ventana de contexto muy grande', 'Razonamiento detallado', 'Honesto sobre limitaciones', 'Excelente para textos largos'],
    cons: ['Sin acceso a internet en tiempo real', 'Menos opciones de integración', 'Límites en plan gratuito'],
    useCases: ['Análisis de documentos extensos', 'Redacción académica y técnica', 'Revisión de contratos o reportes', 'Depuración de código complejo', 'Investigación y síntesis'],
    plans: [
      { name: 'Free', price: '$0',          desc: 'Claude 3.5 Haiku, límite mensual',           highlight: false },
      { name: 'Pro',  price: 'USD $20/mes', desc: 'Claude 3.7 Sonnet, proyectos, prioridad',    highlight: true  }
    ],
    howTo: [
      'Crea una cuenta en claude.ai',
      'Adjunta documentos o pega texto directamente si necesitas analizar algo',
      'Formula preguntas específicas con contexto claro',
      'Usa proyectos (Pro) para organizar trabajo recurrente'
    ],
    link: 'https://claude.ai',
    tags: ['Análisis', 'Investigación', 'Escritura', 'Gratis']
  },
  {
    id: 'gemini',
    name: 'Gemini',
    emoji: '✨',
    category: 'IA multimodal de Google',
    developer: 'Google DeepMind',
    desc: 'IA de Google con búsqueda en tiempo real, análisis de imágenes y documentos. Se integra con todo el ecosistema Google (Docs, Sheets, Gmail).',
    tasks: ['writing', 'research', 'analysis', 'presentations', 'communication'],
    roles: ['estudiante', 'profesional', 'empresa', 'emprendedor'],
    hasFree: true,
    priceFree: 'Gratis',
    pricePaid: 'USD $20/mes (Advanced)',
    budget: ['free', 'low', 'medium'],
    pros: ['Información actualizada en tiempo real', 'Integración nativa con Google Workspace', 'Análisis de imágenes y PDFs', 'Disponible en español'],
    cons: ['A veces impreciso en temas especializados', 'Integración avanzada solo en planes de pago', 'Puede ser inconsistente'],
    useCases: ['Buscar información actualizada', 'Analizar imágenes y gráficos', 'Redactar en Google Docs con IA', 'Resumir correos en Gmail', 'Crear presentaciones en Slides'],
    plans: [
      { name: 'Gemini',   price: '$0',          desc: 'Gemini 1.5 Flash, gratuito',                highlight: false },
      { name: 'Advanced', price: 'USD $20/mes', desc: 'Gemini Ultra, integración Workspace',       highlight: true  }
    ],
    howTo: [
      'Ve a gemini.google.com o accede desde Gmail/Docs',
      'Para integración con Workspace activa Gemini en tu cuenta Google',
      'Escribe tu consulta o sube una imagen/archivo para analizar',
      'Usa @menciones en Workspace para llamar a Gemini en contexto'
    ],
    link: 'https://gemini.google.com',
    tags: ['Google', 'Búsqueda', 'Presentaciones', 'Gratis']
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    emoji: '🤖',
    category: 'Asistente de programación',
    developer: 'GitHub / Microsoft',
    desc: 'IA especializada en programación. Sugiere código en tiempo real mientras escribes, explica funciones y detecta errores en múltiples lenguajes.',
    tasks: ['code', 'automation'],
    roles: ['profesional', 'estudiante', 'empresa'],
    hasFree: true,
    priceFree: 'Gratis (30 días trial / estudiantes)',
    pricePaid: 'USD $10/mes (Individual)',
    budget: ['low', 'medium'],
    pros: ['Autocompletado inteligente en tiempo real', 'Soporta +20 lenguajes', 'Se integra a VS Code, JetBrains', 'Copilot Chat para preguntas en contexto'],
    cons: ['Requiere suscripción para uso continuo', 'Puede generar código inseguro', 'Necesita revisión humana'],
    useCases: ['Autocompletar funciones y clases', 'Generar tests automáticamente', 'Explicar código heredado', 'Documentar funciones', 'Detectar y corregir bugs'],
    plans: [
      { name: 'Free',       price: '$0',             desc: 'Limitado, trial 30 días',         highlight: false },
      { name: 'Individual', price: 'USD $10/mes',    desc: 'Uso ilimitado en IDEs',           highlight: true  },
      { name: 'Business',   price: 'USD $19/usuario', desc: 'Políticas de empresa, logs',     highlight: false }
    ],
    howTo: [
      'Instala la extensión GitHub Copilot en VS Code o tu IDE',
      'Inicia sesión con tu cuenta GitHub',
      'Empieza a escribir código y acepta sugerencias con Tab',
      'Usa Copilot Chat (Ctrl+I) para hacer preguntas sobre tu código'
    ],
    link: 'https://github.com/features/copilot',
    tags: ['Código', 'IDE', 'Programación']
  },
  {
    id: 'grammarly',
    name: 'Grammarly',
    emoji: '📝',
    category: 'Corrección y escritura',
    developer: 'Grammarly Inc.',
    desc: 'Herramienta líder de corrección gramatical y mejora de escritura. Detecta errores, mejora el estilo y adapta el tono del texto a tu audiencia.',
    tasks: ['writing', 'communication'],
    roles: ['estudiante', 'profesional', 'empresa'],
    hasFree: true,
    priceFree: 'Gratis (funciones básicas)',
    pricePaid: 'USD $12/mes (Premium)',
    budget: ['free', 'low', 'medium'],
    pros: ['Corrección gramatical precisa', 'Sugerencias de tono y claridad', 'Extensión para navegador y Office', 'Funciona en tiempo real'],
    cons: ['Funciones avanzadas son de pago', 'Principalmente en inglés', 'Limitado para español'],
    useCases: ['Revisar correos profesionales', 'Mejorar trabajos académicos', 'Pulir artículos y blogs', 'Adaptar tono formal/informal', 'Detectar plagio (Premium)'],
    plans: [
      { name: 'Free',     price: '$0',             desc: 'Corrección básica',             highlight: false },
      { name: 'Premium',  price: 'USD $12/mes',    desc: 'IA avanzada, tono, claridad',  highlight: true  },
      { name: 'Business', price: 'USD $15/usuario', desc: 'Equipos, brand voice',         highlight: false }
    ],
    howTo: [
      'Instala la extensión de Chrome o el app de escritorio',
      'Crea una cuenta gratuita en grammarly.com',
      'Escribe o pega tu texto para ver sugerencias en tiempo real',
      'Acepta o rechaza cada sugerencia según tu criterio'
    ],
    link: 'https://www.grammarly.com',
    tags: ['Escritura', 'Corrección', 'Inglés', 'Gratis']
  },
  {
    id: 'notionai',
    name: 'Notion AI',
    emoji: '📓',
    category: 'Productividad y organización',
    developer: 'Notion Labs',
    desc: 'IA integrada en Notion para redactar, resumir, traducir y organizar notas. Perfecto si ya usas Notion para gestionar proyectos y documentación.',
    tasks: ['writing', 'research', 'communication', 'presentations'],
    roles: ['estudiante', 'profesional', 'empresa', 'emprendedor'],
    hasFree: false,
    priceFree: 'Prueba gratuita',
    pricePaid: 'USD $10/mes (add-on)',
    budget: ['low', 'medium'],
    pros: ['Integrado en tu espacio de trabajo', 'Resume y mejora notas en un clic', 'Traduce y adapta tono directamente en documentos', 'Genera tablas y listas automáticamente'],
    cons: ['Requiere usar Notion como plataforma base', 'Costo adicional al plan Notion', 'Menos potente que modelos dedicados'],
    useCases: ['Resumir notas de reuniones', 'Generar borradores de documentos', 'Traducir páginas al instante', 'Crear listas de tareas y planes', 'Organizar proyectos con IA'],
    plans: [
      { name: 'Notion Free', price: '$0',          desc: 'Sin AI, páginas ilimitadas',     highlight: false },
      { name: '+AI Add-on',  price: 'USD $10/mes', desc: 'AI ilimitada en cualquier plan', highlight: true  }
    ],
    howTo: [
      'Crea o inicia sesión en tu cuenta de Notion',
      'Activa el add-on de Notion AI en configuración',
      'En cualquier página, escribe "/" y selecciona opciones de IA',
      'Selecciona texto existente y pide a la IA que lo mejore o resuma'
    ],
    link: 'https://www.notion.so/product/ai',
    tags: ['Productividad', 'Notas', 'Organización']
  },
  {
    id: 'canva',
    name: 'Canva AI',
    emoji: '🎨',
    category: 'Diseño gráfico con IA',
    developer: 'Canva',
    desc: 'Plataforma de diseño con funciones de IA: generación de imágenes, fondos, textos y edición inteligente. Ideal para crear materiales visuales sin ser diseñador.',
    tasks: ['design', 'presentations', 'communication'],
    roles: ['estudiante', 'profesional', 'emprendedor', 'empresa'],
    hasFree: true,
    priceFree: 'Gratis (con límites)',
    pricePaid: 'USD $15/mes (Pro)',
    budget: ['free', 'low', 'medium'],
    pros: ['Muy fácil de usar sin experiencia en diseño', 'Plantillas profesionales', 'Generación de imágenes con IA', 'Colaboración en equipo'],
    cons: ['Assets premium requieren plan de pago', 'Generación de imágenes limitada en free', 'Resultados pueden ser genéricos'],
    useCases: ['Crear presentaciones profesionales', 'Diseñar posts para redes sociales', 'Generar imágenes con IA', 'Crear flyers e infografías', 'Editar fotos con herramientas IA'],
    plans: [
      { name: 'Free',  price: '$0',           desc: 'Plantillas básicas, 5 generaciones IA', highlight: false },
      { name: 'Pro',   price: 'USD $15/mes',  desc: 'Assets premium, IA ilimitada',          highlight: true  },
      { name: 'Teams', price: 'USD $30/equipo', desc: 'Colaboración, brand kit',             highlight: false }
    ],
    howTo: [
      'Crea una cuenta gratis en canva.com',
      'Elige una plantilla o empieza desde cero',
      'Usa "Generar imagen" en el panel lateral para crear con IA',
      'Edita colores, fuentes y elementos según tu marca'
    ],
    link: 'https://www.canva.com',
    tags: ['Diseño', 'Presentaciones', 'Imágenes', 'Gratis']
  },
  {
    id: 'deepl',
    name: 'DeepL',
    emoji: '🌐',
    category: 'Traducción avanzada',
    developer: 'DeepL SE',
    desc: 'El traductor de IA más preciso del mercado. Produce traducciones naturales en más de 30 idiomas con matices contextuales y opciones de tono formal/informal.',
    tasks: ['translation', 'writing', 'communication'],
    roles: ['estudiante', 'profesional', 'empresa'],
    hasFree: true,
    priceFree: 'Gratis (hasta 500,000 caracteres/mes)',
    pricePaid: 'USD $8.74/mes (Pro Starter)',
    budget: ['free', 'low', 'medium'],
    pros: ['Traducciones muy naturales y precisas', 'Soporte de tono formal/informal', 'Traduce archivos Word/PDF enteros', 'API disponible'],
    cons: ['Número de idiomas menor que Google Translate', 'Límites en versión gratuita', 'Archivos grandes solo en Pro'],
    useCases: ['Traducir documentos académicos y técnicos', 'Localizar contenido de marketing', 'Revisar y mejorar traducciones existentes', 'Traducir correos profesionales', 'Internacionalizar sitios web'],
    plans: [
      { name: 'Free',       price: '$0',              desc: '500K caracteres/mes, sin archivos',      highlight: false },
      { name: 'Pro Starter', price: 'USD $8.74/mes', desc: 'Archivos, sin límite de caracteres',     highlight: true  }
    ],
    howTo: [
      'Ve a deepl.com sin necesidad de registrarte para uso básico',
      'Pega o escribe tu texto en el panel izquierdo',
      'Selecciona los idiomas de origen y destino',
      'Para archivos, arrastra tu documento Word o PDF al panel'
    ],
    link: 'https://www.deepl.com',
    tags: ['Traducción', 'Idiomas', 'Gratis']
  },
  {
    id: 'gamma',
    name: 'Gamma',
    emoji: '📊',
    category: 'Presentaciones con IA',
    developer: 'Gamma Tech',
    desc: 'Genera presentaciones, documentos y páginas web profesionales desde un prompt en segundos. Diseño automático sin necesidad de PowerPoint.',
    tasks: ['presentations', 'writing', 'communication'],
    roles: ['estudiante', 'profesional', 'emprendedor', 'empresa'],
    hasFree: true,
    priceFree: 'Gratis (400 créditos iniciales)',
    pricePaid: 'USD $10/mes (Plus)',
    budget: ['free', 'low', 'medium'],
    pros: ['Genera presentaciones completas en segundos', 'Diseño profesional automático', 'Exporta a PDF y PowerPoint', 'Modo colaborativo'],
    cons: ['Créditos se agotan en versión gratuita', 'Personalización limitada vs PowerPoint', 'Contenido puede necesitar revisión'],
    useCases: ['Crear pitch decks para inversores', 'Presentaciones académicas', 'Reportes ejecutivos visuales', 'Landing pages de proyectos', 'Propuestas de negocio'],
    plans: [
      { name: 'Free', price: '$0',          desc: '400 créditos, marca de agua',       highlight: false },
      { name: 'Plus', price: 'USD $10/mes', desc: 'Créditos mensuales, sin marca de agua', highlight: true  },
      { name: 'Pro',  price: 'USD $20/mes', desc: 'Créditos ilimitados, analytics',    highlight: false }
    ],
    howTo: [
      'Regístrate gratis en gamma.app',
      'Haz clic en "Nuevo" y elige "Presentación con IA"',
      'Escribe el tema o pega tu contenido existente',
      'Selecciona un estilo visual y genera; luego edita a tu gusto'
    ],
    link: 'https://gamma.app',
    tags: ['Presentaciones', 'Pitch', 'Diseño', 'Gratis']
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    emoji: '🔍',
    category: 'Búsqueda inteligente',
    developer: 'Perplexity AI Inc.',
    desc: 'Motor de búsqueda con IA que responde preguntas con fuentes citadas y actualizadas. Ideal para investigación y verificación de información en tiempo real.',
    tasks: ['research', 'analysis', 'writing'],
    roles: ['estudiante', 'profesional', 'emprendedor'],
    hasFree: true,
    priceFree: 'Gratis (con límites)',
    pricePaid: 'USD $20/mes (Pro)',
    budget: ['free', 'low', 'medium'],
    pros: ['Respuestas con fuentes citadas y verificables', 'Información actualizada en tiempo real', 'Modo "Focus" para fuentes académicas, Reddit, etc.', 'Interfaz conversacional con contexto'],
    cons: ['Puede confundir fuentes ocasionalmente', 'Funciones avanzadas de pago', 'Profundidad menor que ChatGPT en razonamiento'],
    useCases: ['Investigar temas con fuentes confiables', 'Verificar datos y estadísticas', 'Revisar literatura académica', 'Monitorear tendencias del sector', 'Responder preguntas técnicas con contexto'],
    plans: [
      { name: 'Free', price: '$0',          desc: 'Búsqueda estándar, límite diario Pro',      highlight: false },
      { name: 'Pro',  price: 'USD $20/mes', desc: 'Búsquedas ilimitadas, GPT-4, Claude',       highlight: true  }
    ],
    howTo: [
      'Ve a perplexity.ai sin necesidad de cuenta para consultas básicas',
      'Escribe tu pregunta de forma natural',
      'Usa "Focus" para filtrar por tipo de fuente (académica, noticias, etc.)',
      'Haz clic en cada cita para verificar la fuente original'
    ],
    link: 'https://www.perplexity.ai',
    tags: ['Investigación', 'Búsqueda', 'Fuentes', 'Gratis']
  }
];

// ─── WIZARD ───────────────────────────────────────────────────────────────────
let wizardStep = 1;

function goTo(screen) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(screen).classList.add('active');
  window.scrollTo(0, 0);

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (screen === 'catalog') document.getElementById('nav-catalog').classList.add('active');
  if (screen === 'profile') document.getElementById('nav-profile').classList.add('active');

  if (screen === 'catalog') renderCatalog();
  if (screen === 'profile') renderProfile();
  if (screen === 'wizard') {
    wizardStep = 1;
    renderWizardStep();
  }
}

function selectRole(role) {
  STATE.role = role;
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('rc-' + role).classList.add('selected');
}

function toggleTag(el) {
  el.classList.toggle('selected');
  const task = el.dataset.task;
  if (el.classList.contains('selected')) {
    if (!STATE.tasks.includes(task)) STATE.tasks.push(task);
  } else {
    STATE.tasks = STATE.tasks.filter(t => t !== task);
  }
}

function selectBudget(budget, el) {
  STATE.budget = budget;
  document.querySelectorAll('.budget-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function nextStep() {
  if (wizardStep === 1) {
    if (!STATE.role) { showToast('Selecciona un perfil para continuar'); return; }
    STATE.area = document.getElementById('area-select').value;
  }
  if (wizardStep === 2 && STATE.tasks.length === 0) {
    showToast('Selecciona al menos una tarea'); return;
  }
  wizardStep++;
  if (wizardStep > 3) { getRecommendations(); return; }
  renderWizardStep();
}

function prevStep() {
  wizardStep--;
  if (wizardStep < 1) { goTo('home'); return; }
  renderWizardStep();
}

function renderWizardStep() {
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step' + wizardStep).classList.add('active');

  for (let i = 1; i <= 3; i++) {
    const wc = document.getElementById('wc' + i);
    const sl = document.getElementById('sl' + i);
    wc.className = 'wc';
    if (i < wizardStep) {
      wc.className = 'wc done';
      wc.textContent = '';
    } else if (i === wizardStep) {
      wc.className = 'wc active';
      wc.textContent = i;
    } else {
      wc.textContent = i;
    }
    sl.className = i === wizardStep ? 'active-label' : '';
  }

  for (let i = 1; i <= 2; i++) {
    document.getElementById('wl' + i).className = i < wizardStep ? 'wc-line done' : 'wc-line';
  }
}

// ─── RECOMMENDATION ALGORITHM ─────────────────────────────────────────────────
function scoreTool(tool) {
  let score = 0;

  if (STATE.tasks.length > 0) {
    const matched = STATE.tasks.filter(t => tool.tasks.includes(t)).length;
    score += (matched / STATE.tasks.length) * 50;
  }

  if (tool.roles.includes(STATE.role)) score += 30;

  const budgetOk = tool.budget.includes(STATE.budget) ||
    (STATE.budget === 'medium' && (tool.budget.includes('low') || tool.budget.includes('free'))) ||
    (STATE.budget === 'low'    && tool.budget.includes('free'));
  if (budgetOk) score += 20;

  return Math.round(score);
}

function getRecommendations() {
  const scored = TOOLS.map(t => ({ ...t, score: scoreTool(t) }))
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score);

  STATE.currentResults = scored.length > 0 ? scored : TOOLS.map(t => ({ ...t, score: 10 }));
  STATE.sortMode = 'match';

  const entry = {
    id:     Date.now(),
    role:   STATE.role,
    area:   STATE.area,
    tasks:  [...STATE.tasks],
    budget: STATE.budget,
    date:   new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  };
  STATE.history.unshift(entry);
  if (STATE.history.length > 10) STATE.history.pop();

  if (AUTH.user) {
    saveUserData();
  } else {
    sessionStorage.setItem('orientaia_history', JSON.stringify(STATE.history));
  }

  goTo('results');
  renderResults();
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
function renderResults() {
  const ROLE_LABELS = { estudiante: '🎓 Estudiante', profesional: '💼 Profesional', empresa: '🏢 Empresa', emprendedor: '🚀 Emprendedor' };
  const TASK_LABELS = { writing: 'Escritura', analysis: 'Análisis', code: 'Código', design: 'Diseño',
    presentations: 'Presentaciones', research: 'Investigación', automation: 'Automatización',
    translation: 'Traducción', audio_video: 'Audio/Video', communication: 'Comunicación' };

  const meta = document.getElementById('results-meta');
  meta.innerHTML = '';
  if (STATE.role) meta.innerHTML += `<span class="meta-tag role-tag">${ROLE_LABELS[STATE.role]}</span>`;
  STATE.tasks.forEach(t => {
    meta.innerHTML += `<span class="meta-tag">${TASK_LABELS[t] || t}</span>`;
  });

  document.getElementById('results-subtitle').textContent =
    `${STATE.currentResults.length} herramientas encontradas para tu perfil`;

  let sorted = [...STATE.currentResults];
  if (STATE.sortMode === 'free') sorted.sort((a, b) => (b.hasFree ? 1 : 0) - (a.hasFree ? 1 : 0));
  if (STATE.sortMode === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById('tools-grid').innerHTML = sorted.map(t => buildToolCard(t, true)).join('');

  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sort-' + STATE.sortMode).classList.add('active');
}

function sortResults(mode) {
  STATE.sortMode = mode;
  renderResults();
}

// ─── TOOL CARD BUILDER ────────────────────────────────────────────────────────
function buildToolCard(tool, showScore) {
  const isFav = STATE.favorites.includes(tool.id);
  const scoreHtml = showScore ? `
    <div class="match-bar-wrap">
      <div class="match-bar-label">Coincidencia con tu perfil</div>
      <div class="match-bar"><div class="match-bar-fill" style="width:${tool.score || 50}%"></div></div>
    </div>` : '';

  return `
    <div class="tool-card" onclick="openTool('${tool.id}')">
      <div class="tool-card-top">
        <div class="tool-logo">${tool.emoji}</div>
        <button class="fav-btn ${isFav ? 'active' : ''}"
          onclick="toggleFavorite(event,'${tool.id}')"
          title="${isFav ? 'Quitar de favoritos' : 'Guardar'}">${isFav ? '♥' : '♡'}</button>
      </div>
      <div class="tool-name">${tool.name}</div>
      <div class="tool-category">${tool.category}</div>
      <div class="tool-desc">${tool.desc}</div>
      <div class="tool-tags">${tool.tags.map(t => `<span class="tool-tag">${t}</span>`).join('')}</div>
      <div class="tool-footer">
        ${showScore ? `<span class="score-badge">${tool.score || 50}% match</span>` : '<span></span>'}
        <span class="price-badge ${tool.hasFree ? 'free' : ''}">${tool.hasFree ? '🆓 Gratis disponible' : '💳 De pago'}</span>
      </div>
      ${scoreHtml}
    </div>`;
}

// ─── DETAIL PAGE ──────────────────────────────────────────────────────────────
function openTool(id) {
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) return;
  STATE.currentTool = id;

  const isFav     = STATE.favorites.includes(id);
  const plansHtml = tool.plans.map(p => `
    <div class="plan-card ${p.highlight ? 'highlight' : ''}">
      <div class="plan-name">${p.name}</div>
      <div class="plan-price">${p.price}</div>
      <div class="plan-desc">${p.desc}</div>
    </div>`).join('');

  const howHtml = tool.howTo.map(step => `
    <div class="how-step">
      <div class="step-num"></div>
      <p>${step}</p>
    </div>`).join('');

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-hero">
      <div class="detail-logo">${tool.emoji}</div>
      <div class="detail-info">
        <h1>${tool.name}</h1>
        <div class="detail-cat">${tool.category} · ${tool.developer}</div>
        <div class="detail-badges">
          ${tool.hasFree
            ? '<span class="badge badge-green">🆓 Gratis disponible</span>'
            : '<span class="badge badge-orange">💳 Solo de pago</span>'}
          <span class="badge badge-gray">${tool.priceFree || tool.pricePaid}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>¿Qué es ${tool.name}?</h3>
      <p>${tool.desc}</p>
    </div>

    <div class="detail-section">
      <h3>Ventajas y limitaciones</h3>
      <div class="pros-cons">
        <div class="pros-list"><h4>✅ Ventajas</h4><ul>${tool.pros.map(p => `<li>${p}</li>`).join('')}</ul></div>
        <div class="cons-list"><h4>⚠️ Limitaciones</h4><ul>${tool.cons.map(c => `<li>${c}</li>`).join('')}</ul></div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Casos de uso principales</h3>
      <div class="use-cases-grid">${tool.useCases.map(u => `<div class="use-case-item">${u}</div>`).join('')}</div>
    </div>

    <div class="detail-section">
      <h3>Planes y precios</h3>
      <div class="plans-grid">${plansHtml}</div>
    </div>

    <div class="detail-section">
      <h3>Cómo empezar paso a paso</h3>
      <div class="how-to-steps">${howHtml}</div>
    </div>

    <div class="detail-cta">
      <button class="btn-primary" onclick="window.open('${tool.link}', '_blank')">Ir a ${tool.name} →</button>
      <button class="btn-outline ${isFav ? 'active' : ''}" id="detail-fav-btn"
        onclick="toggleFavoriteDetail('${tool.id}')">
        ${isFav ? '♥ Guardado' : '♡ Guardar herramienta'}
      </button>
    </div>`;

  goTo('detail');
}

function toggleFavoriteDetail(id) {
  toggleFavoriteById(id);
  const isFav = STATE.favorites.includes(id);
  const btn   = document.getElementById('detail-fav-btn');
  if (btn) btn.innerHTML = isFav ? '♥ Guardado' : '♡ Guardar herramienta';
}

// ─── FAVORITES ────────────────────────────────────────────────────────────────
function toggleFavorite(event, id) {
  event.stopPropagation();
  toggleFavoriteById(id);
  const isFav = STATE.favorites.includes(id);
  event.currentTarget.textContent = isFav ? '♥' : '♡';
  event.currentTarget.classList.toggle('active', isFav);
  showToast(isFav ? '⭐ Guardado en favoritos' : 'Quitado de favoritos');
}

function toggleFavoriteById(id) {
  if (STATE.favorites.includes(id)) {
    STATE.favorites = STATE.favorites.filter(f => f !== id);
  } else {
    STATE.favorites.push(id);
  }
  if (AUTH.user) {
    saveUserData();
  } else {
    sessionStorage.setItem('orientaia_favs', JSON.stringify(STATE.favorites));
  }
}

// ─── CATALOG ──────────────────────────────────────────────────────────────────
let catalogFilter = 'all';

function renderCatalog() { filterCatalog(); }

function setCatalogFilter(el, filter) {
  catalogFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterCatalog();
}

function filterCatalog() {
  const query = (document.getElementById('catalog-search')?.value || '').toLowerCase();
  let filtered = TOOLS;

  if (catalogFilter !== 'all') {
    filtered = catalogFilter === 'free'
      ? filtered.filter(t => t.hasFree)
      : filtered.filter(t => t.tasks.includes(catalogFilter));
  }

  if (query) {
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.desc.toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  grid.innerHTML = filtered.length === 0
    ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--ink2)">No se encontraron herramientas con ese criterio.</div>'
    : filtered.map(t => buildToolCard({ ...t, score: null }, false)).join('');
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
const ROLE_LABELS_FULL = { estudiante: 'Estudiante', profesional: 'Profesional', empresa: 'Empresa/Equipo', emprendedor: 'Emprendedor' };
const ROLE_LABELS_ICON = { estudiante: '🎓 Estudiante', profesional: '💼 Profesional', empresa: '🏢 Empresa', emprendedor: '🚀 Emprendedor' };
const TASK_LABELS_FULL = { writing: 'Escritura', analysis: 'Análisis', code: 'Código', design: 'Diseño',
  presentations: 'Presentaciones', research: 'Investigación', automation: 'Automatización',
  translation: 'Traducción', audio_video: 'Audio/Video', communication: 'Comunicación' };

function renderProfile() {
  // Account card or guest banner
  const banner = document.getElementById('profile-auth-banner');
  if (AUTH.user) {
    const initials = AUTH.user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    banner.innerHTML = `
      <div class="account-card">
        <div class="account-card-left">
          <div class="account-avatar">${initials}</div>
          <div>
            <div class="account-name">${AUTH.user.name}</div>
            <div class="account-email">${AUTH.user.email}</div>
          </div>
        </div>
        <button class="btn-logout" onclick="logout()">Cerrar sesión</button>
      </div>`;
  } else {
    banner.innerHTML = `
      <div class="auth-banner">
        <div class="auth-banner-text">
          <h4>Crea tu cuenta gratuita</h4>
          <p>Guarda tus herramientas favoritas y tu historial de búsquedas entre sesiones.</p>
        </div>
        <div class="auth-banner-btns">
          <button class="btn-primary" onclick="openAuth('register')">Crear cuenta</button>
          <button class="btn-outline" onclick="openAuth('login')">Iniciar sesión</button>
        </div>
      </div>`;
  }

  // Role line
  const roleLine = document.getElementById('profile-role-line');
  roleLine.textContent = STATE.role
    ? `Perfil de búsqueda: ${ROLE_LABELS_FULL[STATE.role]}${STATE.area ? ' · ' + STATE.area : ''}`
    : (AUTH.user ? 'Usa el asistente para guardar tu perfil de búsqueda' : 'Configura tu perfil buscando una herramienta');

  // Favorites
  const favsContainer = document.getElementById('favs-container');
  document.getElementById('favs-count').textContent =
    `${STATE.favorites.length} guardada${STATE.favorites.length !== 1 ? 's' : ''}`;

  if (STATE.favorites.length === 0) {
    favsContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">⭐</div>
      <p>Aún no has guardado ninguna herramienta.<br>Haz clic en el corazón de cualquier resultado para guardarla aquí.</p></div>`;
  } else {
    favsContainer.innerHTML = `<div class="favs-list">${STATE.favorites.map(id => {
      const tool = TOOLS.find(t => t.id === id);
      if (!tool) return '';
      return `<div class="fav-tool-card" onclick="openTool('${tool.id}')">
        <div class="fav-tool-logo">${tool.emoji}</div>
        <div class="fav-tool-info">
          <div class="fav-tool-name">${tool.name}</div>
          <div class="fav-tool-cat">${tool.category}</div>
        </div>
        <button class="fav-remove" onclick="removeFav(event,'${tool.id}')" title="Quitar">✕</button>
      </div>`;
    }).join('')}</div>`;
  }

  // History
  const histContainer = document.getElementById('history-container');
  const clearBtn = document.getElementById('clear-history-btn');

  if (STATE.history.length === 0) {
    histContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">🕐</div>
      <p>Tu historial de búsquedas aparecerá aquí.<br>Usa el asistente para buscar herramientas.</p></div>`;
    clearBtn.style.display = 'none';
  } else {
    clearBtn.style.display = '';
    histContainer.innerHTML = `<div class="history-list">${STATE.history.map(h => {
      const taskStr = (h.tasks || []).map(t => TASK_LABELS_FULL[t] || t).join(', ') || 'Sin tareas';
      return `<div class="history-item" onclick="replaySearch(${h.id})">
        <div class="history-item-info">
          <div class="history-item-role">${ROLE_LABELS_ICON[h.role] || h.role}</div>
          <div class="history-item-tasks">${taskStr}</div>
        </div>
        <div class="history-item-date">${h.date}</div>
      </div>`;
    }).join('')}</div>`;
  }
}

function removeFav(event, id) {
  event.stopPropagation();
  toggleFavoriteById(id);
  renderProfile();
  showToast('Quitado de favoritos');
}

function clearHistory() {
  STATE.history = [];
  if (AUTH.user) {
    saveUserData();
  } else {
    sessionStorage.removeItem('orientaia_history');
  }
  renderProfile();
  showToast('Historial borrado');
}

function replaySearch(histId) {
  const entry = STATE.history.find(h => h.id === histId);
  if (!entry) return;
  STATE.role   = entry.role;
  STATE.area   = entry.area;
  STATE.tasks  = [...entry.tasks];
  STATE.budget = entry.budget;
  getRecommendations();
}

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────
function sendFeedback(type) {
  const msgs = {
    excelente:   '😍 ¡Gracias! Nos alegra que te sirva.',
    buena:       '👍 ¡Gracias por tu respuesta!',
    mejorar:     '💡 Anotado. ¡Trabajaremos en mejorar!',
    sugerencia:  '✍️ Escríbenos a orientaia@gmail.com con tu sugerencia.'
  };
  showToast(msgs[type] || '¡Gracias!');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
initAuth();
renderWizardStep();
