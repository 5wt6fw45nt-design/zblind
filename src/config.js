// Zblind · Zcash en español. Países, monedas y parámetros. Gratis: sin Premium ni pagos.

// Países: hora del resumen diario y moneda en la que ves el precio (todas las da Coinbase).
export const COUNTRIES = [
  { id: 'es', label: '🇪🇸 España', tz: 'Europe/Madrid', locale: 'es-ES', currency: 'EUR', currencyName: 'euros' },
  { id: 'mx', label: '🇲🇽 México', tz: 'America/Mexico_City', locale: 'es-MX', currency: 'MXN', currencyName: 'pesos mexicanos' },
  { id: 'ar', label: '🇦🇷 Argentina', tz: 'America/Argentina/Buenos_Aires', locale: 'es-AR', currency: 'ARS', currencyName: 'pesos argentinos' },
  { id: 'co', label: '🇨🇴 Colombia', tz: 'America/Bogota', locale: 'es-CO', currency: 'COP', currencyName: 'pesos colombianos' },
  { id: 've', label: '🇻🇪 Venezuela', tz: 'America/Caracas', locale: 'es-VE', currency: 'USD', currencyName: 'dólares', also: 'VES' },
  { id: 'cl', label: '🇨🇱 Chile', tz: 'America/Santiago', locale: 'es-CL', currency: 'CLP', currencyName: 'pesos chilenos' },
  { id: 'pe', label: '🇵🇪 Perú', tz: 'America/Lima', locale: 'es-PE', currency: 'PEN', currencyName: 'soles' },
  { id: 'uy', label: '🇺🇾 Uruguay', tz: 'America/Montevideo', locale: 'es-UY', currency: 'UYU', currencyName: 'pesos uruguayos' },
  { id: 'ec', label: '🇪🇨 Ecuador', tz: 'America/Guayaquil', locale: 'es-EC', currency: 'USD', currencyName: 'dólares' },
  { id: 'do', label: '🇩🇴 Rep. Dominicana', tz: 'America/Santo_Domingo', locale: 'es-DO', currency: 'DOP', currencyName: 'pesos dominicanos' },
  { id: 'pr', label: '🇵🇷 Puerto Rico', tz: 'America/Puerto_Rico', locale: 'es-PR', currency: 'USD', currencyName: 'dólares' },
  { id: 'ca', label: '🌎 Centroamérica', tz: 'America/Costa_Rica', locale: 'es-CR', currency: 'USD', currencyName: 'dólares' },
  { id: 'ue', label: '🇺🇸 EE. UU. (Este)', tz: 'America/New_York', locale: 'es-US', currency: 'USD', currencyName: 'dólares' },
  { id: 'uw', label: '🇺🇸 EE. UU. (Oeste)', tz: 'America/Los_Angeles', locale: 'es-US', currency: 'USD', currencyName: 'dólares' },
  { id: 'ot', label: '🌍 Otro país', tz: 'Europe/Madrid', locale: 'es-ES', currency: 'USD', currencyName: 'dólares' },
];
export const ZONES = [...new Map(COUNTRIES.map((c) => [c.tz, { id: c.id, tz: c.tz }])).values()];
export const countryById = (id) => COUNTRIES.find((c) => c.id === id) || null;
export const countryOf = (u) => countryById(u?.country) || COUNTRIES.find((c) => c.tz === u?.tz) || COUNTRIES[0];

// Activos: Zcash y Bitcoin (para comparar). Velas de Coinbase en dólares.
export const ASSETS = {
  ZEC: { id: 'ZEC', name: 'Zcash', product: 'ZEC-USD' },
  BTC: { id: 'BTC', name: 'Bitcoin', product: 'BTC-USD' },
};

export function loadConfig(vars = globalThis.process?.env ?? {}) {
  const env = (k, d) => vars[k] ?? d;
  return {
    token: env('BOT_TOKEN', ''),
    adminIds: env('ADMIN_IDS', '').split(',').map((s) => Number(s.trim())).filter(Boolean),
    dailyAt: env('DAILY_AT', '09:00'), // resumen de cada mañana, a la hora de cada país
    maxAlerts: 10,
    aiQuestionsPerDay: 20, // preguntas a la IA por persona y día (la IA gratuita de Cloudflare tiene un cupo diario)
    subrequestBudget: Number(env('SUBREQUEST_BUDGET', 45)),
    channelId: Number(env('CHANNEL_ID', 0)) || null,
  };
}
