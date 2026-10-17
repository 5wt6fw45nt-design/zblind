// Acceso a D1. Pocas consultas por ejecución: el plan gratuito permite 50.

export function createDb(d1) {
  const run = (sql, ...a) => d1.prepare(sql).bind(...a).run();
  const first = (sql, ...a) => d1.prepare(sql).bind(...a).first();
  const all = async (sql, ...a) => (await d1.prepare(sql).bind(...a).all()).results;

  /** INSERT de muchas filas en una sola consulta (como mucho 99 parámetros por consulta en D1). */
  // D1 cobra cada fila escrita (100.000 al día gratis): solo se escribe la clave si el valor cambia.
  const KV_UPSERT = ' ON CONFLICT(k) DO UPDATE SET v = excluded.v WHERE kv.v IS NOT excluded.v';
  async function insertMany(prefix, rows, tail = '') {
    if (!rows.length) return;
    const per = rows[0].length;
    const chunk = Math.max(1, Math.floor(99 / per));
    for (let i = 0; i < rows.length; i += chunk) {
      const part = rows.slice(i, i + chunk);
      await run(`${prefix} ${part.map(() => `(${Array(per).fill('?').join(', ')})`).join(', ')}${tail}`, ...part.flat());
    }
  }
  async function deleteIn(table, ids) {
    for (let i = 0; i < ids.length; i += 90) {
      const part = ids.slice(i, i + 90);
      if (part.length) await run(`DELETE FROM ${table} WHERE id IN (${part.map(() => '?').join(', ')})`, ...part);
    }
  }

  return {
    async upsertUser(from, now) {
      await run(
        `INSERT INTO users (id, username, first_name, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET username = excluded.username, first_name = excluded.first_name, blocked = 0`,
        from.id, from.username ?? null, from.first_name ?? null, now,
      );
      return this.getUser(from.id);
    },
    getUser: (id) => first('SELECT * FROM users WHERE id = ?', id),
    setCountry: (id, country, tz) => run('UPDATE users SET country = ?, tz = ? WHERE id = ?', country, tz, id),
    setDaily: (id, on) => run('UPDATE users SET daily = ? WHERE id = ?', on ? 1 : 0, id),
    setLesson: (id, n) => run('UPDATE users SET lesson = ? WHERE id = ?', n, id),
    setSource: (id, source) => run('UPDATE users SET source = ? WHERE id = ? AND source IS NULL', source, id),
    markBlocked: (id) => run('UPDATE users SET blocked = 1 WHERE id = ?', id),
    /** Gasta una pregunta a la IA del cupo diario. Devuelve las que quedan (-1 si no quedaba ninguna). */
    async consumeUse(id, date, limit) {
      const u = await first('SELECT uses_date, uses FROM users WHERE id = ?', id);
      const used = u?.uses_date === date ? u.uses : 0;
      if (used >= limit) return -1;
      await run('UPDATE users SET uses_date = ?, uses = ? WHERE id = ?', date, used + 1, id);
      return limit - used - 1;
    },
    dailyUsers: () => all('SELECT id, tz, country FROM users WHERE blocked = 0 AND daily = 1'),
    sources: () => all("SELECT COALESCE(source, 'directo') AS source, COUNT(*) AS n FROM users GROUP BY 1 ORDER BY n DESC"),
    async stats(now) {
      const u = await first('SELECT COUNT(*) AS users, SUM(blocked) AS blocked, SUM(created_at > ?) AS week FROM users', now - 7 * 864e5);
      const a = await first('SELECT COUNT(*) AS n FROM alerts');
      const o = await first('SELECT COUNT(*) AS n FROM outbox');
      return { users: u.users, blocked: u.blocked ?? 0, week: u.week ?? 0, alerts: a.n, outbox: o.n };
    },
    async deleteUserData(id) {
      await d1.batch([
        d1.prepare('DELETE FROM alerts WHERE user_id = ?').bind(id),
        d1.prepare('DELETE FROM outbox WHERE chat_id = ?').bind(id),
        d1.prepare('DELETE FROM users WHERE id = ?').bind(id),
      ]);
    },

    addAlert: async (a) =>
      (await run('INSERT INTO alerts (user_id, asset, op, price, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)', a.userId, a.asset, a.op, a.price, a.currency, a.ts)).meta.last_row_id,
    userAlerts: (userId) => all('SELECT * FROM alerts WHERE user_id = ? ORDER BY id', userId),
    countAlerts: async (userId) => (await first('SELECT COUNT(*) AS n FROM alerts WHERE user_id = ?', userId)).n,
    deleteAlert: async (userId, id) => (await run('DELETE FROM alerts WHERE user_id = ? AND id = ?', userId, id)).meta.changes > 0,
    activeAlerts: () => all('SELECT a.* FROM alerts a JOIN users u ON u.id = a.user_id WHERE u.blocked = 0'),
    deleteAlerts: (ids) => deleteIn('alerts', ids),

    kvGet: async (k) => (await first('SELECT v FROM kv WHERE k = ?', k))?.v ?? null,
    kvSet: (k, v) => run(`INSERT INTO kv (k, v) VALUES (?, ?)${KV_UPSERT}`, k, String(v)),
    kvPrefix: (prefix) => all('SELECT k, v FROM kv WHERE k LIKE ? ORDER BY k', `${prefix}%`),
    async kvAll() {
      return new Map((await all('SELECT k, v FROM kv WHERE k NOT LIKE ? AND k NOT LIKE ?', 'opinion:%', 'opinando:%')).map((r) => [r.k, r.v]));
    },
    kvSetMany: (entries) => insertMany('INSERT INTO kv (k, v) VALUES', entries.map(([k, v]) => [k, String(v)]), KV_UPSERT),

    enqueueMany: (msgs, now) => insertMany('INSERT INTO outbox (chat_id, text, created_at) VALUES', msgs.map(([id, text]) => [id, text, now])),
    peekOutbox: (n) => all('SELECT * FROM outbox ORDER BY id LIMIT ?', n),
    deleteOutboxMany: (ids) => deleteIn('outbox', ids),
  };
}
