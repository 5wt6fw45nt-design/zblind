// Todo lo que dice Zblind. Claro, cercano y sin prometer nada: informa y enseña, no aconseja.

import { currentLocale } from './region.js';
import { LESSONS, PRIVACY_GUIDE } from './lessons.js';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const DISCLAIMER = 'Información y formación, no consejo de inversión.';

export function fmt(n, decimals) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(currentLocale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always' });
}
const dec = (v) => (Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 1 ? 2 : 6);
export const money = (v, country) => `${fmt(v, dec(v))} ${country.currencyName}`;
export const pct = (x) => (x == null ? '—' : `${x >= 0 ? '+' : ''}${fmt(x * 100, 2)} %`);

// Teclado fijo
export const BUTTONS = {
  '💰 Precio': 'price',
  '📊 Gráfico': 'chart',
  '🎓 Aprende Zcash': 'learn',
  '🛡️ Privacidad': 'privacy',
  '🔔 Mis alertas': 'alerts',
  '🌐 Red Zcash': 'network',
  '⚙️ Ajustes': 'settings',
  '📖 Cómo funciona': 'help',
  '💬 Tu opinión': 'feedback',
};
export const KEYBOARD = {
  reply_markup: {
    keyboard: [['💰 Precio', '📊 Gráfico'], ['🎓 Aprende Zcash', '🛡️ Privacidad'], ['🔔 Mis alertas', '🌐 Red Zcash'], ['⚙️ Ajustes', '📖 Cómo funciona'], ['💬 Tu opinión']].map((r) => r.map((text) => ({ text }))),
    resize_keyboard: true,
    is_persistent: true,
  },
};

/** Tarjeta de precio: tu moneda, dólares, cambio 24 h y comparación con bitcoin. */
export function priceCard({ asset, rates, chg, country, maya, btcRatio }) {
  const local = rates[country.currency];
  const lines = [`<b>${asset.name} (${asset.id})</b>`, ''];
  lines.push(`💰 <b>${money(local, country)}</b>`);
  if (country.currency !== 'USD') lines.push(`💵 ${fmt(rates.USD, dec(rates.USD))} dólares`);
  if (country.also && rates[country.also]) lines.push(`≈ ${fmt(rates[country.also], 0)} ${country.also === 'VES' ? 'bolívares' : country.also}`);
  if (chg != null) lines.push(`${chg >= 0 ? '📈' : '📉'} ${pct(chg)} en 24 h`);
  if (asset.id === 'ZEC' && btcRatio) lines.push(`₿ 1 ZEC = ${fmt(btcRatio, 6)} BTC`);
  if (asset.id === 'ZEC' && maya) lines.push(`⛓️ En Maya Protocol (descentralizado): ${fmt(maya.usd, 2)} dólares`);
  lines.push('', `<i>Fuentes: Coinbase${asset.id === 'ZEC' && maya ? ' y Maya Protocol' : ''}. ${DISCLAIMER}</i>`);
  return lines.join('\n');
}

export function networkCard(n, ts, tz) {
  const pools = n.pools;
  const order = Object.keys(pools).sort((a, b) => pools[b] - pools[a]);
  const name = (id) => ({ transparent: 'Transparente', sapling: 'Blindado Sapling', orchard: 'Blindado Orchard (antiguo: pásalo a Ironwood)', ironwood: 'Blindado Ironwood (el nuevo, desde julio de 2026)', sprout: 'Blindado Sprout (antiguo)', lockbox: 'Reserva para financiar el desarrollo' }[id] || `Blindado ${id[0].toUpperCase()}${id.slice(1)}`);
  const lines = [
    '🌐 <b>La red Zcash ahora</b>',
    '',
    `🧱 Bloque número <b>${fmt(n.height, 0)}</b>`,
    `🪙 ZEC en circulación: <b>${fmt(n.supply, 0)}</b> de 21.000.000`,
    `🛡️ <b>${fmt(n.shieldedPct * 100, 1)} %</b> de los ZEC están blindados (privados)`,
    '',
    ...order.map((id) => `• ${name(id)}: ${fmt(pools[id], 0)} ZEC`),
    '',
    `<i>Datos de la propia red (explorador de Nighthawk, código abierto). Actualizado: ${new Intl.DateTimeFormat('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(ts)}.</i>`,
  ];
  return lines.join('\n');
}

