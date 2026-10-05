# SITO — Il sito web e il merch

> Cosa c'è nel sito di Sgrava, come si aggiunge una maglietta e come si
> guarda in locale. Le scelte e i loro perché stanno in `DECISIONS.md`
> (ADR-0201); lo stato in `STATUS.md`.

## Cos'è

Una pagina sola, in inglese, in `site/`: l'intestazione con il logo, il
cuore di Milano che si disegna, «How it works» in tre passi e la sezione
**«Merch»** con le magliette. HTML, CSS e JavaScript scritti a mano: nessuna
dipendenza, nessun passo di build, niente cookie, niente dati di chi visita.

**Il sito non vende niente da solo.** Le magliette sono stampate su
ordinazione da un servizio esterno (scelta dell'utente, 2026-10-05), che
stampa, incassa, spedisce e gestisce i resi. Il sito mostra le magliette e
«Buy» apre la pagina di quella maglietta sul servizio. Il servizio non è
ancora scelto: finché una maglietta non ha il suo indirizzo, al posto di
«Buy» c'è «Coming soon», e sotto il negozio «The shop opens soon.».

## I file

| File | Cosa contiene |
|---|---|
| `site/index.html` | la pagina |
| `site/styles.css` | l'aspetto; i colori sono dichiarati una volta in cima e ricalcano `apps/mobile/src/theme/tokens.ts` |
| `site/products.js` | **le magliette**: l'unico file da toccare per aggiungerne una, darle un prezzo o metterla in vendita |
| `site/merch.js` | costruisce le schede di «Merch» da `products.js` |
| `site/prints/` | le stampe, una per maglietta |
| `site/assets/` | logo e simbolo, copiati da `docs/brand/` |
| `site/tools/make_prints.py` | ridisegna le stampe e il cuore in cima alla pagina dai percorsi di `catalog/seed/` |
| `site/tests/` | i test (`node --test`) |

## Mettere in vendita una maglietta

In `site/products.js` ogni maglietta è una voce:

- `buyUrl`: l'indirizzo `https://…` della maglietta sul servizio di stampa.
  Con `null` la scheda dice «Coming soon». Solo un indirizzo `https` la
  mette in vendita.
- `priceEur`: il prezzo in euro, lo stesso scritto sul servizio. Una
  maglietta in vendita senza prezzo fa fallire i test.
- `fulfilledBy`, in cima al file: il nome del servizio, scritto sotto il
  negozio («Payment, shipping and returns are handled by …»). Va messo
  quando la prima maglietta va in vendita: i test lo chiedono.
- `tee`: `black`, `white` o `yellow`, il colore della maglietta disegnata.
- `print`: il file della stampa in `site/prints/`.

## Le stampe

Le tre stampe con un percorso (cuore di Milano 10,1 km, lumaca di Torino
21,8 km, stella di Trento 5,1 km) sono percorsi veri di `catalog/seed/`,
tracciati dal Route Engine: lo script li proietta in metri e li disegna
come una linea, con il pallino della partenza e la scritta. Non inventa
geometrie. Per rifarle o aggiungerne una (elenco `PRINTS` nello script):

```bash
python3 site/tools/make_prints.py
```

I percorsi vengono da dati OpenStreetMap: il credito «© OpenStreetMap
contributors» in fondo alla pagina deve restare (lo controlla un test).

I file SVG sono la stampa come si vede sul sito. Il file da caricare sul
servizio di stampa (di solito un PNG grande, a 300 dpi) si ricava da lì
quando il servizio è scelto.

## Guardarlo in locale

Da un terminale nella radice del repository, poi `http://127.0.0.1:8237`:

```bash
python3 -m http.server 8237 --bind 127.0.0.1 --directory site
```

Aprire `index.html` con un doppio clic non basta: senza un server il
browser non carica `merch.js` e le magliette non compaiono.

## I test

```bash
cd site && npm test
```

Solo Node, niente da installare. In CI li fa girare
`.github/workflows/site.yml`, quando cambia qualcosa in `site/`.

## Non ancora deciso (dell'utente)

Quale servizio di stampa e il suo account; quali magliette, con quali
nomi, colori e prezzi (le quattro di adesso sono una proposta); i testi
della pagina; il dominio e dove pubblicare il sito. Finché non è
pubblicato, il sito esiste solo nel repository.
