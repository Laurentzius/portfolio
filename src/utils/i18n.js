// ponytail: flat dict, pub/sub for React + vanilla, localStorage persistence
const STORAGE_KEY = 'locale';

const listeners = new Set();
const isBrowser = typeof window !== 'undefined';
// ponytail: start at 'en' so SSR HTML and first client render match (no React hydration
// mismatch); the stored locale is applied post-mount via initStoredLocale().
let current = 'en';
if (isBrowser) document.documentElement.lang = current;


export function getLocale() {
  return current;
}

export function setLocale(locale) {
  if (locale === current) return;
  current = locale;
  if (isBrowser) {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = current;
    window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: current } }));
  }
  for (const fn of listeners) fn(current);
}
export function toggleLocale() {
  setLocale(current === 'en' ? 'ru' : 'en');
}

/**
 * Apply the locale persisted in localStorage. Call after mount so the first client
 * render matches the server render and React does not regenerate the tree.
 */
export function initStoredLocale() {
  if (!isBrowser) return;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored !== current) setLocale(stored);
}

export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Translations ──────────────────────────────────────────────

const t = {
  en: {
    // loader
    loader: 'Initializing 3D…',

    // HUD header
    branding: 'XAKON.DEV // CORE',
    subtitle: 'SYSTEM // ONLINE',

    // nav labels
    nav: { welcome: 'HOME', about: 'ABOUT', skills: 'SKILLS', experience: 'PROJECTS', contact: 'CONTACT' },

    // section titles (index.astro overlays)
    sections: {
      welcome:  { eyebrow: null, main: 'XAKON.DEV', sub: 'FULLSTACK / AI FIRST ENGINEER', desc: null },
      about:    { eyebrow: '01 / ABOUT', main: 'AI-FIRST ENGINEER', sub: 'IDEA → PRODUCTION', desc: 'I build AI-powered products end to end — LLM agents, RAG pipelines, voice interfaces — and the backend, frontend, and infrastructure that ship them.' },
      skills:   { eyebrow: '02 / SKILLS', main: 'SKILLS', sub: 'AI-AUGMENTED', desc: 'Python, TypeScript, Go, Elixir. React, Next.js, Svelte, Vue, Astro, Tailwind. FastAPI, Node.js, gRPC, WebSockets. PostgreSQL, Redis, Qdrant, ClickHouse. Gemini, Claude, Langfuse. Docker, Kubernetes, Sentry.' },
      experience:{ eyebrow: '03 / PROJECTS', main: 'PROJECTS', sub: 'LIVE / OPEN SOURCE', list: [
        'Turnkey web development agency',
        'Clothing brand online store',
        'AI customs: HS code classification, duty calc, docs',
        'Reusable work-skills framework for AI agents',
        'Voice AI assistant for a vet clinic chain',
      ] },
      contact:  { eyebrow: '04 / CONTACT', main: 'GET IN TOUCH', sub: 'TELEGRAM · GITHUB', desc: 'Open to AI engineering and product roles. Tap the floating models to reach me, or grab the CV from the About section.' },
      voxel:    { eyebrow: 'CASE / VOXEL', main: 'VOXEL ENGINE', sub: 'REAL-TIME BROWSER ENGINE', desc: 'Chunk terrain, dynamic occlusion culling, custom physics, 60 FPS WebGL rendering.' },
      shader:   { eyebrow: 'CASE / SHADER', main: 'RAYMARCHER', sub: 'SDF RENDERER PLAYGROUND', desc: 'Morphing metallic fields, soft shadows, and ambient occlusion in custom GLSL.' },
      audio:    { eyebrow: 'CASE / AUDIO', main: 'SPATIAL SYNTH', sub: 'WEB AUDIO API', desc: 'FM synthesis, LFOs, and gain envelopes driven by canvas interactions.' },
    },

    // GlassBoard data
    portfolio: {
      welcome:   { eyebrow: '00 / PORTFOLIO', title: 'HAKON', subtitle: 'FULLSTACK / AI FIRST ENGINEER', body: '', footer: 'CLICK A FACE OR PICK A SECTION' },
      about:     { eyebrow: '01 / ABOUT', title: 'AI-FIRST ENGINEER', subtitle: 'IDEA → PRODUCTION', body: 'I build AI-powered products end to end — LLM agents, RAG pipelines, voice interfaces — and the backend, frontend, and infrastructure that ship them.', footer: 'CUBE FACE: TOP' },
      skills:    { eyebrow: '02 / SKILLS', title: 'SKILLS', subtitle: 'AI-AUGMENTED', body: 'Python, TypeScript, Go, Elixir. React, Next.js, Svelte, Vue, Astro, Tailwind. FastAPI, Node.js, gRPC, WebSockets. PostgreSQL, Redis, Qdrant, ClickHouse. Gemini, Claude, Langfuse. Docker, Kubernetes, Sentry.', footer: 'CUBE FACE: RIGHT' },
      experience:{ eyebrow: '03 / PROJECTS', title: 'PROJECTS', subtitle: 'LIVE / OPEN SOURCE', body: '[01] AndartIT — andartit.gamerzero.dev\n[02] Provogatto — provogatto.com\n[03] Smartkeden — AI customs assistant\n[04] Flow-skills — work skills framework\n[05] Vetvoice — voice AI for vet clinics', footer: 'OPEN LINKS TO EXPLORE' },
      contact:   { eyebrow: '04 / CONTACT', title: 'GET IN TOUCH', subtitle: 'TELEGRAM · GITHUB', body: 'Open to AI engineering and product roles. Tap the floating models to reach me on Telegram or GitHub.', footer: 'CUBE FACE: LEFT' },
      voxel:     { eyebrow: 'CASE / VOXEL', title: 'VOXEL ENGINE', subtitle: 'REAL-TIME BROWSER ENGINE', body: 'Chunk terrain, dynamic occlusion culling, custom physics, 60 FPS WebGL rendering.', footer: 'FLOOR PIECE / CORNER' },
      shader:    { eyebrow: 'CASE / SHADER', title: 'RAYMARCHER', subtitle: 'SDF RENDERER PLAYGROUND', body: 'Morphing metallic fields, soft shadows, and ambient occlusion in custom GLSL.', footer: 'FLOOR PIECE / EDGE' },
      audio:     { eyebrow: 'CASE / AUDIO', title: 'SPATIAL SYNTH', subtitle: 'WEB AUDIO API', body: 'FM synthesis, LFOs, and gain envelopes driven by canvas interactions.', footer: 'FLOOR PIECE / CENTER' },
    },

    // PortfolioNavigation intro texts
    navIntro: {
      compromised: 'SYSTEM STATUS: DATABASE COMPROMISED / CUBE FRAGMENTED\n\nPlease drag the three floating pieces back into their slots on the main cube to restore database integrity and unlock navigation.',
      restored: 'Welcome to my spatial workshop. I\'m a fullstack engineer — I build products end-to-end, from database to UI, and use AI to move fast without cutting corners on architecture.\n\nUse the mouse to explore the room. Click on the central tiles of the Rubik\'s Cube faces or play with the scattered pieces on the floor to navigate the portfolio pages.',
    },

    // HUD minimal texts
    hud: {
      restored: 'HAKON — Fullstack / AI First Engineer',
      compromised: 'Database Compromised — Tap pieces to restore',
      about: 'ABOUT — Idea to production',
      skills: 'SKILLS — Python, TS, Go, React',
      experience: 'PROJECTS — 5 builds',
    },

    // lang button
    langLabel: 'RU',
    cvLabel: 'Download CV ↓',
  },

  ru: {
    loader: 'Инициализация 3D…',

    branding: 'XAKON.DEV // ЯДРО',
    subtitle: 'СИСТЕМА // ОНЛАЙН',

    nav: { welcome: 'ГЛАВНАЯ', about: 'О СЕБЕ', skills: 'НАВЫКИ', experience: 'ПРОЕКТЫ', contact: 'КОНТАКТ' },

    sections: {
      welcome:  { eyebrow: null, main: 'XAKON.DEV', sub: 'ФУЛЛСТЕК / AI FIRST ИНЖЕНЕР', desc: null },
      about:    { eyebrow: '01 / О СЕБЕ', main: 'AI-FIRST ИНЖЕНЕР', sub: 'ИДЕЯ → ПРОДАКШН', desc: 'Строю AI-продукты полного цикла — LLM-агенты, RAG-пайплайны, голосовые интерфейсы — и бэкенд, фронтенд и инфраструктуру для них.' },
      skills:   { eyebrow: '02 / НАВЫКИ', main: 'НАВЫКИ', sub: 'AI-AUGMENTED', desc: 'Python, TypeScript, Go, Elixir. React, Next.js, Svelte, Vue, Astro, Tailwind. FastAPI, Node.js, gRPC, WebSockets. PostgreSQL, Redis, Qdrant, ClickHouse. Gemini, Claude, Langfuse. Docker, Kubernetes, Sentry.' },
      experience:{ eyebrow: '03 / ПРОЕКТЫ', main: 'ПРОЕКТЫ', sub: 'ЖИВЫЕ / OPEN SOURCE', list: [
        'Веб-агентство разработки под ключ',
        'Магазин одежды',
        'AI-таможня: классификация кодов ТН ВЭД, пошлины, документы',
        'Фреймворк скиллов для AI-агентов',
        'Голосовой ИИ-ассистент для сети ветклиник',
      ] },
      contact:  { eyebrow: '04 / КОНТАКТ', main: 'НА СВЯЗИ', sub: 'TELEGRAM · GITHUB', desc: 'Открыт к AI-инжинирингу и продуктовым ролям. Нажмите на плавающие модели или скачайте резюме в разделе «О себе».' },
      voxel:    { eyebrow: 'КЕЙС / ВОКСЕЛЬ', main: 'ВОКСЕЛЬНЫЙ ДВИЖОК', sub: 'БРАУЗЕРНЫЙ ДВИЖОК РЕАЛЬНОГО ВРЕМЕНИ', desc: 'Чанковый террейн, динамический occlusion culling, кастомная физика, 60 FPS WebGL рендеринг.' },
      shader:   { eyebrow: 'КЕЙС / ШЕЙДЕР', main: 'РЭЙМАРЧЕР', sub: 'SDF РЕНДЕР PLAYGROUND', desc: 'Морфинг металлических полей, мягкие тени и ambient occlusion на кастомном GLSL.' },
      audio:    { eyebrow: 'КЕЙС / АУДИО', main: 'ПРОСТРАНСТВЕННЫЙ СИНТ', sub: 'WEB AUDIO API', desc: 'FM-синтез, LFO и огибающие, управляемые взаимодействиями с canvas.' },
    },

    portfolio: {
      welcome:   { eyebrow: '00 / ПОРТФОЛИО', title: 'HAKON', subtitle: 'ФУЛЛСТЕК / AI FIRST ИНЖЕНЕР', body: '', footer: 'НАЖМИТЕ НА ГРАНЬ ИЛИ ВЫБЕРИТЕ РАЗДЕЛ' },
      about:     { eyebrow: '01 / О СЕБЕ', title: 'AI-FIRST ИНЖЕНЕР', subtitle: 'ИДЕЯ → ПРОДАКШН', body: 'Строю AI-продукты полного цикла — LLM-агенты, RAG-пайплайны, голосовые интерфейсы — и бэкенд, фронтенд и инфраструктуру для них.', footer: 'ГРАНЬ КУБА: ВЕРХ' },
      skills:    { eyebrow: '02 / НАВЫКИ', title: 'НАВЫКИ', subtitle: 'AI-AUGMENTED', body: 'Python, TypeScript, Go, Elixir. React, Next.js, Svelte, Vue, Astro, Tailwind. FastAPI, Node.js, gRPC, WebSockets. PostgreSQL, Redis, Qdrant, ClickHouse. Gemini, Claude, Langfuse. Docker, Kubernetes, Sentry.', footer: 'ГРАНЬ КУБА: ПРАВО' },
      experience:{ eyebrow: '03 / ПРОЕКТЫ', title: 'ПРОЕКТЫ', subtitle: 'ЖИВЫЕ / OPEN SOURCE', body: '[01] AndartIT — andartit.gamerzero.dev\n[02] Provogatto — provogatto.com\n[03] Smartkeden — AI-таможня\n[04] Flow-skills — фреймворк скиллов\n[05] Vetvoice — голосовой ИИ для ветклиник', footer: 'ОТКРОЙТЕ ССЫЛКИ' },
      contact:   { eyebrow: '04 / КОНТАКТ', title: 'НА СВЯЗИ', subtitle: 'TELEGRAM · GITHUB', body: 'Открыт к AI-инжинирингу и продуктовым ролям. Нажмите на плавающие модели — Telegram или GitHub.', footer: 'ГРАНЬ КУБА: ЛЕВО' },
      voxel:     { eyebrow: 'КЕЙС / ВОКСЕЛЬ', title: 'ВОКСЕЛЬНЫЙ ДВИЖОК', subtitle: 'БРАУЗЕРНЫЙ ДВИЖОК РЕАЛЬНОГО ВРЕМЕНИ', body: 'Чанковый террейн, динамический occlusion culling, кастомная физика, 60 FPS WebGL рендеринг.', footer: 'ДЕТАЛЬ НА ПОЛУ / УГОЛ' },
      shader:    { eyebrow: 'КЕЙС / ШЕЙДЕР', title: 'РЭЙМАРЧЕР', subtitle: 'SDF РЕНДЕР PLAYGROUND', body: 'Морфинг металлических полей, мягкие тени и ambient occlusion на кастомном GLSL.', footer: 'ДЕТАЛЬ НА ПОЛУ / РЕБРО' },
      audio:     { eyebrow: 'КЕЙС / АУДИО', title: 'ПРОСТРАНСТВЕННЫЙ СИНТ', subtitle: 'WEB AUDIO API', body: 'FM-синтез, LFO и огибающие, управляемые взаимодействиями с canvas.', footer: 'ДЕТАЛЬ НА ПОЛУ / ЦЕНТР' },
    },

    navIntro: {
      compromised: 'СТАТУС СИСТЕМЫ: БАЗА ДАННЫХ СКОМПРОМЕТИРОВАНА / КУБ ФРАГМЕНТИРОВАН\n\nПеретащите три летающих фрагмента обратно в слоты на главном кубе, чтобы восстановить целостность базы данных и разблокировать навигацию.',
      restored: 'Добро пожаловать в мою пространственную мастерскую. Я фуллстек-инженер — строю продукты полного цикла, от базы данных до UI, и использую AI, чтобы двигаться быстро, не экономя на архитектуре.\n\nИспользуйте мышь для исследования комнаты. Нажимайте на центральные плитки граней кубика Рубика или играйте с разбросанными деталями на полу для навигации по портфолио.',
    },

    hud: {
      restored: 'HAKON — Фуллстек / AI First инженер',
      compromised: 'База данных скомпрометирована — коснитесь деталей для восстановления',
      about: 'О СЕБЕ — От идеи к продакшну',
      skills: 'НАВЫКИ — Python, TS, Go, React',
      experience: 'ПРОЕКТЫ — 5 сборок',
    },

    langLabel: 'EN',
    cvLabel: 'Резюме ↓',
  },
};

/**
 * Get a translation value by dot-path key.
 * e.g. t_('sections.about.title') → current locale's value
 */
export function t_(key) {
  const parts = key.split('.');
  let val = t[current];
  for (const p of parts) {
    if (val == null) return key;
    val = val[p];
  }
  return val ?? key;
}

/**
 * Get the raw translations dict for the current locale (useful for bulk reads).
 */
export function tAll() {
  return t[current];
}