export function lesson(i) {
  const l = LESSONS[i];
  return `🎓 <b>${l.title}</b>  <i>(${i + 1}/${LESSONS.length})</i>\n\n${l.text.join('\n')}`;
}
export function lessonButtons(i) {
  const row = [];
  if (i > 0) row.push({ text: '⬅️ Anterior', callback_data: `l:${i - 1}` });
  if (i < LESSONS.length - 1) row.push({ text: 'Siguiente ➡️', callback_data: `l:${i + 1}` });
  return { reply_markup: { inline_keyboard: [row, [{ text: '📚 Índice del curso', callback_data: 'l:idx' }]].filter((r) => r.length) } };
}
export const lessonIndex = () => ({
  text: '📚 <b>Curso «Zcash desde cero»</b>\n\nToca una lección:',
  extra: { reply_markup: { inline_keyboard: LESSONS.map((l, i) => [{ text: l.title, callback_data: `l:${i}` }]) } },
});
export const privacy = () => PRIVACY_GUIDE.join('\n');

export function daily({ country, rates, chg, network, tip }) {
  const out = ['☀️ <b>Zcash hoy</b>', ''];
  if (rates) out.push(`💰 1 ZEC = <b>${money(rates[country.currency], country)}</b> (${pct(chg)} en 24 h)`);
  if (network) out.push(`🛡️ ${fmt(network.shieldedPct * 100, 1)} % de los ZEC están blindados`);
  if (tip) out.push('', `💡 ${tip}`);
  out.push('', `<i>${DISCLAIMER} Lo apagas en ⚙️ Ajustes.</i>`);
  return out.join('\n');
}

export const TIPS = [
  'Comparte direcciones que empiecen por <code>u1</code>: son blindadas y unificadas.',
  'Tu frase de recuperación, en papel. Nadie de soporte te la pedirá jamás.',
  'Un pago de blindada a blindada no deja ver quién paga, quién cobra ni cuánto.',
  'Con una clave de visualización enseñas tus movimientos sin dar acceso a tu dinero.',
  'Si recibes ZEC de un exchange en una dirección <code>t</code>, blíndalos en cuanto lleguen.',
  'Nadie regala criptomonedas. Si te prometen duplicar tu dinero, es una estafa.',
  'Zcash, como Bitcoin, tendrá como máximo 21 millones de monedas.',
  '¿Tienes ZEC en Orchard? Actualiza tu cartera y pásalos a Ironwood, el nuevo fondo blindado.',
  'Los memos cifrados de Zcash te dejan añadir un mensaje que solo lee quien recibe.',
  'Descarga las carteras siempre de la tienda oficial o de su web: hay copias falsas.',
  '¿Dudas? Pregúntamelo como lo dirías: «¿qué es una dirección blindada?».',
];

export function settings({ country, daily, alerts }) {
  return [
    '⚙️ <b>Tus ajustes de Zblind</b>',
    '',
    `🌎 País: ${esc(country.label)}`,
    `💱 Precios en: ${esc(country.currencyName)}`,
    `☀️ Resumen de la mañana (${'09:00'} de tu hora): ${daily ? 'encendido' : 'apagado'}`,
    `🔔 Alertas activas: ${alerts}`,
    '',
    'Todo es tuyo: cámbialo cuando quieras. Zblind es gratis, sin Premium.',
  ].join('\n');
}

