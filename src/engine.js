// El motor: lo despierta el reloj (ribera-reloj) cada minuto.
// Precios cada minuto, cambio 24 h / red / Maya cada 10 min, alertas y resumen de la mañana por país.
// Límite del plan gratuito de D1: 50 consultas por ejecución → kv entero de una vez y escritura en bloque.

import { ASSETS, ZONES, countryOf } from './config.js';
import { fetchRates, fetchCandles, fetchMaya, fetchNetwork } from './market.js';
import * as R from './render.js';
import { withCountry } from './region.js';
import { madrid, inWindow } from './time.js';

const MIN = 60_000;
const SLOW = 10 * MIN;

export function createEngine({ db, cfg, data = { fetchRates, fetchCandles, fetchMaya, fetchNetwork }, log = console }) {
  const read = (kv, k) => (kv.get(k) ? JSON.parse(kv.get(k)) : null);

  async function tick(now = Date.now()) {
    const kv = await db.kvAll();
    const writes = new Map();
    const set = (k, v) => {
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      kv.set(k, s);
      writes.set(k, s);
    };
    const out = [];
    let used = 0;

    // 1. Precio en todas las monedas (Coinbase), cada minuto
    if (now - Number(kv.get('at:rates') || 0) >= MIN - 5_000) {
      set('at:rates', String(now));
      for (const id of Object.keys(ASSETS)) {
        try {
          set(`px:${id}`, { rates: await data.fetchRates(id), at: now });
        } catch (e) {
          log.warn?.(`[precio ${id}] ${e.message}`);
        }
        used++;
      }
    }

    // 2. Cambio en 24 h, precio en Maya y estado de la red, cada 10 min
    if (now - Number(kv.get('at:slow') || 0) >= SLOW - 5_000) {
      set('at:slow', String(now));
      for (const a of Object.values(ASSETS)) {
        try {
          const c = await data.fetchCandles(a.product);
          const last = c.at(-1)?.c;
          const ref = c.at(-25)?.c;
          if (last && ref) set(`chg:${a.id}`, { chg: last / ref - 1, at: now });
        } catch (e) {
          log.warn?.(`[velas ${a.id}] ${e.message}`);
        }
        used++;
      }
      try { set('maya', { ...(await data.fetchMaya()), at: now }); } catch (e) { log.warn?.(`[maya] ${e.message}`); }
      try { set('net', { ...(await data.fetchNetwork()), at: now }); } catch (e) { log.warn?.(`[red] ${e.message}`); }
      used += 2;
    }

    // 3. Alertas (en la moneda de cada usuario)
    const px = Object.fromEntries(Object.keys(ASSETS).map((id) => [id, read(kv, `px:${id}`)]));
    const alerts = await db.activeAlerts();
    const hits = [];
    for (const al of alerts) {
      const now_ = px[al.asset]?.rates?.[al.currency];
      if (!now_) continue;
      if ((al.op === '>' && now_ >= al.price) || (al.op === '<' && now_ <= al.price)) hits.push([al, now_]);
    }
    if (hits.length) {
      const users = new Map();
      for (const [al, now_] of hits) {
        if (!users.has(al.user_id)) users.set(al.user_id, await db.getUser(al.user_id));
        const c = countryOf(users.get(al.user_id));
        const cur = { ...c, currencyName: al.currency === c.currency ? c.currencyName : al.currency };
        out.push([al.user_id, withCountry(c, () => R.T.alertHit(al, ASSETS[al.asset], now_, cur))]);
      }
      await db.deleteAlerts(hits.map(([al]) => al.id));
    }

    // 4. Resumen de la mañana, a las 9:00 de cada zona horaria
    const due = new Set();
    for (const z of ZONES) {
      const { date, hm } = madrid(now, z.tz);
      if (!inWindow(hm, cfg.dailyAt) || kv.get(`daily:${z.tz}`) === date) continue;
      set(`daily:${z.tz}`, date);
      due.add(z.tz);
    }
    if (due.size) {
      const net = read(kv, 'net');
      const chg = read(kv, 'chg:ZEC')?.chg ?? null;
      const day = Math.floor(now / 864e5);
      const tip = R.TIPS[day % R.TIPS.length];
      const cache = new Map();
      for (const u of await db.dailyUsers()) {
        const c = countryOf(u);
        if (!due.has(c.tz)) continue;
        if (!cache.has(c.id)) cache.set(c.id, withCountry(c, () => R.daily({ country: c, rates: px.ZEC?.rates, chg, network: net, tip })));
        out.push([u.id, cache.get(c.id) + R.nextLesson(u.seen)]);
      }
      log.info?.(`[resumen] ${[...due].join(',')} → ${out.length}`);
    }

    await db.enqueueMany(out, now);
    await db.kvSetMany([...writes]);
    return used;
  }

  return { tick };
}
