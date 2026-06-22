// ponytail: flat dict, pub/sub for React + vanilla, localStorage persistence
const STORAGE_KEY = 'locale';

const listeners = new Set();
const isBrowser = typeof window !== 'undefined';
let current = isBrowser ? (localStorage.getItem(STORAGE_KEY) || 'en') : 'en';
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
    nav: { HOME: 'HOME', ABOUT: 'ABOUT', SKILLS: 'SKILLS', WORK: 'WORK', CONTACT: 'CONTACT' },

    // section titles (index.astro overlays)
    sections: {
      welcome:  { eyebrow: null, main: 'XAKON.DEV', sub: 'FULLSTACK / AI FIRST ENGINEER', desc: null },
      about:    { eyebrow: '01 / ABOUT', main: 'TACTILE WEB', sub: 'DESIGNING INTERACTIONS', desc: 'Frontend developer focused on creative coding, WebGL, physics-driven UI, and premium motion.' },
      skills:   { eyebrow: '02 / STACK', main: 'GRAPHICS + UI', sub: 'THREE.JS / REACT / ASTRO', desc: 'WebGL, GLSL, Three.js, React, TypeScript, audio systems, procedural animation.' },
      experience:{ eyebrow: '03 / WORK', main: 'CASE ORBIT', sub: 'VOXEL / SHADER / AUDIO', list: ['Voxel terrain engine', 'GLSL raymarch playground', 'Spatial synth interface'] },
      contact:  { eyebrow: '04 / CONTACT', main: 'SIGNAL MODE', sub: 'TRANSMISSION CHANNELS' },
      voxel:    { eyebrow: 'CASE / VOXEL', main: 'VOXEL ENGINE', sub: 'REAL-TIME BROWSER ENGINE', desc: 'Chunk terrain, dynamic occlusion culling, custom physics, 60 FPS WebGL rendering.' },
      shader:   { eyebrow: 'CASE / SHADER', main: 'RAYMARCHER', sub: 'SDF RENDERER PLAYGROUND', desc: 'Morphing metallic fields, soft shadows, and ambient occlusion in custom GLSL.' },
      audio:    { eyebrow: 'CASE / AUDIO', main: 'SPATIAL SYNTH', sub: 'WEB AUDIO API', desc: 'FM synthesis, LFOs, and gain envelopes driven by canvas interactions.' },
    },

    // GlassBoard data
    portfolio: {
      welcome:   { eyebrow: '00 / PORTFOLIO', title: 'HAKON', subtitle: 'FULLSTACK / AI FIRST ENGINEER', body: '', footer: 'CLICK A FACE OR PICK A SECTION' },
      about:     { eyebrow: '01 / ABOUT', title: 'TACTILE WEB', subtitle: 'DESIGNING INTERACTIONS', body: 'Frontend developer focused on creative coding, WebGL, physics-driven UI, and premium motion.', footer: 'CUBE FACE: TOP' },
      skills:    { eyebrow: '02 / STACK', title: 'GRAPHICS + UI', subtitle: 'THREE.JS / REACT / ASTRO', body: 'WebGL, GLSL, Three.js, React, TypeScript, audio systems, procedural animation.', footer: 'CUBE FACE: RIGHT' },
      experience:{ eyebrow: '03 / WORK', title: 'CASE ORBIT', subtitle: 'VOXEL / SHADER / AUDIO', body: '[01] Voxel terrain engine\n[02] GLSL raymarch playground\n[03] Spatial synth interface', footer: 'WORK CAROUSEL / CAMERA ORBIT' },
      contact:   { eyebrow: '04 / CONTACT', title: 'SIGNAL MODE', subtitle: 'TRANSMISSION CHANNELS', body: '', footer: 'READY TO RECEIVE' },
      voxel:     { eyebrow: 'CASE / VOXEL', title: 'VOXEL ENGINE', subtitle: 'REAL-TIME BROWSER ENGINE', body: 'Chunk terrain, dynamic occlusion culling, custom physics, 60 FPS WebGL rendering.', footer: 'FLOOR PIECE / CORNER' },
      shader:    { eyebrow: 'CASE / SHADER', title: 'RAYMARCHER', subtitle: 'SDF RENDERER PLAYGROUND', body: 'Morphing metallic fields, soft shadows, and ambient occlusion in custom GLSL.', footer: 'FLOOR PIECE / EDGE' },
      audio:     { eyebrow: 'CASE / AUDIO', title: 'SPATIAL SYNTH', subtitle: 'WEB AUDIO API', body: 'FM synthesis, LFOs, and gain envelopes driven by canvas interactions.', footer: 'FLOOR PIECE / CENTER' },
    },

    // PortfolioNavigation intro texts
    navIntro: {
      compromised: 'SYSTEM STATUS: DATABASE COMPROMISED / CUBE FRAGMENTED\n\nPlease drag the three floating pieces back into their slots on the main cube to restore database integrity and unlock navigation.',
      restored: 'Welcome to my spatial workshop. I combine WebGL, 3D physics, and SOLID architecture to build immersive digital art and high-performance interactive interfaces.\n\nUse the mouse to explore the room. Click on the central tiles of the Rubik\'s Cube faces or play with the scattered pieces on the floor to navigate the portfolio pages.',
    },

    // HUD minimal texts
    hud: {
      restored: 'HAKON — Fullstack / AI First Engineer',
      compromised: 'Database Compromised — Tap pieces to restore',
      about: 'ABOUT — Designing tactile interactions',
      skills: 'STACK — WebGL, React, Astro',
      experience: 'WORK — Voxel, Shader, Audio Projects',
      lockedHint: 'RESTORE MISSING CUBIES FIRST',
    },

    // lang button
    langLabel: 'RU',
  },

  ru: {
    loader: 'Инициализация 3D…',

    branding: 'XAKON.DEV // ЯДРО',
    subtitle: 'СИСТЕМА // ОНЛАЙН',

    nav: { HOME: 'ГЛАВНАЯ', ABOUT: 'О СЕБЕ', SKILLS: 'СТЕК', WORK: 'ПРОЕКТЫ', CONTACT: 'КОНТАКТ' },

    sections: {
      welcome:  { eyebrow: null, main: 'XAKON.DEV', sub: 'ФУЛЛСТЕК / AI FIRST ИНЖЕНЕР', desc: null },
      about:    { eyebrow: '01 / О СЕБЕ', main: 'ТАКТИЛЬНЫЙ WEB', sub: 'ПРОЕКТИРОВАНИЕ ВЗАИМОДЕЙСТВИЙ', desc: 'Фронтенд-разработчик, увлечённый креативным кодингом, WebGL, физическим UI и премиальным моушном.' },
      skills:   { eyebrow: '02 / СТЕК', main: 'ГРАФИКА + UI', sub: 'THREE.JS / REACT / ASTRO', desc: 'WebGL, GLSL, Three.js, React, TypeScript, аудиосистемы, процедурная анимация.' },
      experience:{ eyebrow: '03 / ПРОЕКТЫ', main: 'ОРБИТА КЕЙСОВ', sub: 'ВОКСЕЛЬ / ШЕЙДЕР / АУДИО', list: ['Воксельный движок террейна', 'GLSL playground рэймарчера', 'Пространственный синт-интерфейс'] },
      contact:  { eyebrow: '04 / КОНТАКТ', main: 'РЕЖИМ СИГНАЛА', sub: 'КАНАЛЫ ПЕРЕДАЧИ' },
      voxel:    { eyebrow: 'КЕЙС / ВОКСЕЛЬ', main: 'ВОКСЕЛЬНЫЙ ДВИЖОК', sub: 'БРАУЗЕРНЫЙ ДВИЖОК РЕАЛЬНОГО ВРЕМЕНИ', desc: 'Чанковый террейн, динамический occlusion culling, кастомная физика, 60 FPS WebGL рендеринг.' },
      shader:   { eyebrow: 'КЕЙС / ШЕЙДЕР', main: 'РЭЙМАРЧЕР', sub: 'SDF РЕНДЕР PLAYGROUND', desc: 'Морфинг металлических полей, мягкие тени и ambient occlusion на кастомном GLSL.' },
      audio:    { eyebrow: 'КЕЙС / АУДИО', main: 'ПРОСТРАНСТВЕННЫЙ СИНТ', sub: 'WEB AUDIO API', desc: 'FM-синтез, LFO и огибающие, управляемые взаимодействиями с canvas.' },
    },

    portfolio: {
      welcome:   { eyebrow: '00 / ПОРТФОЛИО', title: 'HAKON', subtitle: 'ФУЛЛСТЕК / AI FIRST ИНЖЕНЕР', body: '', footer: 'НАЖМИТЕ НА ГРАНЬ ИЛИ ВЫБЕРИТЕ РАЗДЕЛ' },
      about:     { eyebrow: '01 / О СЕБЕ', title: 'ТАКТИЛЬНЫЙ WEB', subtitle: 'ПРОЕКТИРОВАНИЕ ВЗАИМОДЕЙСТВИЙ', body: 'Фронтенд-разработчик, увлечённый креативным кодингом, WebGL, физическим UI и премиальным моушном.', footer: 'ГРАНЬ КУБА: ВЕРХ' },
      skills:    { eyebrow: '02 / СТЕК', title: 'ГРАФИКА + UI', subtitle: 'THREE.JS / REACT / ASTRO', body: 'WebGL, GLSL, Three.js, React, TypeScript, аудиосистемы, процедурная анимация.', footer: 'ГРАНЬ КУБА: ПРАВО' },
      experience:{ eyebrow: '03 / ПРОЕКТЫ', title: 'ОРБИТА КЕЙСОВ', subtitle: 'ВОКСЕЛЬ / ШЕЙДЕР / АУДИО', body: '[01] Воксельный движок террейна\n[02] GLSL playground рэймарчера\n[03] Пространственный синт-интерфейс', footer: 'КАРУСЕЛЬ РАБОТ / КАМЕРА ПО ОРБИТЕ' },
      contact:   { eyebrow: '04 / КОНТАКТ', title: 'РЕЖИМ СИГНАЛА', subtitle: 'КАНАЛЫ ПЕРЕДАЧИ', body: '', footer: 'ГОТОВ К ПРИЁМУ' },
      voxel:     { eyebrow: 'КЕЙС / ВОКСЕЛЬ', title: 'ВОКСЕЛЬНЫЙ ДВИЖОК', subtitle: 'БРАУЗЕРНЫЙ ДВИЖОК РЕАЛЬНОГО ВРЕМЕНИ', body: 'Чанковый террейн, динамический occlusion culling, кастомная физика, 60 FPS WebGL рендеринг.', footer: 'ДЕТАЛЬ НА ПОЛУ / УГОЛ' },
      shader:    { eyebrow: 'КЕЙС / ШЕЙДЕР', title: 'РЭЙМАРЧЕР', subtitle: 'SDF РЕНДЕР PLAYGROUND', body: 'Морфинг металлических полей, мягкие тени и ambient occlusion на кастомном GLSL.', footer: 'ДЕТАЛЬ НА ПОЛУ / РЕБРО' },
      audio:     { eyebrow: 'КЕЙС / АУДИО', title: 'ПРОСТРАНСТВЕННЫЙ СИНТ', subtitle: 'WEB AUDIO API', body: 'FM-синтез, LFO и огибающие, управляемые взаимодействиями с canvas.', footer: 'ДЕТАЛЬ НА ПОЛУ / ЦЕНТР' },
    },

    navIntro: {
      compromised: 'СТАТУС СИСТЕМЫ: БАЗА ДАННЫХ СКОМПРОМЕТИРОВАНА / КУБ ФРАГМЕНТИРОВАН\n\nПеретащите три летающих фрагмента обратно в слоты на главном кубе, чтобы восстановить целостность базы данных и разблокировать навигацию.',
      restored: 'Добро пожаловать в мою пространственную мастерскую. Я сочетаю WebGL, 3D-физику и SOLID-архитектуру для создания иммерсивного цифрового искусства и высокопроизводительных интерактивных интерфейсов.\n\nИспользуйте мышь для исследования комнаты. Нажимайте на центральные плитки граней кубика Рубика или играйте с разбросанными деталями на полу для навигации по портфолио.',
    },

    hud: {
      restored: 'HAKON — Фуллстек / AI First инженер',
      compromised: 'База данных скомпрометирована — коснитесь деталей для восстановления',
      about: 'О СЕБЕ — Проектирование тактильных взаимодействий',
      skills: 'СТЕК — WebGL, React, Astro',
      experience: 'ПРОЕКТЫ — Воксель, Шейдер, Аудио',
      lockedHint: 'СНАЧАЛА ВОССТАНОВИТЕ НЕДОСТАЮЩИЕ ФРАГМЕНТЫ',
    },

    langLabel: 'EN',
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

