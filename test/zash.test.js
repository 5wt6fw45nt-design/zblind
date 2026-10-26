import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/db.js';
import { d1Shim } from '../scripts/d1-shim.js';
import { drainOutbox } from '../src/telegram.js';
import { createEngine } from '../src/engine.js';
import { createBot } from '../src/bot.js';
import { loadConfig } from '../src/config.js';
import { quickIntent, parseNumber } from '../src/nlu.js';
import { LESSONS } from '../src/lessons.js';

const T0 = Date.UTC(2026, 9, 15, 6, 50); // 8:50 en Madrid

function setup(opts = {}) {
  const cfg = { ...loadConfig({}), adminIds: [999] };
  const db = createDb(d1Shim());
  const sent = [];
  const calls = [];
  const api = {
    async call(method, params) {
      calls.push({ method, params });
      if (method === 'sendMessage') { sent.push(params); return { message_id: sent.length }; }
      return true;
    },
  };
  let zec = 1000;
  const data = {
    fetchRates: async (id) => (id === 'ZEC' ? { USD: zec, EUR: zec * 0.9, MXN: zec * 18.5, BTC: zec / 80000 } : { USD: 80000, EUR: 72000, MXN: 1480000 }),
    fetchCandles: async () => Array.from({ length: 80 }, (_, i) => ({ t: T0 - (80 - i) * 3600e3, o: 950, h: 960, l: 940, c: i === 79 ? zec : 950 })),
    fetchMaya: async () => ({ usd: zec * 1.001, depthZec: 2000 }),
    fetchNetwork: async () => ({ height: 3517634, supply: 16985936, pools: { transparent: 11954930, sapling: 475917, orchard: 357805, sprout: 22309, lockbox: 69606, ironwood: 4105365 }, shielded: 4961396, shieldedPct: 0.292 }),
  };
  let now = T0;
  const http = async () => new Response(JSON.stringify({ success: true, url: 'https://quickchart.io/chart/render/z' }));
  const engine = createEngine({ db, cfg, data, log: {} });
  const bot = createBot({ api, db, cfg, clock: () => now, ai: opts.ai ?? null, data, http });
  const msg = (from, text) => bot.handleUpdate({ message: { from: { id: from, first_name: 'Ana', username: `u${from}` }, chat: { id: from, type: 'private' }, text } });
  const tap = (from, data_) => bot.handleUpdate({ callback_query: { id: 'c', from: { id: from }, data: data_ } });
  return {
    db, bot, sent, calls, msg, tap, cfg,
    setZec: (v) => (zec = v),
    at: (t) => (now = t),
    tick: async () => drainOutbox(api, db, 1000 - (await engine.tick(now)), 1e6),
    last: (id) => sent.filter((m) => m.chat_id === id).at(-1)?.text,
    to: (id) => sent.filter((m) => m.chat_id === id),
  };
}

test('el curso tiene sus lecciones y ninguna se pasa de una pantalla', () => {
  assert.ok(LESSONS.length >= 8);
  for (const l of LESSONS) assert.ok(l.text.join('\n').length < 1200, l.title);
});

test('reglas: precio, alertas en lenguaje normal, gráfico, red y números con punto o coma', () => {
  assert.deepEqual(quickIntent('¿cómo está el zcash?'), { intent: 'price', asset: 'ZEC' });
  assert.equal(quickIntent('precio de bitcoin').asset, 'BTC');
  assert.deepEqual(quickIntent('avísame si zcash baja de 900'), { intent: 'alert', asset: 'ZEC', op: '<', price: 900 });
  assert.deepEqual(quickIntent('avísame cuando pase de 1.500'), { intent: 'alert', asset: 'ZEC', op: '>', price: 1500 });
  assert.equal(quickIntent('gráfico').intent, 'chart');
  assert.equal(quickIntent('¿cuánto hay blindado?').intent, 'network');
  assert.equal(quickIntent('¿qué es una clave de visualización?'), null); // a la IA
  assert.equal(parseNumber('21.418'), 21418);
  assert.equal(parseNumber('21,418.5'), 21418.5);
});

