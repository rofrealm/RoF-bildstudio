/* Daten: Filter, Kategorien, Werkzeuge, Effekte, Vorlagen, Sticker, Schriften, Rahmen */

export const PKEYS = ['exposure', 'brightness', 'contrast', 'highlights', 'shadows', 'fade', 'saturation', 'vibrance', 'temperature', 'tint', 'hue',
  'sharpness', 'structure', 'blur', 'grain', 'vignette', 'glow', 'shine', 'light', 'mood', 'flash', 'brilliance', 'refine', 'texture', 'canvas',
  'fresh', 'film', 'ambient', 'rays'];

export const FILTERS = {
  // Produkt & Luxus
  luxus: { n: 'Luxus', contrast: 18, temperature: 12, shadows: -10, vignette: 35, saturation: -5, grade: 22, gs: '#3a1f3d', gh: '#e8b45a', glow: 10 },
  clean: { n: 'Shop Clean', exposure: 10, brightness: 8, contrast: 8, temperature: -6, saturation: -8, highlights: 10, shadows: 15, sharpness: 20 },
  glanz: { n: 'Hochglanz', contrast: 20, structure: 35, vibrance: 25, highlights: -15, shadows: 10, sharpness: 25, shine: 25 },
  champagner: { n: 'Champagner', temperature: 14, brightness: 6, contrast: -5, fade: 10, grade: 25, gs: '#4a3a2a', gh: '#f3dcae', glow: 20 },
  samt: { n: 'Samt', exposure: -8, contrast: 20, saturation: -10, shadows: -15, grade: 35, gs: '#3a1530', gh: '#e6a2b4', vignette: 35 },
  kristall: { n: 'Kristall', temperature: -12, contrast: 15, structure: 30, highlights: 10, saturation: -10, sharpness: 30, shine: 20 },
  gold: { n: 'Gold', temperature: 25, tint: 4, contrast: 15, grade: 35, gs: '#2a1a0a', gh: '#ffcf73', vibrance: 10, vignette: 20 },
  onyx: { n: 'Onyx', contrast: 35, saturation: -40, shadows: -25, grade: 25, gs: '#101010', gh: '#d9b07a', vignette: 40 },
  magazin: { n: 'Magazin', contrast: 25, vibrance: 15, structure: 20, sharpness: 25, highlights: -15 },
  // Warm
  goldstunde: { n: 'Goldene Stunde', temperature: 30, tint: 6, contrast: 10, vibrance: 20, vignette: 15, grade: 22, gs: '#5a3a1a', gh: '#ffc06a', leak: 15 },
  bernstein: { n: 'Bernstein', temperature: 35, saturation: 10, contrast: 15, shadows: -10, grade: 30, gs: '#3a1a05', gh: '#ffb04a' },
  honig: { n: 'Honig', temperature: 22, brightness: 8, fade: 10, vibrance: 15, grade: 20, gs: '#6a4a1a', gh: '#ffe0a0' },
  sunset: { n: 'Abendrot', temperature: 28, tint: 15, contrast: 12, vibrance: 25, leak: 30, grade: 25, gs: '#4a1a3a', gh: '#ff9a5a' },
  toskana: { n: 'Toskana', temperature: 20, saturation: -10, fade: 15, contrast: 5, grade: 20, gs: '#5a3a2a', gh: '#f0c890', grain: 10 },
  zimt: { n: 'Zimt', temperature: 25, saturation: -20, contrast: 10, grade: 30, gs: '#3a1f10', gh: '#e0a070', vignette: 20 },
  // Kühl
  frost: { n: 'Frost', temperature: -30, contrast: 10, saturation: -15, brightness: 6, highlights: 10 },
  eisblau: { n: 'Eisblau', temperature: -40, tint: -5, brightness: 10, saturation: -20, fade: 10, grade: 20, gs: '#1a3a5a', gh: '#d8ecff' },
  ozean: { n: 'Ozean', temperature: -15, contrast: 15, grade: 40, gs: '#0a3a4a', gh: '#a8e0e0', vibrance: 15 },
  morgentau: { n: 'Morgentau', temperature: -10, brightness: 12, contrast: -10, fade: 15, saturation: -10, glow: 15 },
  minze: { n: 'Minze', temperature: -10, tint: -12, brightness: 6, fade: 12, grade: 25, gs: '#1a4a3a', gh: '#c8f0dc' },
  nordisch: { n: 'Nordisch', temperature: -18, saturation: -35, fade: 20, contrast: 5, brightness: 5 },
  // Film & Vintage
  film: { n: 'Film', fade: 25, grain: 30, contrast: -5, saturation: -10, temperature: 6, grade: 16, gs: '#2e4a3a', gh: '#f2d2a2' },
  analog: { n: 'Analog 400', fade: 18, grain: 40, contrast: 10, saturation: -5, temperature: 10, tint: -5, grade: 25, gs: '#1a3a3a', gh: '#f0c890', vignette: 15 },
  retro: { n: 'Retro 70', temperature: 25, saturation: -15, fade: 30, grade: 30, gs: '#4a3a1a', gh: '#f0b070', grain: 25, contrast: -5 },
  sofort: { n: 'Sofortbild', fade: 30, brightness: 10, contrast: -15, temperature: 10, tint: 6, saturation: -15, vignette: 25, grade: 20, gs: '#2a4a4a', gh: '#ffe0b0' },
  vintage: { n: 'Vintage', fade: 30, temperature: 18, saturation: -25, grain: 20, vignette: 30, contrast: -10 },
  verblasst: { n: 'Verblasst', fade: 45, contrast: -20, saturation: -30, brightness: 5 },
  matt: { n: 'Matt', fade: 35, contrast: -10, saturation: -10 },
  sepia: { n: 'Sepia', sepia: 100, contrast: 10, vignette: 25, grain: 10 },
  toaster: { n: 'Toaster', temperature: 30, contrast: 15, vignette: 40, grade: 30, gs: '#3a0a0a', gh: '#ffd090', fade: 10 },
  // Dark Mood
  moody: { n: 'Moody', exposure: -10, contrast: 25, saturation: -25, shadows: -20, vignette: 45, fade: 10 },
  cinematic: { n: 'Cinematic', contrast: 20, grade: 40, gs: '#1f5d6e', gh: '#e09a5a', saturation: -10, vignette: 25 },
  tealorange: { n: 'Teal & Orange', contrast: 25, vibrance: 20, grade: 60, gs: '#0f5f6f', gh: '#ff9a4a', vignette: 20 },
  nachtclub: { n: 'Nachtclub', exposure: -15, contrast: 30, tint: 15, grade: 45, gs: '#2a0a4a', gh: '#ff6ab0', glow: 25, vignette: 40 },
  drama: { n: 'Dramatisch', contrast: 45, structure: 40, saturation: -20, shadows: -15, highlights: -20, vignette: 50 },
  smaragd: { n: 'Smaragd', grade: 34, gs: '#0f4a3a', gh: '#d8f0c8', temperature: -8, contrast: 12 },
  dunkelgold: { n: 'Dunkelgold', exposure: -15, contrast: 30, saturation: -30, grade: 40, gs: '#0a0a0a', gh: '#e0a840', vignette: 45 },
  // Soft & Pastell
  pastell: { n: 'Pastell', brightness: 12, contrast: -20, saturation: -15, fade: 20, tint: 8, temperature: 4 },
  rose: { n: 'Rosé', tint: 18, temperature: 8, brightness: 6, grade: 24, gs: '#5a2a45', gh: '#ffc2d1', saturation: -5 },
  traum: { n: 'Verträumt', blur: 6, brightness: 10, contrast: -10, fade: 15, tint: 6, vignette: 20, glow: 30 },
  pudrig: { n: 'Pudrig', brightness: 10, contrast: -15, saturation: -25, fade: 20, tint: 10, temperature: 6 },
  lavendel: { n: 'Lavendel', tint: 15, temperature: -8, fade: 15, grade: 30, gs: '#3a2a5a', gh: '#e8d0ff', brightness: 6 },
  pfirsich: { n: 'Pfirsich', temperature: 15, tint: 10, brightness: 8, fade: 12, saturation: -5, grade: 20, gs: '#5a3a3a', gh: '#ffd0b0' },
  leuchten: { n: 'Leuchten', glow: 50, brightness: 5, contrast: 5 },
  // Schwarzweiß
  noir: { n: 'Noir', mono: 100, contrast: 40, vignette: 40, grain: 15, shadows: -10 },
  silber: { n: 'Silber', mono: 100, contrast: -5, fade: 15, brightness: 8 },
  graphit: { n: 'Graphit', mono: 100, contrast: 15, fade: 25, grain: 20 },
  hartsw: { n: 'Hart S/W', mono: 100, contrast: 60, structure: 30, shadows: -20, highlights: 15 },
  weichsw: { n: 'Weich S/W', mono: 100, contrast: -15, brightness: 10, glow: 20 },
  selen: { n: 'Selen', mono: 100, contrast: 15, grade: 30, gs: '#1a2a3a', gh: '#e8e0d0' },
  // Kreativ
  lebendig: { n: 'Lebendig', vibrance: 45, saturation: 10, contrast: 15, sharpness: 30 },
  pop: { n: 'Kontrast Pop', contrast: 35, shadows: 10, highlights: -10, sharpness: 40, vibrance: 15 },
  neon: { n: 'Neon', saturation: 40, contrast: 20, hue: -20, glow: 35, tint: 10 },
  leck: { n: 'Lichtleck', leak: 60, temperature: 10, fade: 10 },
  traumwelt: { n: 'Traumwelt', hue: -30, saturation: 20, glow: 30, fade: 10 },
  // Landschaft
  klar: { n: 'Klarer Himmel', temperature: -8, vibrance: 30, contrast: 12, structure: 20, highlights: -20 },
  wald: { n: 'Waldgrün', tint: -8, saturation: 10, grade: 25, gs: '#0f3020', gh: '#d0e8b0', contrast: 10 },
  wueste: { n: 'Wüste', temperature: 25, saturation: -10, contrast: 15, grade: 20, gs: '#5a3010', gh: '#ffd090' },
  alpen: { n: 'Alpen', temperature: -12, structure: 30, contrast: 15, vibrance: 15, highlights: -15 },
  kueste: { n: 'Küste', temperature: -6, brightness: 8, vibrance: 20, fade: 8, grade: 20, gs: '#1a4a5a', gh: '#fff0d0' },
  // Vibe
  y2k: { n: 'Y2K', contrast: 20, saturation: 20, tint: 12, glow: 25, highlights: 10, grade: 25, gs: '#3a1a6a', gh: '#ffb0e0' },
  softgirl: { n: 'Soft Girl', brightness: 10, tint: 12, fade: 15, glow: 20, saturation: -5 },
  vapor: { n: 'Vaporwave', hue: -15, tint: 20, saturation: 20, grade: 40, gs: '#2a1a6a', gh: '#ff8ad8', fade: 10 },
  cleanlook: { n: 'Clean Look', brightness: 8, contrast: -5, saturation: -10, temperature: 5, structure: -10, glow: 10 },
  insta: { n: 'Insta Warm', temperature: 12, contrast: 10, vibrance: 15, fade: 8, highlights: -10, shadows: 10 },
  // Porträt
  teint: { n: 'Weicher Teint', structure: -25, brightness: 6, temperature: 6, tint: 4, glow: 10 },
  natuerlich: { n: 'Natürlich', contrast: 5, vibrance: 8, shadows: 8 },
  studio: { n: 'Studio', contrast: 15, structure: 10, temperature: -4, highlights: -10, vignette: 15 },
  bronze: { n: 'Bronze', temperature: 18, contrast: 12, saturation: 5, grade: 20, gs: '#3a2010', gh: '#f0c080' },
  // Millennials
  cam2013: { n: 'Handy 2013', contrast: 12, saturation: 12, temperature: 8, structure: 15, sharpness: 20, highlights: 15, grain: 8 },
  tumblr: { n: 'Tumblr', fade: 25, temperature: -6, tint: 6, contrast: -5, saturation: -15, vignette: 20, grade: 25, gs: '#2a3a5a', gh: '#ffd8c0' },
  xpro: { n: 'Cross-Process', contrast: 30, grade: 45, gs: '#003a40', gh: '#ffe060', saturation: 15, vignette: 25 },
  lofi: { n: 'Lo-Fi', contrast: 40, saturation: 30, vignette: 45, shadows: -15 },
  webcam: { n: 'Webcam', structure: -20, brightness: 10, tint: -5, temperature: -10, grain: 25, contrast: -10 },
  // Stil
  editorial: { n: 'Editorial', contrast: 22, saturation: -15, structure: 15, highlights: -10, shadows: -5, grade: 15, gs: '#20242a', gh: '#f0e0d0' },
  minimal: { n: 'Minimal', brightness: 10, contrast: -8, saturation: -25, fade: 12 },
  kunst: { n: 'Galerie', saturation: -30, contrast: 15, fade: 15, temperature: 6, grain: 12 },
  // Kino
  wes: { n: 'Pastell-Kino', temperature: 10, tint: 10, saturation: -10, fade: 20, grade: 25, gs: '#3a4a5a', gh: '#ffd0b0', contrast: -5 },
  blade: { n: 'Neonnacht', temperature: -20, tint: 12, contrast: 25, grade: 50, gs: '#082a4a', gh: '#ff7040', vignette: 30 },
  matrix: { n: 'Code Grün', tint: -30, saturation: -30, contrast: 20, grade: 40, gs: '#0a2a0a', gh: '#c0ffb0' },
  western: { n: 'Western', temperature: 30, saturation: -20, contrast: 20, grade: 30, gs: '#3a2010', gh: '#ffc070', grain: 15 },
  nordic: { n: 'Skandi-Krimi', temperature: -20, saturation: -40, contrast: 15, shadows: -10, grade: 20, gs: '#102030', gh: '#d0e0e8' },
  // Film-Simulation
  portra: { n: 'Portra 400', temperature: 8, saturation: -8, contrast: -5, fade: 8, highlights: -10, grade: 15, gs: '#2a3a3a', gh: '#ffe0c0', grain: 12 },
  ektar: { n: 'Ektar 100', saturation: 25, contrast: 15, vibrance: 10, temperature: 4, grain: 6 },
  velvia: { n: 'Velvia 50', saturation: 40, contrast: 25, vibrance: 15, shadows: -10, grain: 5 },
  cinestill: { n: 'CineStill 800T', temperature: -18, tint: 6, contrast: 10, glow: 30, grade: 30, gs: '#0a2a40', gh: '#ffb080', grain: 20 },
  superia: { n: 'Superia 400', tint: -8, saturation: 5, contrast: 8, grade: 20, gs: '#1a3a2a', gh: '#f0e0c0', grain: 15 },
  gold200: { n: 'Gold 200', temperature: 20, saturation: 10, contrast: 8, grade: 20, gs: '#3a2a10', gh: '#ffd890', grain: 15 },
  instax: { n: 'Instax', brightness: 10, contrast: -10, saturation: -10, fade: 20, tint: -6, grade: 15, gs: '#2a4a4a', gh: '#fff0e0' },
  trix: { n: 'Tri-X 400', mono: 100, contrast: 35, grain: 35, structure: 15 },
  hp5: { n: 'HP5 Plus', mono: 100, contrast: 15, grain: 30, fade: 8 },
  // Food
  lecker: { n: 'Appetitlich', temperature: 12, vibrance: 30, contrast: 12, structure: 15, shadows: 10 },
  cafe: { n: 'Café', temperature: 18, saturation: -10, fade: 12, contrast: 8, grade: 20, gs: '#3a2010', gh: '#f0d0a0' },
  frisch: { n: 'Frisch', temperature: -5, vibrance: 25, brightness: 8, sharpness: 20 },
  dessert: { n: 'Dessert', tint: 8, brightness: 8, saturation: 10, glow: 12, temperature: 6 },
  bistro: { n: 'Bistro', contrast: 20, temperature: 15, vignette: 30, shadows: -10 },
  // Träumerisch
  wolke: { n: 'Wolke', brightness: 15, contrast: -20, fade: 20, glow: 35, saturation: -15 },
  feenlicht: { n: 'Feenlicht', glow: 40, tint: 10, temperature: -5, grade: 25, gs: '#2a1a4a', gh: '#ffd0f0' },
  nebel: { n: 'Nebel', fade: 35, contrast: -25, brightness: 10, saturation: -25, blur: 4 }
};

