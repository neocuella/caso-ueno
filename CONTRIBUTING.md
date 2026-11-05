# Cómo contribuir

Este proyecto reúne lo que se publicó sobre ueno bank, el BCP y el Gobierno, y lo ordena por fecha. Cualquiera puede sumar fuentes, corregir datos o proponer entradas nuevas. No hace falta saber programar: también se puede aportar abriendo un *issue* con el formulario.

## Reglas editoriales

Estas reglas valen para todo aporte. Un cambio que no las cumpla no se incorpora.

1. **Solo lo publicado.** La página muestra únicamente el medio, el titular, la fecha y el enlace de cada publicación. No se agregan conclusiones, hipótesis ni textos propios a la página. Los campos `title`, `summary` y `note` son descripciones internas y no se publican.
2. **Atribución siempre.** Las descripciones internas dicen quién afirma qué: “Según ABC Color…”, “Filizzola afirmó…”, “El BCP informó…”. Las cifras llevan la fuente que las dio.
3. **Titulares y fragmentos literales.** `headline` se copia tal cual fue publicado, aunque sea valorativo. `lede` es opcional: se cita solo el primer copete, completo si cabe dentro de 25 palabras y 500 caracteres, o su fragmento inicial literal hasta esos límites; nunca párrafos del cuerpo de la nota. Si se acorta, se corta entre palabras y se agrega `…` dentro del límite. No se corrige ni se suaviza la redacción del medio. Las descripciones internas se escriben en tono neutro.
4. **Todas las versiones.** Si las partes dan versiones distintas, se registran ambas, cada una con su fuente. Si el aludido respondió, su respuesta va en la misma entrada o en una entrada propia.
5. **Enlaces reales.** Nunca se inventa ni se “reconstruye” una URL. Hay que abrir el enlace y confirmar que respalda lo que dice la entrada antes de agregarlo.
6. **Fechas.** La página usa solo fechas de publicación: cada entrada se ubica en la fecha de su primera publicación, que sale de `published` en `data/sources.csv`. Por eso cada fuente debe llevar su fecha de publicación siempre que exista. `date` en `data/events.csv` es una referencia interna (forma parte del id) y no se muestra; `revealed` es opcional.
7. **Acusaciones como acusaciones.** Denuncias, imputaciones y pedidos de juicio político se describen como tales, sin presentarlos como hechos probados.
8. **Datos personales.** Solo personas con cargos públicos o roles relevantes en el caso, y solo lo que publicaron las fuentes. Nada de domicilios, teléfonos ni datos de clientes del banco.
9. **Solo en español.** Se registran publicaciones en español. Si un medio o una institución publica la misma nota en varios idiomas, se enlaza la versión en español; las notas que solo existen en otro idioma no se incorporan.
10. **Una publicación, un lugar.** Cada publicación va en una sola entrada, en su fecha, con su propio titular y copete. Si una nota toca varios hechos, va en el hecho del que trata su titular. Si un medio vuelve a subir o republica un material (un video resubido, una nota reeditada), es una publicación distinta: va en su propia fecha, con el titular y el copete que tiene esa versión. No se ubica la republicación en la fecha del original ni se le ponen al original el titular o el copete de la republicación. Tampoco se enlazan fragmentos (por ejemplo, el minuto de un video con `&t=`) para repartir una misma pieza entre varias entradas: se enlaza la publicación completa.
11. **Tres meses como máximo.** Una entrada agrupa publicaciones cercanas en el tiempo. Ninguna fuente puede tener una fecha de publicación más de 90 días posterior a la primera publicación de su entrada. Una nota que retoma un hecho anterior después de ese plazo (un balance, una nota de archivo, un posteo que vuelve a circular) va en una entrada propia, en su fecha, o en la entrada de esos días que trate lo mismo.

## Qué se puede aportar

| Aporte | Dónde | Cómo |
|---|---|---|
| Una nota, video o publicación que cubre un hecho que ya está | `data/sources.csv` | Formulario “Nueva fuente” o pull request |
| Un hecho que todavía no está | `data/events.csv` + `data/sources.csv` | Formulario “Nueva entrada” o pull request |
| Un error (fecha, titular, enlace roto, resumen inexacto) | Ambos | Formulario “Corrección” o pull request |
| Una copia archivada de un enlace | `archive_url` en `data/sources.csv` | Pull request |