test('usuario nuevo de México: instrucciones fijadas, país, precio en pesos, curso, red, alerta que salta, opinión', async () => {
  const fakeAi = { run: async () => ({ response: 'Una clave de visualización deja ver tus movimientos sin poder gastar.' }) };
  const s = setup({ ai: fakeAi });
  await s.tick();
  await s.msg(1, '/start ig');
  assert.ok(s.calls.some((c) => c.method === 'pinChatMessage'));
  assert.match(s.last(1), /[Dd]esde qué país/);
  await s.tap(1, 'tz:mx');
  assert.match(s.last(1), /Zcash \(ZEC\)[\s\S]*18,500 pesos mexicanos[\s\S]*Maya Protocol/);
  await s.msg(1, '🎓 Aprende Zcash');
  assert.match(s.last(1), /1\. ¿Qué es Zcash\?/);
  await s.tap(1, 'l:1');
  assert.match(s.last(1), /Bitcoin y Zcash/);
  await s.msg(1, '🌐 Red Zcash');
  assert.match(s.last(1), /29\.2 %.*blindados/);
  await s.msg(1, '¿qué es una clave de visualización?');
  assert.match(s.last(1), /clave de visualización[\s\S]*no consejo de inversión/);
  await s.msg(1, 'avísame si zcash baja de 15.000');
  assert.match(s.last(1), /Hecho \(alerta #1\).*15,000 pesos mexicanos/);
  s.setZec(800); // 800 $ = 14.800 pesos
  s.at(T0 + 2 * 60_000);
  await s.tick();
  assert.match(s.last(1), /ha bajado de 15,000 pesos mexicanos/);
  await s.msg(1, '💬 Tu opinión');
  await s.msg(1, 'Más lecciones, porfa');
  assert.match(s.last(999), /Opinión en Zblind.*Más lecciones/s);
  await s.msg(1, '📊 Gráfico');
  assert.ok(s.calls.some((c) => c.method === 'sendPhoto'));
});

test('resumen de la mañana a las 9:00 de cada país, una vez, y se puede apagar', async () => {
  const s = setup();
  await s.msg(2, '/start');
  await s.tap(2, 'tz:es');
  await s.msg(3, '/start');
  await s.tap(3, 'tz:mx');
  await s.tap(3, 'set:daily'); // apaga
  s.at(Date.UTC(2026, 9, 15, 7, 5)); // 9:05 en Madrid
  await s.tick();
  await s.tick();
  assert.equal(s.to(2).filter((m) => /☀️ <b>Zcash hoy/.test(m.text)).length, 1);
  assert.ok(!s.to(3).some((m) => /☀️ <b>Zcash hoy/.test(m.text)));
});

test('una pasada del motor cabe en los límites del plan gratuito', async () => {
  const s = setup();
  let q = 0;
  const raw = d1Shim();
  const counting = { prepare: (sql) => { q++; return raw.prepare(sql); }, batch: raw.batch };
  const db = createDb(counting);
  const engine = createEngine({ db, cfg: s.cfg, data: { fetchRates: async () => ({ USD: 1 }), fetchCandles: async () => [], fetchMaya: async () => ({ usd: 1 }), fetchNetwork: async () => ({}) }, log: {} });
  const used = await engine.tick(T0);
  assert.ok(q <= 20, `consultas D1: ${q}`);
  assert.ok(used <= 10, `peticiones externas: ${used}`);
});

test('reglas: precio en otra moneda, «¿cómo compro?» a la lección 5, «no lo entiendo» y empezar el curso', () => {
  assert.deepEqual(quickIntent('¿y en pesos mexicanos?'), { intent: 'price', asset: 'ZEC', currency: 'MXN', currencyName: 'pesos mexicanos' });
  assert.deepEqual(quickIntent('precio en dólares'), { intent: 'price', asset: 'ZEC', currency: 'USD', currencyName: 'dólares' });
  assert.equal(quickIntent('avísame si baja de 900 euros').intent, 'alert'); // una alerta no es un cambio de moneda
  assert.deepEqual(quickIntent('¿Cómo compro zcash?'), { intent: 'lesson', n: 4 });
  assert.deepEqual(quickIntent('¿dónde puedo conseguir ZEC?'), { intent: 'lesson', n: 4 });
  assert.deepEqual(quickIntent('no entiendo la lección'), { intent: 'simpler' });
  assert.equal(quickIntent('empezar el curso').fromStart, true);
  assert.equal(quickIntent('curso').fromStart, false);
});
