# SITO — Il sito web

> Cosa c'è nel sito di MuW (già «Sgrava», ADR-0224), come si cambia e come
> si guarda in locale.
> Le scelte e i loro perché stanno in `DECISIONS.md` (ADR-0201); lo stato
> in `STATUS.md`.

## Cos'è

Una pagina sola, in inglese, in `site/`, che **spiega come si usa l'app**
(scelta dell'utente, 2026-10-05). HTML, CSS e JavaScript scritti a mano:
nessuna dipendenza, nessun passo di build, niente cookie, niente dati di
chi visita, niente caricato da altri siti. **Un'eccezione sola**: la mappa
della pagina dal vivo (`live/`, sotto) carica le tile e i font da
OpenFreeMap, scelta dell'utente del 2026-11-08 (TASK-424, scelta 8).

Dall'alto in basso:

1. **In cima**, il titolo e il pannello **«Try it»**: si sceglie una forma
   (sei) e una distanza (5, 10, 21 km) e il pannello disegna quel percorso
   a Milano, uno dei percorsi veri del catalogo.
2. **«How it works»**: si sceglie lo **sport** («Run», «Bike», «Paddle») e
   cambiano i tre fatti (distanze, dove, come guida) e i quattro passi.
   Sotto, le quattro pagine dell'app: «Feed», «Draw», «Explore», «Profile».
3. **«Best drawings»**: dieci disegni, sei corse e quattro uscite in
   canoa, con un filtro («All», «Run», «Paddle»).
4. **«Get the app»**: «Download the app», in cima e in fondo, porta
   alla pagina di MuW sull'App Store (dal 2026-10-28, TASK-237 F).

## I file

| File | Cosa contiene |
|---|---|
| `site/index.html` | la pagina |
| `site/styles.css` | l'aspetto; i colori sono dichiarati una volta in cima e ricalcano `apps/mobile/src/theme/tokens.ts`, i toni più chiari si mescolano da quelli |
| `site/config.js` | **il link per scaricare l'app** (`downloadUrl`) |
| `site/content.js` | **i testi della guida**: sport, fatti, passi, le pagine dell'app |
| `site/data/drawings.js` | i disegni di «Try it» e di «Best drawings»; lo scrive `make_drawings.py`, non si tocca a mano |
| `site/render.js` | costruisce i pezzi della pagina (funzioni pure, provate dai test) |
| `site/main.js` | collega i tasti alla pagina |
| `site/assets/` | il segno e la scritta di MuW, ricavati da `docs/brand/muw-*.svg` (la scritta nel colore del testo, per lo sfondo scuro) |
| `site/tools/` | gli script che ricavano i disegni dai percorsi veri |
| `site/live/` | la pagina di un link dal vivo (TASK-424, sotto) |
| `site/tests/` | i test (`node --test`) |

## Mettere il link per scaricare l'app

In `site/config.js`, `downloadUrl`: l'indirizzo `https://…` dell'app
sull'App Store. Con `null` i due tasti dicono «Download — coming soon»;
con l'indirizzo diventano «Download the app». Il titolo e la frase di
«Get the app» in `index.html` si cambiano a mano insieme al link (oggi
«On iPhone, now.», «MuW is free on the App Store, for iPhone.»); quando
arriva Google Play (TASK-294) cambiano anche loro.

## Cambiare i testi della guida

In `site/content.js`. Ogni riga dice una cosa che l'app fa oggi: quando
l'app cambia (una distanza, uno sport, un passo), si cambia lì. I test
chiedono tre fatti e quattro passi per sport.

## I disegni

Nessuna geometria è inventata: ogni linea è un percorso tracciato dal
Route Engine su dati OpenStreetMap, che gli script proiettano in metri,
sfoltiscono e adattano a un quadrato.

- **«Try it»**: `catalog/seed/milano.json`, sei forme per tre distanze.
- **«Best drawings»**: sei corse dei disegni d'esempio del «Feed»
  dell'app (`apps/mobile/src/feed/sampleFeed.json`) e i quattro esempi
  sull'acqua che il «Feed» mostra (`apps/mobile/src/paddle/paddleExamples.json`),
  con gli stessi titoli. Il sito mostra titolo, luogo e km; **non** i nomi
  degli utenti d'esempio, i minuti e i punteggi, che nell'app sono
  inventati. Non ci sono disegni in bici: nei dati dell'app non ce ne sono.

I file dell'app vengono solo letti; i disegni restano copiati in `site/`,
quindi un cambio nell'app non cambia il sito finché non si rilancia:

```bash
python3 site/tools/make_prints.py
python3 site/tools/make_drawings.py
```

Il primo rifà anche il cuore scritto dentro `index.html` (quello che si
vede prima che parta JavaScript) e i file del marchio in `site/assets/`:
dopo un cambio di logo in `docs/brand/` basta rilanciarlo. Quali forme, quali città e quali dieci
disegni: gli elenchi in cima a `make_drawings.py`.

Il credito «© OpenStreetMap contributors» in fondo alla pagina deve
restare (lo controlla un test).

## La pagina della privacy

`getmuw.app/privacy/` (inglese) e `privacy/it/`, `de/`, `fr/`, `es/`: il
testo «Privacy» dell'app, lo stesso parola per parola, che Apple chiede a
un indirizzo pubblico. **Non si scrive a mano**: il testo sta in
`apps/mobile/src/about/content/*.ts`, e le pagine le scrive

```bash
node site/tools/make_privacy.mjs
```

Dopo un cambio del testo nell'app si rilancia: un test del sito confronta
le pagine con l'app e fallisce finché non sono uguali (la CI del sito gira
anche quando cambiano i testi dell'app). Il piede della pagina
principale porta a `privacy/`.

## La pagina di assistenza

`getmuw.app/support/` (inglese) e `support/it/`, `de/`, `fr/`, `es/`: come
scriverci (`muw2610@gmail.com`, lo stesso indirizzo della privacy) e tre
domande frequenti, per il Support URL dell'App Store. I testi stanno in
`site/tools/support_text.mjs`; dopo un cambio:

```bash
node site/tools/make_support.mjs
```

Le risposte nominano i tasti come li mostra l'app in ogni lingua (un test
lo controlla): se l'app cambia un nome, cambia anche qui.

