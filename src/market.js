// Datos. Todo de fuentes que permiten este uso, y se citan:
//  · Coinbase: precio de ZEC y BTC en cada moneda y velas horarias (API pública).
//  · Maya Protocol: precio de ZEC en su fondo de intercambio descentralizado, calculado en cadena.
//  · Explorador de Nighthawk (comunidad Zcash, código abierto): estado de la red y fondos blindados.

async function getJson(url, fetchFn = fetch) {
  const res = await fetchFn(url, { headers: { 'user-agent': 'Mozilla/5.0 (zash-bot)' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

/** Precio de 1 unidad del activo en todas las monedas: { USD: 1154.3, EUR: 1038.4, MXN: … } */
export async function fetchRates(assetId, fetchFn) {
  const d = await getJson(`https://api.coinbase.com/v2/exchange-rates?currency=${assetId}`, fetchFn);
  const out = {};
  for (const [k, v] of Object.entries(d?.data?.rates || {})) out[k] = Number(v);
  if (!out.USD) throw new Error(`Coinbase sin precio de ${assetId}`);
  return out;
}

/** Velas horarias (USD), de la más vieja a la más nueva: [{t, o, h, l, c}] */
export async function fetchCandles(product, fetchFn) {
  const rows = await getJson(`https://api.exchange.coinbase.com/products/${product}/candles?granularity=3600`, fetchFn);
  return rows.map((r) => ({ t: r[0] * 1000, o: r[3], h: r[2], l: r[1], c: r[4] })).reverse();
}

/** Precio de ZEC en Maya Protocol (fondo ZEC.ZEC): un precio descentralizado, sacado de la propia cadena. */
export async function fetchMaya(fetchFn) {
  const d = await getJson('https://midgard.mayachain.info/v2/pool/ZEC.ZEC', fetchFn);
  const usd = Number(d.assetPriceUSD);
  if (!usd) throw new Error('Maya sin precio');
  return { usd, depthZec: Number(d.assetDepth) / 1e8 };
}

/** Nodos públicos de carteras ligeras (lightwalletd/Zaino) en línea, según hosh.zec.rocks, el monitor de la comunidad. */
export async function fetchNodes(fetchFn) {
  const d = await getJson('https://hosh.zec.rocks/api/v0/zec.json', fetchFn);
  const all = (d.servers || []).filter((s) => s.online && s.chain === 'main' && s.height > 0);
  const top = Math.max(0, ...all.map((s) => s.height));
  const list = all.filter((s) => !/\.onion$/.test(s.hostname))
    .map((s) => ({ host: `${s.hostname}:${s.port}`, community: !!s.community, uptime: Number(s.uptime_30d) || 0, behind: top - s.height }))
    .sort((a, b) => b.uptime - a.uptime);
  return { list, tor: all.length - list.length, top };
}

/** Estado de la red Zcash: altura, ZEC emitidos y cuánto hay en cada fondo (transparente o blindado). */
export async function fetchNetwork(fetchFn) {
  const d = await getJson('https://mainnet.zcashexplorer.app/api/v1/blockchain-info', fetchFn);
  const pools = Object.fromEntries((d.valuePools || []).map((p) => [p.id, Number(p.chainValue || 0)]));
  const supply = Number(d.chainSupply?.chainValue || 0);
  // Blindado = todo lo que no es transparente ni la reserva de financiación del desarrollo (lockbox)
  const shielded = Object.entries(pools).filter(([id]) => !['transparent', 'lockbox'].includes(id)).reduce((s, [, v]) => s + v, 0);
  return { height: Number(d.blocks), supply, pools, shielded, shieldedPct: supply ? shielded / supply : 0 };
}