export const FILTER_CATS = [
  ['fav', 'Favoriten', null],
  ['beliebt', 'Beliebt', ['luxus', 'goldstunde', 'cinematic', 'portra', 'rose', 'cam2013', 'champagner', 'moody', 'cinestill', 'editorial', 'noir', 'y2k']],
  ['produkt', 'Produkt & Luxus', ['luxus', 'clean', 'glanz', 'champagner', 'samt', 'kristall', 'gold', 'onyx', 'magazin']],
  ['vintage', 'Vintage', ['film', 'analog', 'retro', 'sofort', 'vintage', 'verblasst', 'matt', 'sepia', 'toaster']],
  ['landschaft', 'Landschaft', ['klar', 'wald', 'wueste', 'alpen', 'kueste', 'goldstunde', 'frost', 'ozean']],
  ['dark', 'Dark Mood', ['moody', 'nachtclub', 'drama', 'smaragd', 'dunkelgold', 'onyx', 'samt', 'blade']],
  ['vibe', 'Vibe', ['y2k', 'softgirl', 'vapor', 'cleanlook', 'insta', 'neon', 'lebendig', 'pop']],
  ['portraet', 'Porträt', ['teint', 'natuerlich', 'studio', 'bronze', 'pfirsich', 'pudrig', 'rose']],
  ['millennials', 'Millennials', ['cam2013', 'tumblr', 'xpro', 'lofi', 'webcam', 'sofort']],
  ['stil', 'Stil', ['editorial', 'minimal', 'kunst', 'magazin', 'nordisch', 'pastell']],
  ['kino', 'Kino', ['cinematic', 'tealorange', 'wes', 'blade', 'matrix', 'western', 'nordic']],
  ['sw', 'S/W', ['noir', 'silber', 'graphit', 'hartsw', 'weichsw', 'selen', 'trix', 'hp5']],
  ['sim', 'Film-Simulation', ['portra', 'ektar', 'velvia', 'cinestill', 'superia', 'gold200', 'instax', 'trix', 'hp5']],
  ['food', 'Food', ['lecker', 'cafe', 'frisch', 'dessert', 'bistro', 'honig']],
  ['traum', 'Träumerisch', ['traum', 'traumwelt', 'leuchten', 'morgentau', 'wolke', 'feenlicht', 'nebel', 'lavendel']],
  ['warm', 'Warm', ['goldstunde', 'bernstein', 'honig', 'sunset', 'toskana', 'zimt']],
  ['kuehl', 'Kühl', ['frost', 'eisblau', 'ozean', 'morgentau', 'minze', 'nordisch']],
  ['kreativ', 'Kreativ', ['lebendig', 'pop', 'neon', 'leck', 'traumwelt', 'xpro']]
];