## La pagina dal vivo

`getmuw.app/live/#<token>` (TASK-424, ADR-0352): il link di «Share live»
dell'app. Chi lo apre, senza app né account, vede dal vivo la registrazione
di chi l'ha mandato. Il token sta dopo il `#`, quindi non arriva mai al
server del sito; la pagina lo manda all'API, `GET
https://api.getmuw.app/live?t=<token>&after=<seq>` (`API.md`, «Live
shares»), ogni 10 s, subito ancora quando la risposta dice `more`, ogni
minuto quando l'attività è finita, e smette quando il link è fermato o
scaduto. L'API lascia leggere `/live` solo a `https://getmuw.app` (CORS).

| File | Cosa contiene |
|---|---|
| `live/index.html` | la pagina |
| `live/view.js` | cosa mostrare, senza DOM: il token, la richiesta, le risposte, la riga sotto il titolo, i numeri, lo stile della mappa (funzioni pure, provate dai test con la fixture `live-view.json`) |
| `live/live.js` | la pagina, la mappa e i timer |
| `live/texts.js` | i testi approvati in «Testi» del task, in cinque lingue; la lingua viene dal browser, l'inglese se non è una di queste |
| `live/live.css` | l'aspetto, sopra `styles.css`; i colori della mappa ricalcano quelli scuri di `tokens.ts` (un test li confronta) |
| `live/maplibre-gl.js`, `.css` | MapLibre GL JS **copiato**, alla stessa versione dell'app (`apps/mobile/src/map/mapPage.ts`, oggi 5.24.0): un test controlla che i file abbiano gli hash SRI dell'app |

