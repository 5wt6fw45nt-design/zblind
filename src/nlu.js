// Entender lo que escribe la gente. Primero reglas (gratis e instantáneas); si no bastan, la IA gratuita de Cloudflare.
// Zash enseña y da datos; nunca recomienda comprar ni vender.

import { FACTS } from './lessons.js';

export const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[¿?¡!]/g, '').trim();

/** «1.000», «1,000», «950,5», «950.5», «1k» → número. 3 cifras tras el separador = miles. */
export function parseNumber(str) {
  let s = String(str).trim().toLowerCase();
  let mult = 1;
  if (/k$/.test(s)) { mult = 1000; s = s.slice(0, -1); }
  let dec = '';
  const md = s.match(/[.,](\d{1,2}|\d{4,})$/);
  if (md) { dec = md[1]; s = s.slice(0, -md[0].length); }
  if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(s)) return null;
  const n = Number(s.replace(/[.,]/g, '') + (dec ? '.' + dec : '')) * mult;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// «¿y en pesos mexicanos?», «precio en dólares», «en soles»: la moneda que piden (todas las da Coinbase)
const CURRENCIES = [
  [/\b(pesos? mexicanos?|mxn)\b/, 'MXN', 'pesos mexicanos'], [/\b(pesos? argentinos?|ars)\b/, 'ARS', 'pesos argentinos'],
  [/\b(pesos? colombianos?|cop)\b/, 'COP', 'pesos colombianos'], [/\b(pesos? chilenos?|clp)\b/, 'CLP', 'pesos chilenos'],
  [/\b(pesos? uruguayos?|uyu)\b/, 'UYU', 'pesos uruguayos'], [/\b(pesos? dominicanos?|dop)\b/, 'DOP', 'pesos dominicanos'],
  [/\b(soles?|pen)\b/, 'PEN', 'soles'], [/\b(bolivares?|ves)\b/, 'VES', 'bolívares'],
  [/\b(euros?|eur)\b/, 'EUR', 'euros'], [/\b(dolares?|usd)\b/, 'USD', 'dólares'], [/\b(libras?|gbp)\b/, 'GBP', 'libras'],
];
export function currencyIn(t) {
  const c = CURRENCIES.find(([re]) => re.test(t));
  return c ? { currency: c[1], currencyName: c[2] } : null;
}

const assetIn = (t) => (/\b(bitcoin|btc)\b/.test(t) ? 'BTC' : 'ZEC');
const SMALLTALK = /^((ja|je|ji)+|gracias|vale|ok|okey|perfecto|genial|guay|bien|bueno|si|no|adios|chao|top|crack)$/;