/* Anpassen: [Schlüssel, Name, min, max, Icon] ; Sonderwerkzeuge ohne Bereich */
export const ADJ_GROUPS = [
  ['visual', 'Visuell', [
    ['crop', 'Zuschnitt', 0, 0, 'crop'], ['selective', 'Selektiv', 0, 0, 'selective'], ['auto', 'Auto', 0, 0, 'auto'],
    ['shine', 'Glanz', 0, 100, 'shine'], ['brightness', 'Helligkeit', -100, 100, 'brightness'], ['exposure', 'Belichtung', -100, 100, 'exposure'],
    ['contrast', 'Kontrast', -100, 100, 'contrast'], ['light', 'Licht', -100, 100, 'light'], ['mood', 'Stimmung', 0, 100, 'mood'],
    ['flash', 'Blitz', 0, 100, 'flash'], ['highlights', 'Lichter', -100, 100, 'highlights'], ['shadows', 'Schatten', -100, 100, 'shadows'],
    ['saturation', 'Sättigung', -100, 100, 'saturation'], ['vibrance', 'Lebendigkeit', -100, 100, 'vibrance'], ['brilliance', 'Brillanz', -100, 100, 'brilliance'],
    ['temperature', 'Wärme', -100, 100, 'temperature'], ['tint', 'Tönung', -100, 100, 'tint'], ['hsl', 'HSL', 0, 0, 'hsl'],
    ['hue', 'Farbton', -180, 180, 'hue'], ['curve', 'Kurve', 0, 0, 'curve']]],
  ['texture', 'Textur', [
    ['fade', 'Verblassen', 0, 100, 'fade'], ['sharpness', 'Schärfe', 0, 100, 'sharpness'], ['structure', 'Struktur', -100, 100, 'structure'],
    ['blur', 'Weich', 0, 100, 'blur'], ['refine', 'Feinzeichnung', 0, 100, 'refine'], ['grain', 'Körnung', 0, 100, 'grain'],
    ['texture', 'Textur', -100, 100, 'texture'], ['vignette', 'Vignette', -100, 100, 'vignette'], ['canvas', 'Leinwand', 0, 100, 'canvas']]],
  ['vibe', 'Atmosphäre', [
    ['fresh', 'Frische', 0, 100, 'fresh'], ['film', 'Filmlook', 0, 100, 'film'], ['ambient', 'Umgebungslicht', 0, 100, 'ambient'],
    ['rays', 'Lichtstrahlen', 0, 100, 'rays'], ['glow', 'Glow', 0, 100, 'glow']]]
];

