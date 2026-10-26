// «🔎 ¿Es esto una copia?»: mira enlaces, cuentas de Telegram, direcciones y mensajes, y avisa de lo que huele a estafa.
// Sin IA a propósito: reglas fijas, para no inventarse nada. La lista oficial sale del directorio de z.cash/ecosystem
// (revisado el 26/10/2026). Que algo no esté en la lista no significa que sea falso: solo que no podemos confirmarlo.

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Webs oficiales: dominio → quién es. Vale también cualquier subdominio (www., docs., …). */
export const OFFICIAL_SITES = {
  'z.cash': 'la web de Zcash',
  'zfnd.org': 'la Zcash Foundation',
  'electriccoin.co': 'Electric Coin Company',
  'shieldedlabs.net': 'Shielded Labs',
  'zcashcommunitygrants.org': 'Zcash Community Grants',
  'forum.zcashcommunity.com': 'el foro de la comunidad de Zcash',
  'zechub.wiki': 'ZecHub, la wiki de la comunidad',
  'zodl.com': 'la cartera Zodl (antes Zashi)',
  'edge.app': 'la cartera Edge',
  'keyst.one': 'la cartera física Keystone',
  'zknoir.com': 'la cartera Noir',
  'unstoppable.money': 'la cartera Unstoppable',
  'vizor.cash': 'la cartera Vizor',
  'vultisig.com': 'la cartera Vultisig',
  'zingolabs.org': 'la cartera Zingo!',
  'leodex.io': 'LeoDex',
  'zcashexplorer.app': 'el explorador de bloques de Zcash',
  'zcashinfo.com': 'Zcash Info',
};

/** Nuestras propias cuentas, para el sello de autenticidad. */
export const OFFICIAL_HANDLES = { zblindbot: 'Zblind, este bot', zashcash_bot: 'el antiguo Zash, que solo remite a @ZblindBot' };

// Palabras que usan las copias para parecer oficiales (en dominios y nombres de usuario)
const BRANDS = ['zcash', 'zec', 'zodl', 'zashi', 'zingo', 'zblind', 'zechub', 'zfnd', 'electriccoin', 'keystone', 'vultisig', 'unstoppable', 'vizor', 'leodex'];
const BAIT = /(support|soporte|help|ayuda|admin|airdrop|giveaway|regalo|reward|official|oficial|verify|verifica|claim|recovery|recuper)/;

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

const official = (host) => Object.keys(OFFICIAL_SITES).find((d) => host === d || host.endsWith(`.${d}`));

/** Qué web oficial imita un dominio que no lo es (null si no se parece a ninguna). */
function imitates(host) {
  const label = host.replace(/^www\./, '').split('.').slice(0, -1).join('.') || host;
  const flat = label.replace(/[^a-z0-9]/g, '');
  for (const [d, who] of Object.entries(OFFICIAL_SITES)) {
    const base = d.split('.').slice(0, -1).join('').replace(/[^a-z0-9]/g, '');
    if (base.length >= 4 && flat !== base && (lev(flat, base) <= 2 || (flat.includes(base) && flat.length > base.length))) return who;
  }
  const brand = BRANDS.find((b) => flat.includes(b));
  return brand ? `algo de Zcash («${brand}»)` : null;
}

