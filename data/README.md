# Datos

Todos los archivos son CSV en UTF-8, separados por comas, con comillas dobles cuando un campo contiene comas, comillas o saltos de línea. Los nombres de columna están en inglés para facilitar el uso con otras herramientas; el contenido está en español.

El descriptor [datapackage.json](datapackage.json) sigue el estándar [Frictionless Data](https://specs.frictionlessdata.io/) y permite validar y cargar los datos con herramientas como `frictionless`, R o pandas.

```
data/
├── events.csv          una fila por hecho
├── sources.csv         una fila por fuente que respalda un hecho
├── threads.csv         hilos (actor principal), definen el color en la página
├── topics.csv          temas que agrupan hechos a lo largo del tiempo
├── people.csv          personas que nombran las publicaciones
├── mentions.csv        qué persona nombra cada publicación y dónde
└── datapackage.json    descriptor del esquema
```

## Qué se publica y qué no

La página muestra solo lo que publicó la prensa: el medio (`outlet`), su titular (`headline`), su copete si está registrado (`lede`), la fecha de publicación (`published`), el tipo y el enlace. Cada hecho se ubica en la fecha de su primera publicación. Los campos `title`, `summary` y `note` de `events.csv` son descripciones internas que sirven para agrupar, buscar en los datos y orientar a quien contribuye; no aparecen en la página.

Las decisiones de curaduría que sí se reflejan en la página son: qué publicaciones se agrupan como un mismo hecho, qué hechos se marcan como hitos (llevan un clip rojo) y los hilos y temas usados para filtrar.

## events.csv

| Columna | Obligatoria | Formato | Descripción |
|---|---|---|---|
| `id` | sí | `AAAA-MM-DD-palabras-clave` | Identificador estable. No se cambia una vez publicado. |
| `date` | sí | `AAAA-MM-DD`, `AAAA-MM` o `AAAA` | Referencia interna: fecha aproximada del hecho, con la precisión que se conoce. Forma parte del id; la página no la muestra ni ordena por ella. |
| `order` | no | entero | Desempate entre entradas de la misma fecha. |
| `thread` | sí | id de `threads.csv` | Hilo principal. |
| `topics` | no | ids de `topics.csv` separados por `;` | Temas a los que pertenece. |
| `milestone` | sí | `true` / `false` | Hito de la historia. |
| `title` | sí | hasta 120 caracteres | Descripción interna y breve del hecho. **No se publica.** |
| `summary` | sí | hasta 700 caracteres | Descripción interna, con atribución. **No se publica.** |
| `note` | no | hasta 300 caracteres | Nota interna: discrepancias entre fuentes o fechas inciertas. **No se publica.** |
| `revealed` | no | `AAAA-MM-DD` | Opcional, de referencia: fecha de la publicación que reveló el hecho. La página calcula la ubicación de cada entrada a partir de `published` en `sources.csv`. |

## sources.csv

Clave: `event_id` + `url`. Una misma URL puede respaldar varias entradas.

| Columna | Obligatoria | Formato | Descripción |
|---|---|---|---|
| `event_id` | sí | id de `events.csv` | Entrada que respalda. |
| `url` | sí | URL `http(s)` | Enlace original, sin `utm_` ni otros parámetros de rastreo. |
| `outlet` | sí | hasta 80 caracteres | Medio o emisor. Para videos y redes, indicá la plataforma: “SNT (YouTube)”, “Ñandutí en X”. |
| `type` | sí | `article`, `social`, `video`, `document` | Tipo de fuente. |
| `headline` | sí | hasta 300 caracteres | Titular tal como fue publicado, aunque sea valorativo. Es lo que muestra la página. |
| `lede` | no | hasta 25 palabras y 500 caracteres | Copete o fragmento inicial literal. Si se acorta, se corta entre palabras y se agrega `…` dentro del límite. Nunca se usan párrafos del cuerpo. Si una URL aparece en varias entradas, el copete se registra una sola vez. Si está, la página lo muestra dentro del diario; si no, muestra líneas decorativas. |
| `published` | recomendado | `AAAA-MM-DD` | Fecha de publicación de la fuente. Ubica la entrada en la página: la entrada va en la fecha de su primera publicación. |
| `archive_url` | no | URL | Copia en Wayback Machine o archive.today. |
| `last_checked` | no | `AAAA-MM-DD` | Última vez que alguien abrió el enlace y confirmó que respalda la entrada. |
| `notes` | no | texto | Titular cambiado, acceso restringido, contradicciones con otras fuentes. |

## threads.csv y topics.csv

Columnas `id`, `label`, `description`.

- **Hilo nuevo:** además de la fila, hay que agregar su color como `--t-<id>` en `site/template.html`, en los tres bloques de colores (claro, oscuro por sistema y oscuro manual).
- **Tema nuevo:** basta con la fila.

## people.csv

Personas que nombran las publicaciones. Sirve para que la búsqueda de la página encuentre las publicaciones que nombran a alguien, aunque cada medio escriba su nombre de otra forma. Que una persona figure acá no indica su papel en los hechos.

| Columna | Obligatoria | Formato | Descripción |
|---|---|---|---|
| `id` | sí | minúsculas, números y guiones | Identificador estable, por ejemplo `santiago-pena`. |
| `name` | sí | texto | Nombre que muestra la página (“Nombra a…”). |
| `aliases` | no | formas separadas por `;` | Otras formas en que aparece: apellidos solos, nombres completos, apodos, variantes de grafía. Un mismo nombre o alias no puede pertenecer a dos personas. |

## mentions.csv

Una fila por publicación y persona nombrada. Clave: `url` + `person`.

| Columna | Obligatoria | Formato | Descripción |
|---|---|---|---|
| `url` | sí | url de `sources.csv` | Publicación que nombra a la persona. |
| `person` | sí | id de `people.csv` | Persona nombrada. |
| `forms` | sí | formas separadas por `;` | El nombre tal como aparece en la publicación, literal. |
| `where` | sí | `headline`, `lede` y/o `body`, separados por `;` | Dónde aparece: titular, copete o texto. `body` es el texto de la nota, la publicación o el documento, o el título y la descripción de un video (no lo que se dice en el video). |

La validación comprueba que la url y la persona existan, que no haya filas repetidas y que, si `where` incluye `headline` o `lede`, alguna de las `forms` aparezca literalmente en ese titular o copete. Lo que está solo en `body` no se puede comprobar desde los datos: hay que abrir la publicación.

Las menciones las registran los mantenedores. Si sumás una fuente, no hace falta que agregues sus menciones; si querés hacerlo, seguí este formato y agregá a `people.csv` a quien todavía no esté.

## Notas sobre los datos actuales

- La primera versión se armó en noviembre de 2026 a partir de búsquedas en medios paraguayos e internacionales. `last_checked` queda vacío para esas fuentes porque no se registró la fecha de verificación individual.
- Algunas fuentes de X (Twitter) y del sitio del BCP no pudieron abrirse automáticamente durante la recopilación. Conviene verificarlas a mano y completar `last_checked`.
- Varias cifras de 2025 y 2026 provienen de documentos filtrados que publicó ABC Color y que las autoridades no confirmaron públicamente. Los resúmenes lo atribuyen así.