/* Effekte: [id, Name, Kategorie, nutzt Punkt?] */
export const EFFECTS = [
  ['zoomblur', 'Zoom-Unschärfe', 'blur', true], ['motion', 'Bewegung', 'blur', false], ['tiltshift', 'Tilt-Shift', 'blur', true],
  ['bokeh', 'Bokeh-Rand', 'blur', true], ['orton', 'Weichzeichner', 'blur', false],
  ['haze', 'Dunst', 'mood', false], ['halation', 'Halation', 'mood', false], ['dusk', 'Dämmerung', 'mood', false], ['bloom', 'Weiches Leuchten', 'light', false],
  ['dust', 'Staub & Kratzer', 'vintage', false], ['burn', 'Filmbrand', 'vintage', false], ['oldphoto', 'Altes Foto', 'vintage', false],
  ['leakl', 'Lichtleck links', 'light', false], ['leakr', 'Lichtleck rechts', 'light', false], ['flare', 'Linsenreflex', 'light', true],
  ['prism', 'Prisma', 'light', false], ['sunbeam', 'Sonnenstrahlen', 'light', true],
  ['noise', 'Rauschen', 'basic', false], ['duotone', 'Duoton', 'basic', false], ['posterize', 'Poster', 'basic', false], ['sketch', 'Skizze', 'basic', false],
  ['kira', 'Kira-Funkeln', 'kira', false], ['starfilter', 'Sternfilter', 'kira', false], ['diamond', 'Diamantstaub', 'kira', false], ['bubble', 'Seifenblasen', 'kira', false],
  ['dv', 'DV-Kamera', 'dv', false], ['vhs', 'VHS', 'dv', false], ['scan', 'Scanlines', 'dv', false],
  ['rgbsplit', 'RGB-Versatz', 'shift', false], ['chroma', 'Farbsaum', 'shift', false], ['glitch', 'Glitch', 'shift', false],
  ['paper', 'Papier', 'material', false], ['fluted', 'Riffelglas', 'material', false], ['frosted', 'Milchglas', 'material', false],
  ['mirror', 'Spiegel', 'vfx', false], ['kaleido', 'Kaleidoskop', 'vfx', true], ['pixel', 'Pixel', 'vfx', false], ['halftone', 'Halbton', 'vfx', false],
  ['ghost', 'Doppelbild', 'vfx', false]
];
export const EFFECT_CATS = [['trend', 'Beliebt', ['kira', 'dv', 'bloom', 'halation', 'leakl', 'rgbsplit', 'fluted', 'zoomblur', 'dust', 'starfilter', 'orton', 'vhs']],
  ['blur', 'Unschärfe'], ['mood', 'Stimmung'], ['vintage', 'Vintage'], ['light', 'Licht'], ['basic', 'Basis'], ['kira', 'Glitzer'],
  ['dv', 'Camcorder'], ['shift', 'Farbversatz'], ['material', 'Material'], ['vfx', 'VFX']];

