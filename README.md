# El caso ueno

Cronología abierta de lo que publicaron medios, legisladores y autoridades sobre **ueno bank**, el **Banco Central del Paraguay (BCP)** y el Gobierno de Santiago Peña. Va desde la financiera que dio origen al banco hasta la resolución dispuesta por el BCP el 3 de noviembre de 2026.

El proyecto no afirma hechos por cuenta propia. Cada entrada resume lo que dijo una fuente pública y enlaza a todas las fuentes que cubrieron ese hecho.

## Qué hay en el repositorio

```
data/                 los datos, en CSV (la fuente de verdad)
  events.csv          186 hechos fechados
  sources.csv         858 fuentes: notas, videos, redes y documentos oficiales
  people.csv          415 personas nombradas, con las formas en que las escriben los medios
  mentions.csv        2.295 menciones: qué persona nombra cada publicación (para la búsqueda)
  threads.csv         5 hilos (actores)
  topics.csv          10 temas
  series/deposits.csv serie de depósitos estatales en ueno
  datapackage.json    esquema en formato Frictionless Data
  README.md           descripción de cada columna
site/template.html    la página interactiva, sin datos
scripts/
  validate.js         revisa los CSV
  build.js            genera dist/index.html a partir de los CSV
  lib/                lector CSV y reglas del esquema
.github/              formularios para aportes y validación automática
```

`dist/` se genera con `npm run build` y no se versiona. Contiene `index.html` (documento completo, listo para cualquier hosting estático), `artifact.html` (la misma página como fragmento, para publicarla como Artifact), `assets/` (la textura de papel, con su crédito en `site/assets/CREDITS.md`) y `data.json`.

## Uso

Requiere Node.js 18 o superior. No hay dependencias que instalar.

```bash
npm run validate
```

```bash
npm run build
```

Después, serví la carpeta `dist/` con cualquier servidor estático y abrila en el navegador (la textura se carga por ruta relativa, así que abrir el archivo con doble clic puede no mostrarla):

```bash
python3 -m http.server 8765 --directory dist
``` `npm run build` también escribe `dist/data.json` con todos los datos en un solo archivo.

## Usar los datos

Los CSV se pueden abrir con cualquier planilla o cargar directamente:

```python
import pandas as pd
events = pd.read_csv("data/events.csv")
sources = pd.read_csv("data/sources.csv")
cobertura = sources.merge(events, left_on="event_id", right_on="id")
```

## Contribuir

Se aceptan fuentes nuevas, entradas nuevas y correcciones. Las reglas editoriales y los pasos, con o sin programar, están en [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

- **Datos** (`data/`): [CC BY 4.0](data/LICENSE.md), excepto los titulares (`headline`) y copetes (`lede`), que pertenecen a cada medio y se citan con fines informativos. Se pueden reutilizar con cualquier fin dando crédito; la forma de citar está en ese archivo.
- **Código** (`scripts/`, `site/`): [MIT](LICENSE).

Los titulares y contenidos enlazados pertenecen a sus autores. El proyecto solo cita titulares y enlaza a las publicaciones originales.
