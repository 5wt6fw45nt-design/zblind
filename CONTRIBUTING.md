# Contribuir a Zblind · Contributing

¡Gracias por querer mejorar Zblind! / Thanks for helping improve Zblind!

## Principios
- **Exactitud ante todo.** El contenido educativo (`src/lessons.js`) solo incluye hechos verificables del protocolo Zcash. Cada cambio de contenido debe citar una fuente (ZIP, documentación oficial de z.cash, ZecHub o anuncio de un equipo del ecosistema) en la descripción del pull request.
- **Nunca consejos de inversión** ni recomendaciones de exchanges.
- **Privacidad de los usuarios:** no se guardan más datos que los descritos en el README.
- **Español claro**, para personas sin conocimientos técnicos (España y Latinoamérica).

## Flujo de trabajo
Seguimos como referencia las guías de estilo de [`librustzcash`](https://github.com/zcash/librustzcash/blob/main/CONTRIBUTING.md#styleguides):
- **Ramas:** una rama por cambio, a partir de `main`. Nombres cortos y descriptivos (`curso-leccion-claves`, `fix-alertas-moneda`).
- **Commits:** mensajes en imperativo que expliquen el *qué* y el *porqué*; un cambio lógico por commit. Mantén un historial limpio (rebase antes de fusionar, sin commits de «arreglo» sueltos).
- **Pull requests:** describe el problema, la solución y cómo lo has probado. Todo PR necesita la revisión de un mantenedor y que pasen las pruebas.
- **Pruebas:** `npm test` debe pasar. Si añades una función, añade su prueba en `test/`, simulando una conversación real cuando tenga sentido.
- **Código:** JavaScript estándar (ESM), sin dependencias externas salvo necesidad justificada. Respeta los límites del plan gratuito de Cloudflare (≤ 50 consultas de D1 y ≤ 50 peticiones externas por ejecución).
- **Secretos:** nunca en el código. Usa `wrangler secret put`.

## Informar de problemas
Abre un *issue* con los pasos para reproducirlo. Para problemas de seguridad, escribe a hola@riberasistemas.com en vez de abrir un issue público.

---

**English summary:** content changes must cite a source; no investment advice; one logical change per commit with imperative messages; branch per change and PR review following the `librustzcash` style guides; `npm test` must pass; no secrets in code. Security issues: hola@riberasistemas.com.
