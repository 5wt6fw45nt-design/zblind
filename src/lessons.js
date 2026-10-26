// Curso «Zcash desde cero», en español claro. Solo hechos estables del protocolo; nada de consejos de inversión.
// Cada lección cabe en una pantalla de móvil. Se navega con botones (anterior / siguiente / índice).

export const LESSONS = [
  {
    title: '1. ¿Qué es Zcash?',
    text: [
      'Zcash (ZEC) es <b>dinero digital</b>, como bitcoin: nadie lo controla, no depende de ningún banco ni gobierno y se envía por internet a cualquier persona del mundo.',
      '',
      'Nació en <b>2016</b> a partir de investigación universitaria y del propio código de Bitcoin. Por eso se parecen mucho:',
      '• Habrá como máximo <b>21 millones</b> de ZEC, igual que bitcoins.',
      '• Se crean ZEC nuevos con la minería, y cada unos 4 años la emisión se reduce a la mitad (el «halving»).',
      '',
      'La gran diferencia: con Zcash <b>puedes elegir que tus pagos sean privados</b>. Lo vemos en la siguiente lección.',
    ],
  },
  {
    title: '2. Bitcoin y Zcash: la diferencia',
    text: [
      'En <b>Bitcoin</b>, todo es público: cualquiera puede ver cuánto hay en una dirección y a quién envía dinero. Es como si tu cuenta del banco estuviera colgada en internet.',
      '',
      'En <b>Zcash</b> hay dos tipos de direcciones:',
      '• <b>Transparentes</b> (empiezan por <code>t</code>): funcionan como en Bitcoin, todo a la vista.',
      '• <b>Blindadas</b> (las unificadas empiezan por <code>u1</code>): ocultan <b>quién envía, quién recibe y cuánto</b>.',
      '',
      'Lo consigue con unas pruebas matemáticas llamadas <b>pruebas de conocimiento cero</b> (zk-SNARKs): la red comprueba que el pago es válido sin ver sus datos.',
    ],
  },
  {
    title: '3. Privacidad no es esconder nada malo',
    text: [
      'Cerrar un sobre antes de enviar una carta no es sospechoso: es normal. La privacidad financiera es lo mismo.',
      '',
      'Sin privacidad, quien vea tu dirección sabe cuánto tienes, cuánto cobras y en qué gastas: tu empresa, tu casero o un ladrón.',
      '',
      'Y si alguna vez lo necesitas, Zcash te deja <b>enseñar tus movimientos a quien tú elijas</b> (tu asesor, tu gestor o Hacienda) con una <b>clave de visualización</b>, sin dar acceso a tu dinero.',
    ],
  },
  {
    title: '4. Tu cartera: tú guardas la llave',
    text: [
      'Para usar Zcash necesitas una <b>cartera</b> (una app). Las buenas son de <b>autocustodia</b>: el dinero es tuyo y nadie te lo puede congelar.',
      '',
      'Al crearla te da una <b>frase de recuperación</b> (normalmente 24 palabras). Es la llave de todo:',
      '• Apúntala en papel y guárdala en un sitio seguro.',
      '• <b>Nunca</b> se la des a nadie ni la escribas en una web: ningún soporte de verdad te la pedirá jamás.',
      '',
      'Elige una cartera que use <b>direcciones blindadas</b> por defecto (por ejemplo, Zashi). La lista oficial está en la web <b>z.cash</b>. Descárgala siempre de la tienda oficial o de su web.',
    ],
  },
  {
    title: '5. Cómo conseguir ZEC',
    text: [
      'Lo habitual es comprar en un <b>exchange</b> (una plataforma de compraventa) y enviarlo a tu cartera. Zblind no recomienda ninguno: elige uno autorizado en tu país.',
      '',
      'Un detalle importante: algunos exchanges solo envían a direcciones <b>transparentes</b> (las que empiezan por <code>t</code>). No pasa nada: tu cartera te da una dirección transparente para recibir y luego <b>«blindas»</b> los fondos con un toque.',
      '',
      'Desde ese momento, tus ZEC están en privado.',
    ],
  },
  {
    title: '6. Enviar en privado',
    text: [
      'Un pago es totalmente privado cuando va <b>de una dirección blindada a otra blindada</b>. Así no se ve ni quién paga, ni quién cobra, ni cuánto.',
      '',
      'Además, puedes añadir un <b>mensaje cifrado</b> (un «memo») que solo lee quien recibe: un concepto, una factura o un «gracias».',
      '',
      'Consejos:',
      '• Pide siempre direcciones que empiecen por <code>u1</code>.',
      '• Evita mover dinero entre transparente y blindado una y otra vez: deja pistas.',
    ],
  },
  {
    title: '7. Cómo funciona la red',
    text: [
      'Zcash usa <b>minería</b>, como Bitcoin: ordenadores de todo el mundo validan los pagos y crean bloques, más o menos uno cada <b>75 segundos</b>.',
      '',
      'Una parte de lo que se emite se reserva para financiar el desarrollo y a la comunidad, por ejemplo mediante ayudas a proyectos independientes.',
      '',
      'Con «🌐 Red Zcash» puedes ver en directo cuántos ZEC existen y <b>qué parte está blindada</b>, con datos sacados de la propia red.',
    ],
  },
  {
    title: '8. Novedad 2026: Ironwood',
    text: [
      'El <b>28 de julio de 2026</b> Zcash activó <b>Ironwood</b>, un nuevo fondo blindado que sustituye a Orchard como sitio principal para los pagos privados.',
      '',
      '¿Por qué? Los propios desarrolladores encontraron un fallo en Orchard. Se corrigió y, para más garantías, se creó Ironwood: con él se puede comprobar que no existen más ZEC de los que debe haber.',
      '',
      'Qué tienes que hacer:',
      '• Si tienes ZEC en <b>Orchard</b>, <b>actualiza tu cartera</b> y pásalos a Ironwood. No es automático.',
      '• Tu dinero en Orchard no se ha perdido: puede salir siempre, pero conviene moverlo.',
      '',
      'Con «🌐 Red Zcash» ves cuántos ZEC hay ya en Ironwood.',
    ],
  },
  {
    title: '9. Riesgos y sentido común',
    text: [
      '• <b>El precio sube y baja mucho.</b> No metas dinero que necesites.',
      '• <b>Las estafas existen:</b> nadie regala ZEC, nadie te va a «doblar» tu dinero y ningún soporte te pide la frase de recuperación.',
      '• <b>Impuestos:</b> en muchos países hay que declarar las ganancias con criptomonedas. Consulta la normativa de tu país.',
      '• <b>Normas:</b> en la Unión Europea, el reglamento contra el blanqueo prevé que desde julio de 2027 los exchanges no ofrezcan criptomonedas de privacidad. Lo que tengas en tu propia cartera sigue siendo tuyo.',
      '',
      'Zblind te da información y formación, <b>nunca consejos de inversión</b>.',
    ],
  },
  {
    title: '10. Siguientes pasos',
    text: [
      '¡Ya sabes lo esencial de Zcash! 🎓',
      '',
      '• Pregúntame lo que quieras, como lo dirías: «¿qué es una clave de visualización?», «¿Zcash es legal?».',
      '• Mira el precio en tu moneda y ponte alertas.',
      '• «🛡️ Privacidad» tiene una guía rápida para usar Zcash en privado.',
      '',
      'Para seguir aprendiendo, la comunidad tiene mucho contenido en <b>zechub.wiki</b> y en <b>z.cash</b>.',
    ],
  },
];

