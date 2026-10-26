// Conversación de Zblind: botones, texto libre (reglas + IA), curso, alertas, ajustes y opinión. Sin pagos.

import { ASSETS, COUNTRIES, countryById, countryOf } from './config.js';
import { LESSONS } from './lessons.js';
import * as R from './render.js';
import { T } from './render.js';
import { madrid } from './time.js';
import { message } from './telegram.js';
import { withCountry } from './region.js';
import { quickIntent, answer } from './nlu.js';
import { fetchRates, fetchCandles, fetchMaya, fetchNetwork } from './market.js';

export function createBot({ api, db, cfg, clock = Date.now, ai = null, data = { fetchRates, fetchCandles, fetchMaya, fetchNetwork }, http = (...a) => fetch(...a) }) {
  const reply = (chatId, text, extra = {}) => api.call('sendMessage', message(chatId, text, extra));
  const notifyAdmins = (text) => Promise.allSettled(cfg.adminIds.map((id) => reply(id, text)));
  const fresh = (x, ms) => x && clock() - x.at < ms;
  const kvJson = async (k) => JSON.parse((await db.kvGet(k)) || 'null');

  // --- datos (del motor; si son viejos, se piden al momento) ---

  async function prices(id) {
    let p = await kvJson(`px:${id}`);
    if (!fresh(p, 5 * 60_000)) {
      try {
        p = { rates: await data.fetchRates(id), at: clock() };
        await db.kvSet(`px:${id}`, JSON.stringify(p));
      } catch (e) {
        console.error('[precio]', e.message);
      }
    }
    return p?.rates ?? null;
  }

  async function network() {
    let n = await kvJson('net');
    if (!fresh(n, 30 * 60_000)) {
      try {
        n = { ...(await data.fetchNetwork()), at: clock() };
        await db.kvSet('net', JSON.stringify(n));
      } catch (e) {
        console.error('[red]', e.message);
      }
    }
    return n;
  }

  const assetButtons = (id) => ({ reply_markup: { inline_keyboard: [[
    { text: '📊 Gráfico', callback_data: `g:${id}` },
    { text: '🔔 Alerta', callback_data: `a:${id}` },
    { text: id === 'ZEC' ? '₿ Bitcoin' : '🛡️ Zcash', callback_data: `p:${id === 'ZEC' ? 'BTC' : 'ZEC'}` },
  ]] } });

  async function cmdPrice(chatId, user, id = 'ZEC', cur = null) {
    const own = countryOf(user);
    const country = cur && cur.currency !== own.currency ? { ...own, currency: cur.currency, currencyName: cur.currencyName, also: null } : own;
    const rates = await prices(id);
    if (!rates) return reply(chatId, T.noData);
    if (!rates[country.currency]) return reply(chatId, T.noCurrency(cur.currencyName));
    const chg = (await kvJson(`chg:${id}`))?.chg ?? null;
    const maya = id === 'ZEC' ? await kvJson('maya') : null;
    const btcRatio = id === 'ZEC' ? rates.BTC : null;
    return reply(chatId, R.priceCard({ asset: ASSETS[id], rates, chg, country, maya, btcRatio }), assetButtons(id));
  }

  async function cmdNetwork(chatId, user) {
    const n = await network();
    if (!n?.height) return reply(chatId, T.noNetwork);
    return reply(chatId, R.networkCard(n, n.at, countryOf(user).tz), { reply_markup: { inline_keyboard: [[{ text: '🎓 ¿Qué es «blindado»?', callback_data: 'l:1' }]] } });
  }

  // --- gráfico (QuickChart dibuja; Telegram descarga la imagen) ---

  async function sendChart(chatId, user, id = 'ZEC') {
    const asset = ASSETS[id];
    try {
      const candles = (await data.fetchCandles(asset.product)).slice(-72);
      const f = new Intl.DateTimeFormat('es-ES', { timeZone: countryOf(user).tz, day: 'numeric', month: 'numeric', hour: '2-digit' });
      const up = candles.at(-1).c >= candles[0].c;
      const chart = {
        type: 'line',
        data: {
          labels: candles.map((c) => f.format(c.t).replace(', ', ' · ') + ' h'),
          datasets: [{ data: candles.map((c) => c.c), borderColor: up ? '#16a34a' : '#dc2626', backgroundColor: up ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', fill: true, pointRadius: 0, borderWidth: 2 }],
        },
        options: { legend: { display: false }, title: { display: true, text: `${asset.name} · 72 h (dólares)`, fontSize: 18 }, scales: { xAxes: [{ ticks: { maxTicksLimit: 8 } }], yAxes: [{ ticks: { beginAtZero: false, maxTicksLimit: 6 } }] } },
      };
      const res = await http('https://quickchart.io/chart/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chart, width: 800, height: 420, backgroundColor: 'white', format: 'png' }),
        signal: AbortSignal.timeout(10_000),
      });
      const url = (await res.json())?.url;
      if (!url) throw new Error('quickchart sin url');
      return api.call('sendPhoto', { chat_id: chatId, photo: url, caption: T.chartCaption(asset), parse_mode: 'HTML' });
    } catch (e) {
      console.error('[gráfico]', e.message);
      return reply(chatId, T.chartFail);
    }
  }

  // --- curso ---

  async function sendLesson(chatId, user, i) {
    const n = Math.max(0, Math.min(LESSONS.length - 1, i));
    if (n > (user.lesson ?? 0)) await db.setLesson(user.id, n);
    return reply(chatId, R.lesson(n), R.lessonButtons(n));
  }

  /** «No lo entiendo»: la última lección, otra vez y más fácil, con un ejemplo de la vida diaria. */
  async function explainSimpler(chatId, user, now) {
    const l = LESSONS[user.lesson ?? 0];
    const left = await db.consumeUse(user.id, madrid(now, countryOf(user).tz).date, cfg.aiQuestionsPerDay);
    if (left < 0) return reply(chatId, T.limitAI(cfg.aiQuestionsPerDay));
    const plain = l.text.join('\n').replace(/<[^>]+>/g, '');
    const r = await answer(ai, `No he entendido esta lección. Explícamela otra vez con palabras más sencillas y un ejemplo de la vida diaria:\n${l.title}\n${plain}`, countryOf(user));
    return reply(chatId, r ? `🎓 <b>${R.esc(l.title)}</b>, más fácil:\n\n${R.esc(r)}` : T.aiFail, R.lessonButtons(user.lesson ?? 0));
  }

  // --- alertas ---

  async function createAlert(chatId, user, assetId, op, price) {
    const country = countryOf(user);
    const count = await db.countAlerts(user.id);
    if (count >= cfg.maxAlerts) return reply(chatId, T.alertTooMany(count));
    const rates = await prices(assetId);
    const now = rates?.[country.currency];
    const asset = ASSETS[assetId];
    if (now && ((op === '>' && now >= price) || (op === '<' && now <= price))) return reply(chatId, T.alertAlready(asset, op, price, country));
    const id = await db.addAlert({ userId: user.id, asset: assetId, op, price, currency: country.currency, ts: clock() });
    return reply(chatId, T.alertSet(id, asset, op, price, country));
  }

  async function cmdAlerts(chatId, user) {
    const list = await db.userAlerts(user.id);
    if (!list.length) return reply(chatId, T.noAlerts);
    const c = countryOf(user);
    const lines = list.map((al) => `#${al.id} ${ASSETS[al.asset].name} ${al.op === '>' ? 'pase de' : 'baje de'} ${R.money(al.price, al.currency === c.currency ? c : { ...c, currencyName: al.currency })}`);
    return reply(chatId, `🔔 <b>Tus alertas</b>\n${lines.join('\n')}`, {
      reply_markup: { inline_keyboard: list.map((al) => [{ text: `🗑 Borrar #${al.id}`, callback_data: `del:${al.id}` }]) },
    });
  }

  // --- ajustes, país y opinión ---

  const zoneButtons = () => {
    const rows = [];
    for (let i = 0; i < COUNTRIES.length; i += 2) rows.push(COUNTRIES.slice(i, i + 2).map((c) => ({ text: c.label, callback_data: `tz:${c.id}` })));
    return { reply_markup: { inline_keyboard: rows } };
  };

  async function cmdSettings(chatId, user) {
    return reply(chatId, R.settings({ country: countryOf(user), daily: !!user.daily, alerts: await db.countAlerts(user.id) }), {
      reply_markup: { inline_keyboard: [
        [{ text: '🌎 Cambiar país y moneda', callback_data: 'set:country' }],
        [{ text: user.daily ? '🌙 Apagar resumen de la mañana' : '☀️ Encender resumen de la mañana', callback_data: 'set:daily' }],
        [{ text: '🔔 Mis alertas', callback_data: 'set:alerts' }, { text: '💬 Dar mi opinión', callback_data: 'set:feedback' }],
        [{ text: '📄 Términos y privacidad', callback_data: 'set:terms' }, { text: '🗑 Borrar mis datos', callback_data: 'set:delete' }],
        [{ text: '📤 Compártelo con alguien', url: 'https://t.me/share/url?url=https%3A%2F%2Ft.me%2FZblindBot%3Fstart%3Damigo&text=Mira%20este%20bot%3A%20te%20ense%C3%B1a%20Zcash%20desde%20cero%20en%20espa%C3%B1ol%2C%20con%20el%20precio%20en%20tu%20moneda%20y%20alertas.%20Gratis%20y%20de%20c%C3%B3digo%20abierto.' }],
      ] },
    });
  }

  async function askFeedback(chatId, userId) {
    await db.kvSet(`opinando:${userId}`, clock());
    return reply(chatId, T.feedbackAsk);
  }

  async function takeFeedback(msg, user, now) {
    const at = Number((await db.kvGet(`opinando:${user.id}`)) || 0);
    if (!at) return false;
    await db.kvSet(`opinando:${user.id}`, 0);
    if (now - at > 3600_000 || R.BUTTONS[msg.text.trim()]) return false;
    if (/^cancelar$/i.test(msg.text.trim())) { await reply(msg.chat.id, T.feedbackCancel); return true; }
    const text = msg.text.trim().slice(0, 2000);
    const who = [user.first_name, user.username ? `@${user.username}` : ''].filter(Boolean).join(' ') || String(user.id);
    await db.kvSet(`opinion:${now}:${user.id}`, JSON.stringify({ id: user.id, who, country: countryOf(user).id, text }));
    await notifyAdmins(`💬 <b>Opinión en Zblind</b> de ${R.esc(who)} (${countryOf(user).label}, id ${user.id}):\n\n${R.esc(text)}\n\nPara contestar: /responder ${user.id} tu respuesta`);
    await reply(msg.chat.id, T.feedbackThanks);
    return true;
  }

  async function sendInstructions(chatId, pin = false) {
    const sent = await reply(chatId, T.instructions(cfg), R.KEYBOARD);
    if (pin && sent?.message_id) {
      try {
        await api.call('unpinAllChatMessages', { chat_id: chatId });
        await api.call('pinChatMessage', { chat_id: chatId, message_id: sent.message_id, disable_notification: true });
      } catch (e) {
        console.error('[fijar]', e.message);
      }
    }
  }

  // --- texto libre ---

  async function onText(msg, user, now) {
    if (await takeFeedback(msg, user, now)) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const it = R.BUTTONS[text] ? { intent: R.BUTTONS[text] } : quickIntent(text);
    switch (it?.intent) {
      case 'price': return cmdPrice(chatId, user, it.asset || 'ZEC', it.currency ? it : null);
      case 'lesson': return sendLesson(chatId, user, it.n);
      case 'simpler': return explainSimpler(chatId, user, now);
      case 'chart': return sendChart(chatId, user, it.asset || 'ZEC');
      case 'learn': return user.lesson > 0 && !it.fromStart ? reply(chatId, R.lessonIndex().text, R.lessonIndex().extra) : sendLesson(chatId, user, 0);
      case 'privacy': return reply(chatId, R.privacy(), { reply_markup: { inline_keyboard: [[{ text: '🎓 Empezar el curso', callback_data: 'l:0' }]] } });
      case 'network': return cmdNetwork(chatId, user);
      case 'alerts': return cmdAlerts(chatId, user);
      case 'alert': return createAlert(chatId, user, it.asset, it.op, it.price);
      case 'alert_help': return reply(chatId, T.alertUsage(countryOf(user)));
      case 'settings': return cmdSettings(chatId, user);
      case 'zone': return reply(chatId, T.askZone, zoneButtons());
      case 'feedback': return askFeedback(chatId, user.id);
      case 'help': return sendInstructions(chatId);
      case 'smalltalk': return reply(chatId, T.smalltalk);
    }
    // Pregunta libre: la responde la IA (con cupo diario)
    const left = await db.consumeUse(user.id, madrid(now, countryOf(user).tz).date, cfg.aiQuestionsPerDay);
    if (left < 0) return reply(chatId, T.limitAI(cfg.aiQuestionsPerDay));
    await api.call('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
    const r = await answer(ai, text, countryOf(user));
    return reply(chatId, r ? `${R.esc(r)}\n\n<i>${R.DISCLAIMER}</i>` : T.aiFail);
  }

  // --- botones en línea ---

  async function onCallback(cq) {
    const [kind, id] = String(cq.data || '').split(':');
    await api.call('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});
    if (!cq.from) return;
    const now = clock();
    const user = await db.upsertUser(cq.from, now);
    const chatId = cq.from.id;
    const c = countryById(id);
    if (kind === 'tz' && c) {
      await db.setCountry(user.id, c.id, c.tz);
      return withCountry(c, async () => {
        await reply(chatId, T.zoneSet(c));
        if (!user.country) return cmdPrice(chatId, { ...user, country: c.id, tz: c.tz }, 'ZEC');
      });
    }
    return withCountry(countryOf(user), async () => {
      if (kind === 'l') return id === 'idx' ? reply(chatId, R.lessonIndex().text, R.lessonIndex().extra) : sendLesson(chatId, user, Number(id));
      if (kind === 'p' && ASSETS[id]) return cmdPrice(chatId, user, id);
      if (kind === 'g' && ASSETS[id]) return sendChart(chatId, user, id);
      if (kind === 'a' && ASSETS[id]) return reply(chatId, T.alertUsage(countryOf(user)).replace('zcash', ASSETS[id].name.toLowerCase()).replace('zcash', ASSETS[id].name.toLowerCase()));
      if (kind === 'del') return reply(chatId, (await db.deleteAlert(user.id, Number(id))) ? T.alertDeleted(id) : T.alertNotFound);
      if (kind === 'set') {
        if (id === 'country') return reply(chatId, T.askZone, zoneButtons());
        if (id === 'daily') { await db.setDaily(user.id, !user.daily); return reply(chatId, user.daily ? T.dailyOff : T.dailyOn); }
        if (id === 'alerts') return cmdAlerts(chatId, user);
        if (id === 'feedback') return askFeedback(chatId, user.id);
        if (id === 'terms') return reply(chatId, T.terms);
        if (id === 'delete') return reply(chatId, T.deleteAsk);
      }
    });
  }

  // --- admin ---

  async function cmdAdmin(cmd, chatId, arg, now) {
    if (cmd === 'stats') {
      const s = await db.stats(now);
      const src = (await db.sources()).map((r) => `${r.source} ${r.n}`).join(' · ');
      return reply(chatId, `Usuarios ${s.users} (+${s.week} esta semana) · bloqueados ${s.blocked}\nAlertas ${s.alerts} · cola ${s.outbox}\nOrigen: ${R.esc(src)}`);
    }
    if (cmd === 'responder') {
      const m = arg.match(/^(\d+)\s+([\s\S]+)$/);
      if (!m) return reply(chatId, 'Uso: /responder USER_ID texto');
      await reply(Number(m[1]), T.feedbackReply(m[2].trim()));
      return reply(chatId, 'Enviado ✅');
    }
    if (cmd === 'opiniones') {
      const rows = await db.kvPrefix('opinion:');
      if (!rows.length) return reply(chatId, 'Aún no hay opiniones.');
      return reply(chatId, rows.slice(-10).map((r) => { const o = JSON.parse(r.v); return `• ${R.esc(o.who)} (${o.country}, ${o.id}): ${R.esc(o.text)}`; }).join('\n\n'));
    }
    return null;
  }

  // --- entrada ---

  async function handleUpdate(u) {
    const fromId = u.message?.from?.id;
    const known = fromId ? await db.getUser(fromId) : null;
    return withCountry(countryOf(known), () => handleUpdateIn(u));
  }

  async function handleUpdateIn(u) {
    const now = clock();
    if (u.callback_query) return onCallback(u.callback_query);
    const msg = u.message;
    if (!msg?.from || msg.chat.type !== 'private') return;
    // Avisos de servicio (p. ej. «mensaje fijado», que firma el propio bot): no son de una persona
    if (msg.from.is_bot || msg.pinned_message) return;
    if (!msg.text) return reply(msg.chat.id, 'Por ahora entiendo texto: escríbeme tu pregunta o usa los botones de abajo 👇');
    const user = await db.upsertUser(msg.from, now);
    if (!msg.text.startsWith('/')) return onText(msg, user, now);

    const [head, ...rest] = msg.text.trim().split(/\s+/);
    const cmd = head.slice(1).split('@')[0].toLowerCase();
    const arg = rest.join(' ');
    const chatId = msg.chat.id;
    switch (cmd) {
      case 'start':
        if (/^[A-Za-z0-9_-]{1,64}$/.test(arg)) await db.setSource(user.id, arg.toLowerCase());
        await sendInstructions(chatId, true);
        await reply(chatId, 'Así funciona: toca «🎓 Aprende Zcash» para la primera lección, o pregúntame lo que quieras, por ejemplo «¿qué es una dirección blindada?».', { reply_markup: { inline_keyboard: [[{ text: '📤 Compártelo con alguien', url: 'https://t.me/share/url?url=https%3A%2F%2Ft.me%2FZblindBot%3Fstart%3Damigo&text=Mira%20este%20bot%3A%20te%20ense%C3%B1a%20Zcash%20desde%20cero%20en%20espa%C3%B1ol%2C%20con%20el%20precio%20en%20tu%20moneda%20y%20alertas.%20Gratis%20y%20de%20c%C3%B3digo%20abierto.' }]] } });
        if (!user.country) return reply(chatId, T.askZone, zoneButtons());
        return cmdPrice(chatId, user, 'ZEC');
      case 'ayuda': case 'help': return sendInstructions(chatId);
      case 'precio': return cmdPrice(chatId, user, /btc|bitcoin/i.test(arg) ? 'BTC' : 'ZEC');
      case 'grafico': return sendChart(chatId, user, /btc|bitcoin/i.test(arg) ? 'BTC' : 'ZEC');
      case 'aprende': case 'curso': return sendLesson(chatId, user, Number(arg) ? Number(arg) - 1 : user.lesson ?? 0);
      case 'privacidad': return reply(chatId, R.privacy());
      case 'red': return cmdNetwork(chatId, user);
      case 'alertas': return cmdAlerts(chatId, user);
      case 'ajustes': return cmdSettings(chatId, user);
      case 'pais': case 'zona': case 'moneda': return reply(chatId, T.askZone, zoneButtons());
      case 'opinion': return askFeedback(chatId, user.id);
      case 'terminos': case 'privacy': return reply(chatId, T.terms);
      case 'borrar_mis_datos':
        if (arg.trim().toLowerCase() !== 'confirmar') return reply(chatId, T.deleteAsk);
        await db.deleteUserData(user.id);
        return reply(chatId, T.deleted);
    }
    if (cfg.adminIds.includes(user.id)) {
      const res = await cmdAdmin(cmd, chatId, arg, now);
      if (res !== null) return res;
    }
    return onText({ ...msg, text: arg || cmd }, user, now);
  }

  const commands = [
    ['precio', 'Precio de Zcash en tu moneda'],
    ['aprende', 'Curso «Zcash desde cero»'],
    ['privacidad', 'Guía rápida de privacidad'],
    ['red', 'La red Zcash ahora'],
    ['grafico', 'Gráfico de 72 horas'],
    ['alertas', 'Tus alertas de precio'],
    ['ajustes', 'Tu país, tu moneda y tus avisos'],
    ['opinion', 'Cuéntanos qué mejorar'],
    ['ayuda', 'Cómo funciona'],
    ['terminos', 'Términos y privacidad'],
    ['borrar_mis_datos', 'Borrar tus datos'],
  ].map(([command, description]) => ({ command, description }));

  return { handleUpdate, commands };
}