export const T = {
  instructions: (cfg) => [
    '📖 <b>Cómo funciona Zblind</b>',
    '',
    'Zblind te enseña <b>Zcash desde cero</b>, en español y gratis. Zcash es dinero digital como bitcoin, pero con <b>privacidad</b>.',
    '',
    '1️⃣ <b>«💰 Precio»</b>: Zcash en tu moneda, en dólares y frente a bitcoin. <b>«📊 Gráfico»</b>: las últimas 72 horas.',
    '2️⃣ <b>«🎓 Aprende Zcash»</b>: un curso corto, lección a lección. <b>«🛡️ Privacidad»</b>: guía rápida para usarlo en privado.',
    `3️⃣ <b>Alertas</b>: «avísame si zcash baja de 900» (en tu moneda; hasta ${cfg.maxAlerts}).`,
    '4️⃣ <b>«🌐 Red Zcash»</b>: cuántos ZEC hay y cuántos están blindados, con datos de la propia red.',
    '5️⃣ <b>Pregúntame lo que quieras</b>: «¿qué es una clave de visualización?», «¿Zcash es legal?».',
    '6️⃣ Cada mañana a las 9:00 (tu hora), Zcash hoy y un consejo. Lo apagas en ⚙️ Ajustes.',
    '',
    'Gratis y de código abierto. Sin Premium.',
    `<i>${DISCLAIMER}</i>`,
  ].join('\n'),
  askZone: '¿Desde qué país me lees? Así te doy el precio en tu moneda y el resumen a tu hora.',
  zoneSet: (c) => `Hecho: ${c.label}. Precios en ${c.currencyName} y resumen a tu hora. Lo cambias en ⚙️ Ajustes.`,
  noData: 'Ahora mismo no puedo consultar el precio. Prueba en un minuto.',
  noCurrency: (name) => `No tengo el precio en ${name}. Te lo doy en tu moneda, en dólares y en euros.`,
  noNetwork: 'Ahora mismo no puedo consultar la red Zcash. Prueba en un rato.',
  alertUsage: (c) => `Dime el precio en ${c.currencyName}, por ejemplo: «avísame si zcash baja de 900» o «avísame si zcash pasa de 1.500».`,
  alertSet: (id, asset, op, p, c) => `🔔 Hecho (alerta #${id}): te aviso cuando ${asset.name} ${op === '>' ? 'pase de' : 'baje de'} ${money(p, c)}.`,
  alertAlready: (asset, op, p, c) => `${asset.name} ya está ${op === '>' ? 'por encima' : 'por debajo'} de ${money(p, c)}. ¿Quieres poner otro precio?`,
  alertTooMany: (n) => `Tienes ${n} alertas, el máximo. Borra alguna en «🔔 Mis alertas».`,
  alertHit: (al, asset, now, c) => `🔔 <b>${asset.name} ${al.op === '>' ? 'ha pasado de' : 'ha bajado de'} ${money(al.price, c)}</b>\nAhora: ${money(now, c)}.\n\n<i>${DISCLAIMER}</i>`,
  noAlerts: 'No tienes alertas. Escríbeme, por ejemplo: «avísame si zcash baja de 900».',
  alertDeleted: (id) => `Alerta #${id} borrada.`,
  alertNotFound: 'No encuentro esa alerta.',
  limitAI: (n) => `Hoy ya me has hecho ${n} preguntas, el máximo diario (la IA gratuita tiene un cupo). Mañana, más. Mientras, tienes el curso en «🎓 Aprende Zcash».`,
  aiFail: 'Ahora no puedo responder a eso. Mira el curso en «🎓 Aprende Zcash» o la wiki de la comunidad: zechub.wiki',
  smalltalk: '¡A mandar! 🛡️ Si tienes dudas sobre Zcash, pregúntame.',
  chartCaption: (a) => `${esc(a.name)} · últimas 72 horas (dólares)\n<i>Fuente: Coinbase. ${DISCLAIMER}</i>`,
  chartFail: 'Ahora no puedo dibujar el gráfico. Prueba en un rato.',
  feedbackAsk: '💬 Cuéntame qué mejorarías, qué te falla o qué echas de menos. Escríbelo en tu próximo mensaje: lo lee una persona del equipo y te puede contestar por aquí.\n\n(Si cambias de idea, escribe «cancelar».)',
  feedbackThanks: '¡Gracias! 🙏 Ya lo tenemos. Si hace falta, te contestamos por aquí.',
  feedbackCancel: 'Vale, sin problema 👍',
  feedbackReply: (t) => `💬 <b>Respuesta del equipo de Zblind:</b>\n\n${esc(t)}\n\n<i>Puedes contestar con «💬 Tu opinión».</i>`,
  dailyOn: '☀️ Resumen de la mañana encendido.',
  dailyOff: '🌙 Resumen de la mañana apagado.',
  deleteAsk: 'Esto borra tu cuenta y tus alertas. No hay vuelta atrás.\n\nSi lo tienes claro: /borrar_mis_datos confirmar',
  deleted: 'Hecho. Tus datos están borrados.',
  terms: [
    '<b>Términos y privacidad de Zblind</b>',
    '',
    '1. Zblind es gratuito y de código abierto. No hay pagos ni Premium.',
    '2. Zblind informa y enseña sobre Zcash. No es asesoramiento financiero ni recomienda comprar, vender o invertir, ni recomienda exchanges.',
    '3. Fuentes: Coinbase (precios), Maya Protocol (precio descentralizado) y el explorador de Nighthawk (datos de la red Zcash). Pueden fallar o retrasarse.',
    '4. Guardamos tu ID de Telegram, tu nombre de usuario, tu país y tus alertas. Nada más. No se vende ni se comparte. Para responder a tus preguntas usamos la inteligencia artificial de Cloudflare, que no guarda tus mensajes. /borrar_mis_datos lo borra todo.',
    '5. Zcash es una marca de sus titulares; Zblind es un proyecto independiente de la comunidad.',
    '6. Responsable: Augusto Martín (riberasistemas) · hola@riberasistemas.com',
  ].join('\n'),
};