export const PRIVACY_GUIDE = [
  '🛡️ <b>Guía rápida de privacidad con Zcash</b>',
  '',
  '1️⃣ Usa una cartera con <b>direcciones blindadas</b> por defecto.',
  '2️⃣ Comparte direcciones que empiecen por <code>u1</code> (unificadas), no por <code>t</code>.',
  '3️⃣ Si recibes de un exchange en una dirección <code>t</code>, <b>blíndalo</b> en cuanto llegue.',
  '4️⃣ Paga de blindada a blindada: así no se ve quién, a quién ni cuánto.',
  '5️⃣ No muevas siempre la misma cantidad justo después de recibirla: deja pasar tiempo y cambia los importes.',
  '6️⃣ Tu frase de recuperación, en papel y solo para ti.',
  '7️⃣ ¿Tienes ZEC en Orchard? <b>Actualiza tu cartera y pásalos a Ironwood</b>, el fondo blindado nuevo (desde julio de 2026).',
  '8️⃣ ¿Necesitas justificar tus movimientos? Usa una <b>clave de visualización</b>: enseña sin dar acceso a tu dinero.',
  '',
  '<i>La privacidad es un derecho. Úsala con responsabilidad y cumpliendo la ley de tu país.</i>',
];

/** Datos de partida para la IA: así responde con hechos y no se inventa nada. */
export const FACTS = `Zcash (ZEC): criptomoneda lanzada en octubre de 2016, basada en el código de Bitcoin. Máximo 21 millones de ZEC. Prueba de trabajo (algoritmo Equihash), bloques cada unos 75 segundos. Halving aproximadamente cada 4 años (2020 y 2024).
Direcciones transparentes (empiezan por t, públicas como en Bitcoin) y blindadas (Sapling empiezan por zs; unificadas por u1). Las transacciones blindadas ocultan remitente, destinatario e importe con pruebas de conocimiento cero (zk-SNARKs; Halo 2 en Orchard, sin configuración de confianza).
Memo cifrado de hasta 512 bytes en pagos blindados. Claves de visualización (viewing keys) para enseñar movimientos a terceros sin dar acceso a los fondos.
Carteras de autocustodia con soporte blindado: lista oficial en z.cash. Frase de recuperación: nunca compartirla.
Ironwood (NU6.3): nuevo fondo blindado activado el 28 de julio de 2026 (bloque 3.428.143) tras encontrarse en mayo de 2026 un fallo en el circuito de Orchard; reutiliza las acciones de Orchard y Halo 2 con su propio árbol y contabilidad, y permite verificar mejor el total de ZEC. Orchard queda restringido: los fondos pueden salir (turnstile) y se recomienda migrarlos a Ironwood con una cartera actualizada; la migración no es automática.
Parte de la emisión financia el desarrollo y ayudas a la comunidad (Zcash Community Grants).
UE: el reglamento contra el blanqueo (AMLR) prevé que desde julio de 2027 los proveedores de criptoactivos no gestionen criptomonedas con anonimato reforzado; la tenencia en carteras propias no se prohíbe.`;