- **Cosa mostra**: la mappa col percorso fatto e la posizione (l'ultimo
  punto), poi distanza, tempo, passo o velocità medi (la velocità per le
  bici, il roller e lo sci, il passo per 500 m in canoa e per 100 m a nuoto,
  come nell'app), dislivello, calorie e battito quando ci sono. Nuoto in
  piscina: tempo, vasche stimate, calorie, battito, senza mappa. Palestra:
  tempo, esercizio in corso, calorie, battito, senza mappa. Parapendio
  (TASK-305 R3): al posto della media, velocità del momento, quota,
  variometro col segno e quota massima (ft/min in miglia); da un'app di
  prima, la velocità media. Miglia e piedi
  per un browser degli Stati Uniti e del Regno Unito, come l'app dal
  telefono.
- **La riga sotto il titolo**: «Updated N s ago»; «No update since HH:MM»
  dopo 2 minuti senza aggiornamenti (il tempo allora si ferma all'ultimo
  del telefono); «Finished at HH:MM»; «Sharing stopped»; «This link has
  expired», anche per un indirizzo senza token valido. Il tempo avanza fra
  due risposte solo mentre il link è `live`.
- **Da fuori** carica solo le tile e i font di OpenFreeMap, col credito
  OpenFreeMap, OpenMapTiles, OpenStreetMap sulla mappa. OpenFreeMap vede
  l'indirizzo IP di chi apre la pagina, non il token né la posizione (la
  privacy lo dice, «Sharing live»). La pagina non va nei motori di ricerca
  (`noindex`).
- **Cambiare versione di MapLibre**: quando l'app la cambia, si ricopiano
  `dist/maplibre-gl.js` e `.css` del pacchetto npm di quella versione; il
  test fallisce finché gli hash non sono quelli di `mapPage.ts`.

**Guardarla in locale.** L'API del Mac non va bene: lascia leggere `/live`
solo a `https://getmuw.app`. Con il server del sito (sotto) e un finto
`/live` che risponde dalla fixture, `?api=` (accettato solo da
`127.0.0.1` e `localhost`) porta la pagina lì:
`http://127.0.0.1:8237/live/?api=http://127.0.0.1:8299#<token>`. Il finto
`/live` usato per la parte A2 sta, fuori da git, in
`out/TASK-424/live-stand-in.mjs` della copia principale.

## Online

Il sito è su **https://getmuw.app** dal 2026-10-08, servito dal Caddy del
server Hetzner (`www.getmuw.app` rimanda lì). Sul server stanno solo i file
pubblici, copiati da `main` in `/srv/getmuw-site`: non i test, gli script,
`package.json` e il merch spento. **Non si aggiorna da solo**: dopo un
merge che cambia `site/` si ripete la copia di `DEPLOY.md` F.14 (il
server è del Coordinatore, con l'ok dell'utente). Un file pubblico nuovo
va aggiunto anche all'elenco di F.14.

## Guardarlo in locale

Da un terminale nella radice del repository, poi `http://127.0.0.1:8237`:

```bash
python3 -m http.server 8237 --bind 127.0.0.1 --directory site
```

Aprire `index.html` con un doppio clic non basta: senza un server il
browser non carica gli script, e passi e disegni non compaiono.

## I test

```bash
cd site && npm test
```

Solo Node, niente da installare. In CI li fa girare
`.github/workflows/site.yml`, quando cambia qualcosa in `site/`.

## Il merch, messo da parte

La prima versione della pagina aveva una sezione «Merch» con le magliette,
vendute da un servizio di stampa su ordinazione. Il 2026-10-05 l'utente ha
detto di fare **per ora solo la guida**: la sezione è fuori dalla pagina,
ma i suoi file restano e i loro test girano ancora: `site/products.js` (le
magliette), `site/merch.js` (le schede), `site/merch.css` (lo stile),
`site/prints/` (le stampe). Per rimetterla: una sezione con
`<ul data-products>` e `<p data-shop-note>` in `index.html`, il foglio
`merch.css` e lo script `merch.js` nell'intestazione; una maglietta è in
vendita quando ha `buyUrl` (`https`) e `priceEur` in `products.js`, e
`fulfilledBy` dice il nome del servizio.

## Non ancora deciso (dell'utente)

Testi, dieci disegni e scelta dello sport sono confermati (2026-10-05 e
2026-10-08). Il sito andrà su `getmuw.app`, dal Caddy del server Hetzner
(scelta dell'utente, 2026-10-08; la configurazione è di TASK-265). Restano
dell'utente: quando rimettere il merch, con quale servizio, quali magliette e
quali prezzi. Il link per scaricare l'app arriva con l'App Store (TASK-152).