/* Vorlagen: kombinieren Filter, Anpassungen, Effekt und Rahmen */
export const TEMPLATES = [
  { id: 't-2013', n: 'Handy 2013', cat: 'retro', filter: ['cam2013', 100], effect: ['dv', 55], adj: { grain: 10 } },
  { id: 't-flakon', n: 'Flakon-Glanz', cat: 'produkt', filter: ['glanz', 80], adj: { shine: 45, vignette: 20 }, effect: ['starfilter', 35] },
  { id: 't-golden', n: 'Golden Hour', cat: 'produkt', filter: ['goldstunde', 90], effect: ['leakl', 40] },
  { id: 't-noirlux', n: 'Noir Luxus', cat: 'produkt', filter: ['dunkelgold', 100], adj: { shine: 30 }, effect: ['halation', 30] },
  { id: 't-shop', n: 'Shop Weiß', cat: 'produkt', filter: ['clean', 100], adj: { brightness: 8, highlights: 15 }, frame: { id: 'white', size: 4, color: '#ffffff' } },
  { id: 't-y2k', n: 'Y2K Glitzer', cat: 'trend', filter: ['y2k', 90], effect: ['kira', 70] },
  { id: 't-camcorder', n: 'Camcorder', cat: 'retro', filter: ['webcam', 70], effect: ['vhs', 60] },
  { id: 't-polaroid', n: 'Polaroid', cat: 'retro', filter: ['sofort', 90], frame: { id: 'polaroid', size: 6, color: '#f7f4ee' } },
  { id: 't-film', n: 'Filmstreifen', cat: 'retro', filter: ['portra', 100], effect: ['dust', 35], frame: { id: 'film', size: 6, color: '#111111' } },
  { id: 't-cinestill', n: 'Nachtkino', cat: 'trend', filter: ['cinestill', 100], effect: ['halation', 50] },
  { id: 't-dreamy', n: 'Verträumt', cat: 'trend', filter: ['wolke', 80], effect: ['orton', 45] },
  { id: 't-editorial', n: 'Editorial', cat: 'trend', filter: ['editorial', 100], adj: { grain: 8 }, frame: { id: 'gallery', size: 5, color: '#ffffff' } },
  { id: 't-rose', n: 'Rosé Soft', cat: 'trend', filter: ['rose', 100], effect: ['bloom', 35] },
  { id: 't-fluted', n: 'Riffelglas', cat: 'kreativ', filter: ['minimal', 70], effect: ['fluted', 70] },
  { id: 't-glitch', n: 'Glitch Pop', cat: 'kreativ', filter: ['lebendig', 80], effect: ['glitch', 55] },
  { id: 't-old', n: 'Großmutters Album', cat: 'retro', filter: ['sepia', 70], effect: ['oldphoto', 70], frame: { id: 'white', size: 5, color: '#efe6d2' } },
  { id: 't-prism', n: 'Prisma', cat: 'kreativ', filter: ['champagner', 70], effect: ['prism', 55] },
  { id: 't-halftone', n: 'Comic-Druck', cat: 'kreativ', filter: ['pop', 80], effect: ['halftone', 45] }
];
export const TEMPLATE_CATS = [['all', 'Alle'], ['produkt', 'Produkt'], ['trend', 'Trend'], ['retro', 'Retro'], ['kreativ', 'Kreativ']];