/** Reglas rápidas. null = no está claro (decide la IA). */
export function quickIntent(text) {
  const t = norm(text);
  if (!t) return null;
  if (/^(hola|buenas|hey|holi|buenos dias|buenas tardes|buenas noches|ayuda|como funciona|instrucciones|que haces|comandos)$/.test(t)) return { intent: 'help' };
  if (SMALLTALK.test(t)) return { intent: 'smalltalk' };
  if (/\b(ajustes|configuracion|configurar)\b/.test(t)) return { intent: 'settings' };
  if (/\b(mi pais|cambiar pais|moneda|zona horaria|horario)\b/.test(t)) return { intent: 'zone' };
  if (/^(opinion|sugerencia|queja|tengo una idea)$/.test(t)) return { intent: 'feedback' };
  if (/\b(mis alertas|que alertas tengo|ver alertas)\b/.test(t)) return { intent: 'alerts' };
  // «avísame si zcash baja de 900», «alerta btc > 100000», «avísame cuando el zec pase de 1.000 pesos»
  const al = t.match(/(?:avisame|aviseme|alerta|alertame|avisa)(?: cuando| si)?(?: el| la)? ?(zcash|zec|bitcoin|btc)? (pasa de|pase de|supera|supere|sube de|suba de|sube a|suba a|por encima de|mas de|llega a|llegue a|baja de|baje de|cae de|caiga de|baja a|baje a|por debajo de|menos de|>|<) \$?([\d.,]+k?)/);
  if (al) {
    const price = parseNumber(al[3]);
    if (price) return { intent: 'alert', asset: al[1] ? assetIn(al[1]) : 'ZEC', op: /baja|baje|cae|caiga|debajo|menos|</.test(al[2]) ? '<' : '>', price };
  }
  if (/^(alerta|alertas|avisame|poner alerta|crear alerta)$/.test(t)) return { intent: 'alert_help' };
  if (/\b(grafico|grafica|chart)\b/.test(t)) return { intent: 'chart', asset: assetIn(t) };
  // Precio en otra moneda: «¿y en pesos mexicanos?», «¿cuánto es en dólares?»
  const cur = t.length < 60 && /\ben\b/.test(t) && !/\b(pasa|baja|sube|cae|avisa)/.test(t) ? currencyIn(t) : null;
  if (cur && /^(y |precio|cuanto|a cuanto|cotizacion|zcash|zec|bitcoin|btc|en )/.test(t)) return { intent: 'price', asset: assetIn(t), ...cur };
  // Comprar o conseguir ZEC: la lección 5 lo explica sin recomendar ningún sitio
  if (/\b(como|donde|de donde)\b.*\b(compro|comprar|consigo|conseguir|obtener|obtengo|adquirir)\b/.test(t)) return { intent: 'lesson', n: 4 };
  if (/\bno (lo )?entiendo\b|\bmas facil\b|\bexplica(me)? mejor\b|\bno me entero\b/.test(t)) return { intent: 'simpler' };
  if (/\b(red zcash|estado de la red|blindad[oa]s? hay|cuanto (zec )?hay blindado|altura|bloques)\b/.test(t)) return { intent: 'network' };
  if (/\b(curso|aprender|aprende|leccion|lecciones|empezar desde cero|desde cero)\b/.test(t)) return { intent: 'learn', fromStart: /\b(empezar|empieza|desde cero|desde el principio)\b/.test(t) };
  if (/\b(guia de privacidad|privacidad)$/.test(t)) return { intent: 'privacy' };
  if (/^(precio|precios|cotizacion|cuanto vale|a cuanto esta|como esta|como va)( el| la)?( (zcash|zec|bitcoin|btc))?$/.test(t) || /^(zcash|zec|bitcoin|btc)$/.test(t)) return { intent: 'price', asset: assetIn(t) };
  if (/^(precio|cotizacion) de(l)? (zcash|zec|bitcoin|btc)\b/.test(t)) return { intent: 'price', asset: assetIn(t) };
  if (/\b(resumen diario|avisos diarios|resumen de la manana)\b/.test(t)) return { intent: 'settings' };
  return null;
}

const SYSTEM = `Eres Zash, un bot de Telegram que enseña Zcash en español a personas sin conocimientos técnicos (España y Latinoamérica).
Responde SIEMPRE en español, claro y cercano, de tú, en 2-6 frases cortas, en texto normal (sin HTML ni Markdown).
Usa estos hechos como base y no inventes cifras ni fechas que no estén aquí; si no estás seguro de algo, dilo y sugiere zechub.wiki o z.cash:
${FACTS}
Reglas:
- Nunca recomiendes comprar, vender ni invertir, ni predigas precios. Si lo piden, explica con amabilidad que Zash informa y enseña, no aconseja.
- No recomiendes exchanges concretos.
- Las direcciones blindadas que hay que usar hoy son las unificadas (empiezan por u1); las Sapling (zs) son antiguas.
- Si te vacilan o bromean («eres un friki»), contesta con humor amable y sigue ayudando; nunca a la defensiva. Empieza siempre con mayúscula.
- Si preguntan algo que no es de Zcash, criptomonedas o privacidad, reconduce con amabilidad.
- Si alguien pide ayuda para algo ilegal, niégate con educación.
- Si la pregunta sugiere una posible estafa (le piden la frase de recuperación, le prometen duplicar dinero), avísale claramente. Escribe con la puntuación de la RAE, en frases naturales y sin guiones largos (—).`;

/** Respuesta de la IA a una pregunta libre sobre Zcash. Devuelve null si falla. */
export async function answer(ai, text, country) {
  if (!ai) return null;
  try {
    const out = await ai.run(MODEL, {
      messages: [
        { role: 'system', content: SYSTEM + (country && country.id !== 'es' ? `\nEl usuario es de ${country.label.replace(/^\S+\s/, '')}: usa español neutro de Latinoamérica.` : '\nEl usuario es de España: español de España, de tú (nunca de vos).') },
        { role: 'user', content: String(text).slice(0, 800) },
      ],
      max_tokens: 380,
    });
    const r = typeof out?.response === 'string' ? out.response.trim() : '';
    return r || null;
  } catch (e) {
    console.error('[ia]', e.message);
    return null;
  }
}
