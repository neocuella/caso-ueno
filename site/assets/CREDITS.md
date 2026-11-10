# Créditos de recursos

## favicon.ico, favicon.svg, apple-touch-icon.png, icon-512.png y og.png

Diseños propios del proyecto. Las fuentes están en `site/brand/` (`favicon.svg` y `og.html`, que se renderiza a `og.png` con Chrome sin interfaz; el comando está en el archivo).

## Geist-Variable.woff2

Tipografía [Geist](https://vercel.com/font), de Vercel, versión 1.9.1, tomada de [vercel/geist-font](https://github.com/vercel/geist-font/releases/tag/v1.9.1) (`Geist/webfonts/Geist[wght].woff2`). Se sirve desde este sitio, sin servicios externos.

Publicada bajo la [SIL Open Font License 1.1](Geist-OFL.txt).

## Newsreader-latin.woff2, Newsreader-latin-ext.woff2, Newsreader-guarani.woff2 y Newsreader-Italic-firma.woff2

Tipografía [Newsreader](https://github.com/productiontype/Newsreader), de Production Type, en su versión variable (pesos 400–800 y tamaño óptico), dividida por alfabeto tal como la distribuye Google Fonts (`latin` y `latin-ext`). Se sirve desde este sitio, sin servicios externos.

Dos archivos son recortes hechos con [fonttools](https://github.com/fonttools/fonttools) (`pyftsubset` y `varLib.instancer`), para no bajar archivos enteros por unos pocos signos:

- `Newsreader-guarani.woff2`: solo el signo del guaraní (₲, U+20B2), tomado de `latin-ext` (variable, como el original). Así `latin-ext` completo solo se baja si un texto trae otra letra de ese alfabeto.
  `pyftsubset Newsreader-latin-ext.woff2 --unicodes=U+20B2 --layout-features='*' --flavor=woff2 --output-file=Newsreader-guarani.woff2`
- `Newsreader-Italic-firma.woff2`: la cursiva (`Newsreader-Italic-latin.woff2` de Google Fonts) con solo las letras de la firma de la portada («Por Ricardo Ovelar.») y fijada en peso 400 (conserva el eje de tamaño óptico). Si se agrega otro texto en cursiva, hay que volver a recortarla desde el archivo original con sus letras.
  `pyftsubset Newsreader-Italic-latin.woff2 --text="Por Ricardo Ovelar." --layout-features='*' --flavor=woff2 --output-file=firma.woff2`, luego `fonttools varLib.instancer firma.woff2 wght=400 -o Newsreader-Italic-firma.woff2`

Publicada bajo la [SIL Open Font License 1.1](Newsreader-OFL.txt) (sin nombres reservados, así que los recortes conservan el nombre y la licencia).

## papel.webp

Textura de papel usada como superficie de los diarios. Sale de la foto `site/brand/papel.jpg` (recorte de la parte superior de la fotografía original, sin el pliegue, a 900 px de ancho), convertida una vez a negro con transparencia: alfa = (255 − gris) × 0,48, con gris = 0,299 R + 0,587 G + 0,114 B (el 0,48 es la opacidad con que se dibuja), reducida a 600 × 450 px y guardada como WebP con transparencia (`cwebp -q 50 -alpha_q 25 -alpha_filter best -exact -m 6`). A los tamaños en que se dibuja no se distingue de la conversión exacta, y pesa 39 kB.

`site/brand/papel.jpg` no se publica: queda como original de la textura y para `site/brand/og.html`.

Photo by [Indieground Design](https://unsplash.com/@indieground?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) on [Unsplash](https://unsplash.com/photos/creased-off-white-paper-sheet-vgFESKJqUyo?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText).

Publicada bajo la [Licencia Unsplash](https://unsplash.com/license).