export const ASPECTS = [['free', 'Frei', null], ['orig', 'Original', 'orig'], ['1:1', '1:1', 1], ['4:5', '4:5', 4 / 5], ['3:4', '3:4', 3 / 4],
  ['2:3', '2:3', 2 / 3], ['9:16', '9:16', 9 / 16], ['16:9', '16:9', 16 / 9], ['3:2', '3:2', 3 / 2], ['4:3', '4:3', 4 / 3], ['og', '1200×630', 1200 / 630]];
export const BG_RATIOS = [['none', 'Original', null], ['1:1', '1:1', 1], ['9:16', '9:16', 9 / 16], ['3:4', '3:4', 3 / 4], ['2:3', '2:3', 2 / 3],
  ['1:2', '1:2', 1 / 2], ['4:5', '4:5', 4 / 5], ['4:3', '4:3', 4 / 3], ['3:2', '3:2', 3 / 2], ['16:9', '16:9', 16 / 9], ['og', '1200×630', 1200 / 630]];

export const PALETTE = ['#ffffff', '#000000', '#f2e8dc', '#d9c3a5', '#b08a5a', '#e2a6bf', '#f7c6d0', '#ff8fab', '#e5484d', '#c0262d', '#ff8a4c', '#f5a524',
  '#ffd166', '#fff3b0', '#c6f432', '#7bd389', '#2e8b57', '#0f5f6f', '#7fd1e8', '#3e63dd', '#1e2a5a', '#8e4ec6', '#d6409f', '#5a3a2a', '#8a8a8a', '#3a3a3a'];
export const GRADIENTS = [['#f7c6d0', '#e2a6bf'], ['#fff3b0', '#f5a524'], ['#7fd1e8', '#3e63dd'], ['#1e1e24', '#4a3a5a'], ['#f2e8dc', '#b08a5a'], ['#c6f432', '#2e8b57'], ['#ff8fab', '#8e4ec6'], ['#0b0b0e', '#3a2a10']];

export const FONTS = [
  ['Didot', 'Didot, "Bodoni 72", "Bodoni MT", "Playfair Display", Georgia, serif'],
  ['Bodoni', '"Bodoni 72", "Bodoni MT", Didot, Georgia, serif'],
  ['Baskerville', 'Baskerville, "Baskerville Old Face", "Libre Baskerville", Georgia, serif'],
  ['Georgia', 'Georgia, "Times New Roman", serif'],
  ['Avenir', '"Avenir Next", Avenir, "Segoe UI", Roboto, sans-serif'],
  ['Futura', 'Futura, "Century Gothic", "Trebuchet MS", sans-serif'],
  ['Helvetica', '"Helvetica Neue", Helvetica, Arial, sans-serif'],
  ['Gill Sans', '"Gill Sans", "Gill Sans MT", Calibri, sans-serif'],
  ['Optima', 'Optima, Candara, "Segoe UI", sans-serif'],
  ['Copperplate', 'Copperplate, "Copperplate Gothic Light", "Bodoni 72 Smallcaps", serif'],
  ['Schreibschrift', '"Snell Roundhand", "Savoye LET", "Segoe Script", "Brush Script MT", cursive'],
  ['Handschrift', '"Bradley Hand", Noteworthy, "Segoe Print", "Comic Sans MS", cursive'],
  ['Marker', '"Marker Felt", "Chalkboard SE", "Segoe Print", fantasy'],
  ['Schreibmaschine', '"American Typewriter", "Courier New", Courier, monospace'],
  ['Mono', 'Menlo, "SF Mono", Consolas, monospace'],
  ['System', '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif']
];
export const TEXT_STYLES = [
  ['plain', 'Schlicht', { color: '#ffffff', stroke: 0, shadow: 0, bg: 0, font: 'Avenir', bold: false, italic: false, caps: false, spacing: 0 }],
  ['editorial', 'Editorial', { color: '#ffffff', stroke: 0, shadow: 30, bg: 0, font: 'Didot', bold: false, italic: true, caps: false, spacing: 2 }],
  ['label', 'Etikett', { color: '#1a1418', stroke: 0, shadow: 0, bg: 90, bgColor: '#f2e8dc', font: 'Copperplate', bold: false, italic: false, caps: true, spacing: 12 }],
  ['script', 'Schrift', { color: '#ffffff', stroke: 0, shadow: 40, bg: 0, font: 'Schreibschrift', bold: false, italic: false, caps: false, spacing: 0 }],
  ['neon', 'Neon', { color: '#ff8fab', stroke: 0, shadow: 0, glow: 80, bg: 0, font: 'Futura', bold: true, italic: false, caps: true, spacing: 6 }],
  ['outline', 'Kontur', { color: '#ffffff', stroke: 8, strokeColor: '#000000', shadow: 0, bg: 0, font: 'Futura', bold: true, italic: false, caps: true, spacing: 4 }],
  ['tag', 'Tag', { color: '#ffffff', stroke: 0, shadow: 0, bg: 100, bgColor: '#e5484d', font: 'Helvetica', bold: true, italic: false, caps: true, spacing: 4 }],
  ['type', 'Typewriter', { color: '#1a1418', stroke: 0, shadow: 0, bg: 85, bgColor: '#ffffff', font: 'Schreibmaschine', bold: false, italic: false, caps: false, spacing: 0 }],
  ['date', 'Datum', { color: '#ff9a3c', stroke: 0, shadow: 0, glow: 40, bg: 0, font: 'Mono', bold: true, italic: false, caps: false, spacing: 2 }]
];

