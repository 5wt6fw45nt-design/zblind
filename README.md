# Zblind 🛡️ Zcash en español

**Zblind** es un bot de Telegram gratuito y de código abierto que enseña **Zcash desde cero** a hispanohablantes de España y Latinoamérica: precio en su moneda, un curso corto, una guía de privacidad, alertas y el estado de la red, con datos de la propia cadena.

👉 **Pruébalo:** [@ZblindBot](https://t.me/ZblindBot)

> Sin Premium, sin pagos y sin publicidad. Información y formación, no consejo de inversión.

## Qué hace

| | |
|---|---|
| 💰 **Precio** | ZEC en la moneda de cada país (euros, pesos mexicanos, argentinos, colombianos, chilenos, uruguayos, dominicanos, soles, dólares…), en dólares, frente a BTC y en **Maya Protocol** (precio descentralizado, calculado en cadena). |
| 🎓 **Curso «Zcash desde cero»** | 10 lecciones cortas: qué es Zcash, diferencia con Bitcoin, direcciones blindadas, claves de visualización, carteras de autocustodia, cómo blindar, **Ironwood (NU6.3)** y riesgos. |
| 🛡️ **Guía de privacidad** | Buenas prácticas para usar Zcash en privado (direcciones `u1`, blindar lo que llega de un exchange, migrar de Orchard a Ironwood…). |
| 🌐 **Red Zcash** | Altura de bloque, ZEC emitidos y **qué parte está blindada**, por fondo (Ironwood, Orchard, Sapling, Sprout, transparente, reserva). |
| 🔔 **Alertas** | En lenguaje normal y en tu moneda: «avísame si zcash baja de 900». |
| ❓ **Preguntas libres** | Responde dudas sobre Zcash con la IA gratuita de Cloudflare, anclada a una lista de hechos verificados y sin dar consejos de inversión. |
| ☀️ **Resumen diario** | A las 9:00 de cada país: precio, % blindado y un consejo de privacidad. |
| 🌎 **15 países** | España, México, Argentina, Colombia, Venezuela, Chile, Perú, Uruguay, Ecuador, Rep. Dominicana, Puerto Rico, Centroamérica y EE. UU. |

## Fuentes de datos

- **Coinbase** (API pública): precio de ZEC y BTC en cada moneda y velas horarias.
- **Maya Protocol** (Midgard, fondo `ZEC.ZEC`): precio de ZEC en un exchange descentralizado.
- **Explorador de Zcash de Nighthawk** (código abierto): estado de la red y fondos de valor (`valuePools`).
- **QuickChart**: imagen del gráfico de 72 horas.

## Cómo está hecho

- **Cloudflare Workers** + **D1** (SQLite) + **Workers AI** (Llama 3.3), todo en el plan gratuito.
- Sin dependencias: JavaScript estándar (ESM).
- Un motor que se ejecuta cada minuto (precios y alertas) y cada 10 minutos (cambio en 24 h, Maya y red), respetando los límites del plan gratuito (≤ 50 consultas de D1 y ≤ 50 peticiones externas por ejecución).
- Webhook de Telegram con secreto; los secretos viven en Cloudflare, nunca en el código.

```
src/
  worker.js    entrada: /webhook (Telegram), /tick (cada minuto), /setup
  bot.js       conversación: botones, texto libre, curso, alertas, ajustes, opinión
  engine.js    precios, alertas y resumen diario por zona horaria
  market.js    Coinbase, Maya Protocol y explorador de Zcash
  lessons.js   curso, guía de privacidad y hechos para la IA
  nlu.js       reglas + IA para entender lo que escribe la gente
  render.js    todos los textos
  db.js        D1
test/          pruebas (node --test), con datos simulados
```

## Ejecutarlo tú

```bash
npm test                                        # pruebas
npx wrangler d1 create zash-bot                 # y pon el database_id en wrangler.toml
npx wrangler d1 migrations apply zash-bot --remote
npx wrangler secret put BOT_TOKEN               # token de @BotFather
npx wrangler secret put WEBHOOK_SECRET          # una cadena aleatoria
npx wrangler secret put ADMIN_IDS               # tu ID de Telegram (opiniones y /stats)
npx wrangler secret put RELOJ_SECRET            # si usas un Worker reloj que llame a /tick
npx wrangler deploy
curl "https://TU-WORKER.workers.dev/setup?secret=WEBHOOK_SECRET"
```

Para el minuto a minuto, añade un Cron Trigger (`* * * * *`) en `wrangler.toml` o un Worker reloj que haga `POST /tick` con la cabecera `x-reloj-secret`.

## Privacidad

Guarda solo el ID de Telegram, el nombre de usuario, el país y las alertas. No vende ni comparte datos. Las preguntas se procesan con Workers AI y no se guardan. `/borrar_mis_datos` lo borra todo.

## English

**Zblind** is a free, open-source Telegram bot that teaches **Zcash from scratch to Spanish speakers** in Spain and Latin America: ZEC price in local currencies (plus Maya Protocol's on-chain price), a 10-lesson course (including the Ironwood/NU6.3 upgrade), a privacy guide, price alerts, live shielded-supply stats from the Zcash chain, and AI-assisted Q&A grounded in verified facts. No premium tier, no payments, no investment advice. Runs on Cloudflare Workers + D1 + Workers AI (free tier).

## Licencia

[MIT](LICENSE) · Un proyecto de riberasistemas. Zcash es una marca de sus titulares; Zblind es un proyecto independiente de la comunidad.