## Sin programar: con un formulario

En el repositorio, entrá a **Issues → New issue** y elegí el formulario que corresponda. Un mantenedor revisa el aporte, lo pasa al CSV y cierra el issue.

## Con un pull request

Requisitos: Git y Node.js 18 o superior. El proyecto no tiene dependencias externas.

```bash
git clone <url-del-repositorio>
cd caso-ueno
```

Los datos son archivos CSV comunes: se editan con la herramienta que prefieras (una planilla como LibreOffice, Excel o Google Sheets, un editor de texto o el editor web de GitHub), siempre que se guarden como **CSV, UTF-8, separado por comas**.

### Agregar una fuente a una entrada existente

1. Buscá el id de la entrada en `data/events.csv` (por ejemplo, `2026-11-03-bcp-inicia-resolucion-ueno-bank`).

2. Agregá una fila a `data/sources.csv` con ese `event_id`:

- `url`: el enlace a la publicación, sin parámetros de rastreo (`utm_…`, `fbclid`, etc.). Antes, revisá que no esté ya en el archivo.
- `outlet`: el nombre del medio o de quien publica.
- `type`: `article` (nota), `social` (publicación en redes), `video` o `document` (documento oficial, comunicado, resolución, expediente).
- `headline`: el titular tal como se publicó.
- `published`: la fecha de publicación, `AAAA-MM-DD`.
- `lede` (opcional): el primer copete tal como se publicó, con los límites de la regla 3. Comprobá en la nota que sea el copete y no un párrafo del cuerpo.
- `archive_url` (opcional): una copia archivada del enlace.
- `last_checked`: la fecha en que abriste el enlace y confirmaste que respalda la entrada.

Los titulares y copetes son texto de cada medio y no están cubiertos por la licencia CC BY 4.0 del proyecto (ver `data/LICENSE.md`). Se citan con fines informativos, siempre con el medio y el enlace.

3. Validá y construí:

```bash
npm run validate
```

```bash
npm run build
```

4. Abrí `dist/index.html` en el navegador para ver el resultado y enviá el pull request.

### Agregar copetes a fuentes existentes

El copete es opcional. Cuando existe, la página lo muestra dentro del diario; si no, muestra líneas decorativas. Para agregarlo, completá `lede` en la fila de `data/sources.csv`:

- abrí la nota y copiá el primer copete publicado, tal cual;
- si supera 25 palabras o 500 caracteres, usá un fragmento inicial literal: cortá entre palabras y agregá `…` dentro del límite;
- nunca uses un párrafo del cuerpo de la nota; si la nota no tiene copete, dejá el campo vacío.

### Agregar una entrada nueva

Agregá una fila a `data/events.csv` y al menos una fila a `data/sources.csv` con el mismo `event_id`.

- `id`: fecha del hecho + 3 a 6 palabras clave, sin tildes, en minúsculas y con guiones. Ejemplo: `2026-11-04-diputados-aprueba-anticipo-ahorristas`. Un id publicado no se cambia nunca, porque otros pueden estar enlazándolo.
- `thread`: uno de los ids de `data/threads.csv`.
- `topics`: uno o más ids de `data/topics.csv`, separados por `;`.
- `milestone`: `true` solo para hechos que cambian el curso de la historia. Ante la duda, `false`.

La descripción completa de cada columna está en [data/README.md](data/README.md).

### Qué revisa la validación

`npm run validate` corre automáticamente en cada pull request. Rechaza:

- ids repetidos o mal formados;
- fechas inválidas;
- hilos o temas que no existen;
- entradas sin fuentes, y fuentes de entradas que no existen;
- URLs inválidas o una misma publicación en más de una entrada;
- fuentes publicadas más de 90 días después de la primera publicación de su entrada;
- tipos de fuente desconocidos;
- textos que superan el largo máximo.

Muestra como avisos (no bloquean): fuentes sin titular, URLs con parámetros de rastreo, temas sin entradas.

## Revisión

Cada pull request necesita la aprobación de un mantenedor, que:

- abre cada enlace nuevo y confirma que respalda la entrada;
- revisa que el resumen cumpla las reglas editoriales;
- en temas sensibles, pide una segunda fuente o la respuesta de la parte aludida.

Si un aporte cambia una entrada existente, explicá en el pull request qué cambió y por qué, con el enlace que lo respalda.