export const FRAMES = [['none', 'Kein'], ['white', 'Passepartout'], ['polaroid', 'Polaroid'], ['film', 'Film'], ['gallery', 'Galerie'],
  ['rounded', 'Abgerundet'], ['double', 'Doppelt'], ['shadow', 'Schwebend'], ['stamp', 'Briefmarke'], ['vintage', 'Antik']];

export const SHAPES = [['rect', 'Rechteck'], ['roundrect', 'Abgerundet'], ['circle', 'Kreis'], ['triangle', 'Dreieck'], ['star', 'Stern'],
  ['heart', 'Herz'], ['line', 'Linie'], ['arrow', 'Pfeil'], ['bubble', 'Sprechblase'], ['ring', 'Ring'], ['sparkle', 'Funkeln'], ['badge', 'Siegel']];

/* Sticker als SVG, Farbe über {c} */
const S = (body, vb = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
export const STICKERS = {
  rof: [
    ['rating5', 'Bewertung 5', S(`<g fill="{c}">${[0, 1, 2, 3, 4].map(i => `<path transform="translate(${2 + i * 40} 0)" d="M18 2l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>`).join('')}</g>`, '0 0 200 40')],
    ['rating4', 'Bewertung 4', S(`${[0, 1, 2, 3, 4].map(i => `<path fill="${i < 4 ? '{c}' : 'none'}" stroke="{c}" stroke-width="2.5" transform="translate(${2 + i * 40} 0)" d="M18 2l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>`).join('')}`, '0 0 200 40')],
    ['rating3', 'Bewertung 3', S(`${[0, 1, 2, 3, 4].map(i => `<path fill="${i < 3 ? '{c}' : 'none'}" stroke="{c}" stroke-width="2.5" transform="translate(${2 + i * 40} 0)" d="M18 2l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>`).join('')}`, '0 0 200 40')],
    ['neu', 'NEU', S(`<circle cx="50" cy="50" r="46" fill="{c}"/><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/><text x="50" y="60" font-family="Futura,Helvetica,Arial,sans-serif" font-weight="700" font-size="28" text-anchor="middle" fill="#fff">NEU</text>`)],
    ['review', 'REVIEW', S(`<rect x="2" y="2" width="196" height="56" rx="10" fill="{c}"/><text x="100" y="40" font-family="Futura,Helvetica,Arial,sans-serif" font-weight="700" font-size="30" letter-spacing="6" text-anchor="middle" fill="#fff">REVIEW</text>`, '0 0 200 60')],
    ['top', 'TOP-DUFT', S(`<path d="M50 2l12 9 15-1 4 14 13 8-5 14 5 14-13 8-4 14-15-1-12 9-12-9-15 1-4-14-13-8 5-14-5-14 13-8 4-14 15 1z" fill="{c}"/><text x="50" y="46" font-family="Futura,Helvetica,Arial,sans-serif" font-weight="700" font-size="20" text-anchor="middle" fill="#fff">TOP</text><text x="50" y="66" font-family="Futura,Helvetica,Arial,sans-serif" font-size="12" letter-spacing="2" text-anchor="middle" fill="#fff">DUFT</text>`)],
    ['tipp', 'Tipp', S(`<rect x="4" y="14" width="92" height="72" rx="36" fill="{c}"/><text x="50" y="60" font-family="Georgia,serif" font-style="italic" font-size="30" text-anchor="middle" fill="#fff">Tipp</text>`)],
    ['empf', 'Empfehlung', S(`<circle cx="60" cy="50" r="44" fill="{c}"/><path d="M38 86l-8 30 14-8 8 14 8-28zM82 86l8 30-14-8-8 14-8-28z" fill="{c}"/><circle cx="60" cy="50" r="36" fill="none" stroke="#fff" stroke-width="2"/><text x="60" y="47" font-family="Georgia,serif" font-size="13" text-anchor="middle" fill="#fff">UNSERE</text><text x="60" y="64" font-family="Georgia,serif" font-size="12" text-anchor="middle" fill="#fff">EMPFEHLUNG</text>`, '0 0 120 125')],
    ['flakon', 'Flakon', S(`<rect x="38" y="6" width="24" height="16" rx="3" fill="{c}"/><rect x="44" y="22" width="12" height="8" fill="{c}"/><rect x="18" y="30" width="64" height="64" rx="14" fill="none" stroke="{c}" stroke-width="5"/><path d="M28 44v36" stroke="{c}" stroke-width="4" stroke-linecap="round" opacity=".5"/>`)],
    ['drop', 'Tropfen', S(`<path d="M50 6C50 6 18 46 18 66a32 32 0 0064 0C82 46 50 6 50 6z" fill="{c}"/><path d="M34 66a16 16 0 0016 16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/>`)],
    ['note', 'Duftnote', S(`<path d="M50 8c8 14 30 18 30 42a30 30 0 01-60 0c0-24 22-28 30-42z" fill="none" stroke="{c}" stroke-width="5"/><path d="M50 30v52M50 50l-14-10M50 62l14-10" stroke="{c}" stroke-width="4" stroke-linecap="round" fill="none"/>`)]
  ],
  deko: [
    ['sparkle', 'Funkeln', S(`<path d="M50 2C53 35 65 47 98 50 65 53 53 65 50 98 47 65 35 53 2 50 35 47 47 35 50 2z" fill="{c}"/>`)],
    ['sparkles', 'Funken', S(`<path d="M40 8c2 22 10 30 32 32-22 2-30 10-32 32-2-22-10-30-32-32 22-2 30-10 32-32z" fill="{c}"/><path d="M78 56c1 11 5 15 16 16-11 1-15 5-16 16-1-11-5-15-16-16 11-1 15-5 16-16z" fill="{c}"/><path d="M80 6c1 7 3 9 10 10-7 1-9 3-10 10-1-7-3-9-10-10 7-1 9-3 10-10z" fill="{c}"/>`)],
    ['star', 'Stern', S(`<path d="M50 4l13 28 30 3-23 20 7 30-27-16-27 16 7-30-23-20 30-3z" fill="{c}"/>`)],
    ['heart', 'Herz', S(`<path d="M50 88S8 62 8 34a20 20 0 0142-6 20 20 0 0142 6c0 28-42 54-42 54z" fill="{c}"/>`)],
    ['crown', 'Krone', S(`<path d="M10 76l-4-46 24 20 20-34 20 34 24-20-4 46z" fill="{c}"/><rect x="10" y="80" width="80" height="10" rx="3" fill="{c}"/>`)],
    ['flower', 'Blüte', S(`<g fill="{c}">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="26" rx="15" ry="22" transform="rotate(${a} 50 50)"/>`).join('')}</g><circle cx="50" cy="50" r="12" fill="#ffd166"/>`)],
    ['bow', 'Schleife', S(`<path d="M50 50L12 26c-8-4-12 2-10 12l4 24c2 10 8 12 16 6zM50 50l38-24c8-4 12 2 10 12l-4 24c-2 10-8 12-16 6z" fill="{c}"/><path d="M44 52l-14 40 12-6 8 10 4-42zM56 52l14 40-12-6-8 10-4-42z" fill="{c}"/><circle cx="50" cy="50" r="9" fill="{c}" stroke="#fff" stroke-width="2"/>`)],
    ['moon', 'Mond', S(`<path d="M64 8a42 42 0 1028 72A36 36 0 0164 8z" fill="{c}"/>`)],
    ['sun', 'Sonne', S(`<circle cx="50" cy="50" r="20" fill="{c}"/><g stroke="{c}" stroke-width="6" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="50" y1="12" x2="50" y2="22" transform="rotate(${a} 50 50)"/>`).join('')}</g>`)],
    ['leaf', 'Blatt', S(`<path d="M14 86C10 40 40 10 90 10c0 50-30 80-76 76z" fill="{c}"/><path d="M14 86L70 30" stroke="#fff" stroke-width="3" opacity=".6"/>`)],
    ['cloud', 'Wolke', S(`<path d="M26 80a20 20 0 01-2-40 26 26 0 0150-6 20 20 0 0118 46z" fill="{c}"/>`)],
    ['butterfly', 'Schmetterling', S(`<g fill="{c}"><path d="M48 46C36 18 6 16 8 38c2 18 26 18 40 10z"/><path d="M52 46c12-28 42-30 40-8-2 18-26 18-40 10z"/><path d="M48 54C30 56 18 80 34 86c12 4 16-16 14-32z"/><path d="M52 54c18 2 30 26 14 32-12 4-16-16-14-32z"/></g><rect x="47" y="34" width="6" height="40" rx="3" fill="#333"/>`)]
  ],
  pfeile: [
    ['arrow1', 'Pfeil', S(`<path d="M10 50h66M60 30l20 20-20 20" fill="none" stroke="{c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`)],
    ['arrow2', 'Bogenpfeil', S(`<path d="M14 80C20 40 50 22 82 26M66 12l16 14-16 14" fill="none" stroke="{c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`)],
    ['circlemark', 'Kreis', S(`<path d="M52 10c26 0 42 16 40 38-2 26-28 42-52 40C14 86 4 64 10 44 16 24 38 14 62 16" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round"/>`)],
    ['underline', 'Unterstrich', S(`<path d="M6 30c30-10 60-12 90-6 30 6 60 4 98-4" fill="none" stroke="{c}" stroke-width="7" stroke-linecap="round"/>`, '0 0 200 50')],
    ['check', 'Haken', S(`<path d="M14 54l24 24 50-56" fill="none" stroke="{c}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`)],
    ['cross', 'Kreuz', S(`<path d="M20 20l60 60M80 20L20 80" fill="none" stroke="{c}" stroke-width="12" stroke-linecap="round"/>`)],
    ['pin', 'Markierung', S(`<path d="M50 94S16 58 16 36a34 34 0 0168 0c0 22-34 58-34 58z" fill="{c}"/><circle cx="50" cy="36" r="12" fill="#fff"/>`)],
    ['speech', 'Sprechblase', S(`<path d="M10 14h80a6 6 0 016 6v46a6 6 0 01-6 6H44L24 90l4-18H10a6 6 0 01-6-6V20a6 6 0 016-6z" fill="{c}"/>`)]
  ],
  emoji: ['✨', '💫', '⭐', '🌟', '💖', '💕', '🖤', '🤍', '🌸', '🌹', '🌷', '🍑', '🍓', '🍋', '🍒', '🥂', '🍾', '☕', '🕯️', '🧴', '💎', '👑', '🎀', '🦋', '🌙', '☀️', '🔥', '❄️', '🌊', '🍂', '🌿', '🪵', '🍫', '🍯', '🎁', '📸', '💄', '💅', '😍', '🥰', '😎', '🤩', '👌', '👍', '❤️‍🔥', '💯']
};
export const STICKER_CATS = [['rof', 'Duft & Review'], ['deko', 'Deko'], ['pfeile', 'Markierungen'], ['emoji', 'Emoji']];

export const PATTERN_STAMPS = [['heart', '♥'], ['star', '★'], ['sparkle', '✦'], ['dot', '●'], ['flower', '✿'], ['note', '♪']];