// Señales de estafa en el texto de un mensaje
const FLAGS = [
  [/(frase|palabras?) (de )?(recuperacion|semilla|secreta)|\bseed\b|semilla|\b(12|24) palabras|clave privada|private key|mnemonic/, 'Habla de tu <b>frase de recuperación</b> o tu clave privada. Nadie de verdad te la pide jamás.'],
  [/(envia|enviame|manda|deposita|transfiere|send)\b.{0,60}(devolv|doble|duplic|x2|multiplic|recibir[aá]s|te llegan)|duplica(mos)? tu|double your/, 'Te pide <b>enviar dinero para recibir más</b>. Es el timo más repetido en cripto.'],
  [/airdrop|giveaway|sorteo|regalo|premio|has ganado|ganaste|reward|bonus|bono/, 'Promete un <b>regalo, sorteo o airdrop</b>. Los de verdad no te piden pagar ni conectar tu cartera.'],
  [/(verifica|valida|sincroniza|conecta|activa|desbloquea|validate|sync|connect|unlock)\w*\b.{0,25}(cartera|wallet|billetera|cuenta)/, 'Te pide <b>verificar, conectar o sincronizar tu cartera</b>. Ninguna cartera seria necesita eso.'],
  [/urgente|ultima oportunidad|solo hoy|en 24 ?h|ahora mismo|bloquead|suspendid|congelad/, 'Mete <b>prisa o miedo</b> (urgente, bloqueada, solo hoy). Es para que no pienses.'],
  [/recuper(ar|amos|o) (tus |los )?(fondos|zec|cripto|dinero)|fund recovery/, 'Ofrece <b>recuperar fondos perdidos</b>. Casi siempre es una segunda estafa a quien ya perdió dinero.'],
  [/(soporte|support|asistencia|tecnico).{0,40}(te escrib|contact|privado|dm|whatsapp)|te (escribo|contacto) (del|de) (soporte|equipo)|soy (del|de) (soporte|equipo|servicio)/, 'Dice ser <b>soporte</b> y te escribe por privado. El soporte de verdad nunca escribe primero.'],
];

// Nombres que usan los estafadores para hacerse pasar por alguien, con su web oficial (de z.cash/ecosystem)
const NAMED = [['zodl', 'zodl.com'], ['zashi', 'zodl.com'], ['zingo', 'zingolabs.org'], ['edge', 'edge.app'], ['keystone', 'keyst.one'], ['unstoppable', 'unstoppable.money'], ['vizor', 'vizor.cash'], ['vultisig', 'vultisig.com'], ['zechub', 'zechub.wiki'], ['zcash', 'z.cash'], ['zblind', 't.me/ZblindBot']];
const NAME_INFO = {
  zodl: 'es una cartera de Zcash que está en la lista oficial de z.cash. Antes se llamaba Zashi. Descárgala solo desde su web o desde la tienda oficial de tu móvil.',
  zashi: 'ahora se llama Zodl, una cartera de Zcash que está en la lista oficial de z.cash. Si alguien te ofrece «Zashi» desde otra web, desconfía.',
  zingo: 'es una cartera de Zcash que está en la lista oficial de z.cash.',
  edge: 'es una cartera que está en la lista oficial de z.cash.',
  keystone: 'es una cartera física (un aparato) que está en la lista oficial de z.cash. Cómprala solo en su tienda.',
  unstoppable: 'es una cartera que está en la lista oficial de z.cash.',
  vizor: 'es una cartera de Zcash que está en la lista oficial de z.cash.',
  vultisig: 'es una cartera que está en la lista oficial de z.cash.',
  zechub: 'es la wiki de la comunidad de Zcash.',
  zcash: 'el directorio oficial de carteras está en z.cash/ecosystem, y nadie de Zcash te escribirá por privado para ayudarte con tu cartera.',
  zblind: 'soy yo, @ZblindBot. Nunca te escribo primero ni te pido tu frase ni dinero.',
};
const NAME_LABEL = { zodl: 'Zodl', zashi: 'Zashi (ahora Zodl)', zingo: 'Zingo!', edge: 'Edge', keystone: 'Keystone', unstoppable: 'Unstoppable', vizor: 'Vizor', vultisig: 'Vultisig', zechub: 'ZecHub', zcash: 'Zcash', zblind: 'Zblind' };

