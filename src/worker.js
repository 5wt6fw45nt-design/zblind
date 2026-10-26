// Cloudflare Worker: Telegram llama a /webhook con cada mensaje; el cron (cada minuto) mueve el motor.

import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { createApi, drainOutbox } from './telegram.js';
import { createEngine } from './engine.js';
import { createBot } from './bot.js';

const AVISO_VIEJO = 'Ahora me llamo Zblind. Mismo bot, nombre nuevo, para que nadie me confunda con la cartera Zashi. Pulsa el botón y dale a Iniciar: tus alertas y tu avance siguen guardados.';

function build(env) {
  const cfg = loadConfig(env);
  const db = createDb(env.DB);
  const api = createApi(cfg.token);
  const engine = createEngine({ db, cfg });
  const bot = createBot({ api, db, cfg, ai: env.AI });
  return { cfg, db, api, engine, bot };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/webhook' && req.method === 'POST') {
      if (req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
      }
      const app = build(env);
      try {
        await app.bot.handleUpdate(await req.json());
      } catch (e) {
        console.error('[update]', e); // 200 igualmente: si no, Telegram reintenta el mismo mensaje en bucle
      }
      return new Response('ok');
    }

    // El bot antiguo (@ZashCash_bot) solo contesta que ahora es @ZblindBot. Usa su propio token (OLD_BOT_TOKEN).
    if (url.pathname === '/viejo' && req.method === 'POST') {
      if (!env.OLD_BOT_TOKEN || req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
      }
      const u = await req.json();
      const chatId = u.message?.chat?.id ?? u.callback_query?.message?.chat?.id;
      if (chatId) {
        try {
          if (u.callback_query) await createApi(env.OLD_BOT_TOKEN).call('answerCallbackQuery', { callback_query_id: u.callback_query.id });
          await createApi(env.OLD_BOT_TOKEN).call('sendMessage', {
            chat_id: chatId,
            text: AVISO_VIEJO,
            reply_markup: { inline_keyboard: [[{ text: 'Ir a Zblind', url: 'https://t.me/ZblindBot?start=zash' }]] },
          });
        } catch (e) {
          console.error('[viejo]', e);
        }
      }
      return new Response('ok');
    }

    // Una vez: el webhook del bot antiguo apunta a /viejo.
    if (url.pathname === '/setup-viejo') {
      if (!env.OLD_BOT_TOKEN || !env.WEBHOOK_SECRET || url.searchParams.get('secret') !== env.WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
      }
      const viejo = createApi(env.OLD_BOT_TOKEN);
      await viejo.call('setWebhook', { url: `${url.origin}/viejo`, secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] });
      await viejo.call('setMyCommands', { commands: [] });
      return Response.json(await viejo.call('getWebhookInfo'));
    }

    // El reloj (Worker ribera-reloj) llama aquí cada minuto por un service binding: sustituye al cron propio.
    if (url.pathname === '/tick' && req.method === 'POST') {
      if (!env.RELOJ_SECRET || req.headers.get('x-reloj-secret') !== env.RELOJ_SECRET) return new Response('forbidden', { status: 403 });
      const { cfg, db, api, engine } = build(env);
      await db.kvSet('last_tick', Math.floor(Date.now() / 600_000) * 600_000); // a 10 min: una escritura cada 10 min, no cada minuto
      const used = await engine.tick(Date.now());
      const sent = await drainOutbox(api, db, cfg.subrequestBudget - used);
      return Response.json({ used, sent });
    }

    // Una vez tras cada despliegue: registra el webhook y el menú de comandos.
    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('secret') !== env.WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
      }
      const { api, bot } = build(env);
      await api.call('setWebhook', {
        url: `${url.origin}/webhook`,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      });
      await api.call('setMyCommands', { commands: bot.commands });
      return Response.json(await api.call('getWebhookInfo'));
    }

    return new Response('Zblind · @ZblindBot · Zcash en español, gratis y de código abierto', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },

  async scheduled(_event, env, ctx) {
    const { cfg, db, api, engine } = build(env);
    const run = async () => {
      const used = await engine.tick(Date.now());
      await drainOutbox(api, db, cfg.subrequestBudget - used);
    };
    ctx.waitUntil(run());
  },
};