function addressKind(a) {
  if (/^t1[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return 'transparente (<code>t1</code>): pública, como en Bitcoin';
  if (/^t3[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return 'transparente de varias firmas (<code>t3</code>): pública';
  if (/^tex1[02-9ac-hj-np-z]{30,}$/.test(a)) return 'TEX (<code>tex1</code>): solo acepta envíos desde saldo transparente';
  if (/^zs1[02-9ac-hj-np-z]{60,}$/.test(a)) return 'blindada Sapling (<code>zs1</code>): privada';
  if (/^u1[02-9ac-hj-np-z]{60,}$/.test(a)) return 'unificada (<code>u1</code>): la recomendada, privada';
  return null;
}

/** Analiza lo que pega la persona. Devuelve { verdict: 'red'|'ok'|'unknown'|'empty', lines: [...] }. */
export function analyze(input) {
  const raw = String(input || '').slice(0, 4000).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' '); // los correos no son enlaces ni cuentas
  const t = norm(raw);
  const lines = [];
  let red = 0, ok = 0, unknown = 0;
  const seen = new Set();

  // Enlaces y dominios (con o sin https://), menos los de Telegram, que van aparte
  for (const m of raw.matchAll(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/[^\s]*)?/gi)) {
    const host = m[1].toLowerCase().replace(/^www\./, '');
    if (host === 'github.com' && /github\.com\/5wt6fw45nt-design\/(zblind|zash)\b/i.test(m[0])) {
      if (!seen.has('repo')) { seen.add('repo'); ok++; lines.push('✅ Es el código público de Zblind en GitHub.'); }
      continue;
    }
    if (seen.has(host) || /^(t\.me|telegram\.me|telegram\.org)$/.test(host) || /^\d/.test(host)) continue;
    seen.add(host);
    const off = official(host);
    if (off) { ok++; lines.push(`✅ <code>${host}</code> es la web oficial de ${OFFICIAL_SITES[off]}.`); continue; }
    const fake = imitates(host);
    if (fake) { red++; lines.push(`🚩 <code>${host}</code> se parece a ${fake}, pero <b>no es su web oficial</b>. Muy probablemente es una copia.`); continue; }
    unknown++;
    lines.push(`⚪ <code>${host}</code> no la tengo en mi lista de webs oficiales de Zcash y sus carteras. No significa que sea falsa, pero no puedo confirmarla.`);
  }

  // Cuentas de Telegram: @usuario o t.me/usuario
  for (const m of raw.matchAll(/(?:t\.me\/|telegram\.me\/|@)([a-z][a-z0-9_]{3,31})/gi)) {
    const h = m[1].toLowerCase();
    if (seen.has(`@${h}`)) continue;
    seen.add(`@${h}`);
    if (OFFICIAL_HANDLES[h]) { ok++; lines.push(`✅ @${m[1]} es ${OFFICIAL_HANDLES[h]}.`); continue; }
    const brand = BRANDS.find((b) => h.replace(/_/g, '').includes(b)) || (lev(h.replace(/_/g, ''), 'zblindbot') <= 2 ? 'zblind' : null);
    if (brand && (BAIT.test(h) || brand === 'zblind')) { red++; lines.push(`🚩 @${m[1]} usa un nombre de Zcash («${brand}») junto a palabras como soporte, ayuda u oficial. Así se presentan las cuentas falsas.`); continue; }
    if (brand) { unknown++; lines.push(`⚪ @${m[1]} usa un nombre de Zcash («${brand}»), pero eso no la hace oficial. Cualquiera puede ponérselo.`); continue; }
    unknown++;
    lines.push(`⚪ @${m[1]}: no puedo saber quién hay detrás de una cuenta de Telegram.`);
  }

  // Direcciones de Zcash: qué tipo son (no de quién son)
  for (const m of raw.matchAll(/\b(t1|t3|tex1|zs1|u1)[0-9a-zA-Z]{25,}\b/g)) {
    const kind = addressKind(m[0]);
    if (!kind) continue;
    lines.push(`🔤 Dirección ${kind}. Ojo: nadie puede saber de quién es una dirección. Compárala entera con la que te dio la persona, no solo el principio y el final.`);
  }

  for (const [re, why] of FLAGS) if (re.test(t)) { red++; lines.push(`🚩 ${why}`); }

  // Nombres conocidos: si el mensaje es sospechoso, decimos que se escuda en ellos; si no, dónde está lo de verdad
  let named = 0;
  for (const [name, site] of NAMED) {
    if (!new RegExp(`\\b${name}\\b`).test(t) || seen.has(site)) continue;
    seen.add(site);
    named++;
    const who = NAME_LABEL[name] || name;
    lines.push(red
      ? `ℹ️ Usa el nombre de <b>${who}</b> para parecer de fiar. La web de verdad es <code>${site}</code>, y nadie de allí te escribirá por privado ni te pedirá tu frase.`
      : `ℹ️ <b>${who}</b>: ${NAME_INFO[name]} Lo de verdad está en <code>${site}</code>. Cualquier otra web, app o cuenta que use ese nombre puede ser una copia.`);
  }

  const verdict = red ? 'red' : ok && !unknown ? 'ok' : unknown ? 'unknown' : named ? 'info' : lines.length ? 'unknown' : 'empty';
  return { verdict, lines };
}

const HEAD = {
  red: '🚩 <b>Cuidado: esto tiene pinta de copia o de estafa.</b>',
  ok: '✅ <b>Todo lo que veo coincide con lo oficial.</b>',
  unknown: '⚪ <b>No veo señales claras de estafa, pero no puedo confirmarlo.</b>',
  info: '🔎 <b>Esto es lo que sé:</b>',
};

export const SEAL = '🛡️ El Zblind de verdad es @ZblindBot. Nunca te escribe primero, nunca te pide tu frase de recuperación ni dinero, y su código es público.';

export function report(input) {
  const { verdict, lines } = analyze(input);
  if (verdict === 'empty') return null;
  return [HEAD[verdict], '', ...lines, '', verdict === 'red' ? 'No pulses enlaces, no envíes nada y no des tu frase. Si ya la diste, crea una cartera nueva y pasa allí lo que te quede cuanto antes.' : verdict === 'info' ? 'Para descargar una cartera, entra tú mismo a <b>z.cash/ecosystem</b> desde el navegador y sigue sus enlaces.' : 'Si dudas, entra tú mismo a <b>z.cash/ecosystem</b> desde el navegador en vez de usar el enlace que te pasaron.', '', `<i>${SEAL}</i>`].join('\n');
}

export const ASK = [
  '🔎 <b>¿Es esto una copia?</b>',
  '',
  'Pégame lo que te parezca sospechoso: un enlace, una web, una cuenta de Telegram (@algo), una dirección de Zcash o el mensaje entero que te mandaron. También vale solo un nombre, como «zodl».',
  '',
  'Lo comparo con la lista oficial de z.cash y busco las señales típicas de estafa.',
  '',
  '<i>No pegues nunca tu frase de recuperación, ni aquí ni en ningún sitio.</i>',
].join('\n');

export const NOTHING = 'No he encontrado ningún enlace, cuenta, dirección ni mensaje sospechoso en lo que me has pasado. Pega el enlace o el mensaje tal cual te llegó, o escribe «cancelar».';

/** Lección extra: «Cómo detectar copias falsas». */
export const LESSON_COPIAS = {
  title: '🕵️ Lección extra: cómo detectar copias falsas',
  text: [
    'En Telegram y Discord hay muchas <b>copias falsas</b>: carteras, bots y cuentas de «soporte» que imitan a los de verdad para quedarse con tu dinero.',
    '',
    '<b>Las cinco reglas</b>',
    '1. <b>Nadie de verdad te escribe primero.</b> Si alguien de «soporte» te habla por privado, es falso.',
    '2. <b>Tu frase de recuperación no se le da a nadie.</b> Ni a un soporte, ni a un bot, ni a una web para «verificar» o «sincronizar».',
    '3. <b>Nadie te devuelve el doble.</b> Si para recibir tienes que enviar antes, es un timo.',
    '4. <b>Descarga las carteras desde z.cash/ecosystem</b> o desde la tienda oficial. Mira el nombre exacto: una letra cambiada ya es otra web.',
    '5. <b>Desconfía de las prisas.</b> «Urgente», «tu cartera está bloqueada» o «solo hoy» son para que no pienses.',
    '',
    '<b>Cómo saber que hablas con Zblind:</b> el de verdad es @ZblindBot, nunca te escribe primero y su código es público en GitHub.',
    '',
    '¿Tienes dudas con algo? Pulsa «🔎 ¿Es esto una copia?» y pégamelo.',
  ],
};
