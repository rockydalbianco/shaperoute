# TASK-237 — Il sito web, con la sezione «Merch» per le magliette

**Stato**: In corso — parte A (la pagina e la vetrina) in PR dal
2026-10-05; parte B (aprire il negozio e pubblicare) aspetta l'utente
**Fase**: 4 · **Branch**: `feat/TASK-237-website-merch`
**ADR**: ADR-0201

## Obiettivo

Sgrava ha un sito web con una sezione di merchandising da cui si comprano
le magliette.

## La richiesta dell'utente (2026-10-05)

«Aiutami a fare il sito web; nel sito web vorrei fare la sezione di
merchandising per vendere le nostre magliette.»

## Le scelte dell'utente (2026-10-05)

Alla domanda «come si vendono le magliette (chi incassa e chi spedisce)?»,
fra stampa su ordinazione, magliette proprie con Stripe, negozio Shopify e
sola vetrina: **stampa su ordinazione**. Un servizio stampa e spedisce
ogni maglietta quando viene ordinata; il sito mostra le magliette e «Buy»
apre il pagamento del servizio.

## Contesto da leggere

- `docs/SITO.md`
- `docs/DECISIONS.md`, ADR-0201

## Cosa fare

**Parte A — la pagina e la vetrina** (questa PR):

1. Una cartella nuova `site/`: pagina, stile, le magliette in un file
   solo, le schede di «Merch» costruite da quel file.
2. Le stampe dai percorsi veri del catalogo, con uno script.
3. Test in Node e un workflow suo.
4. `docs/SITO.md`, ADR-0201, le righe in `STATUS.md` e `INDEX.md`.

**Parte B — aprire il negozio e pubblicare** (dopo le scelte dell'utente):

1. L'utente sceglie il servizio di stampa e apre l'account (un agente non
   crea account).
2. Decise magliette, nomi e prezzi, si preparano i file di stampa e
   l'utente li carica sul servizio.
3. In `site/products.js`: `buyUrl`, `priceEur`, `fulfilledBy`.
4. Dominio e pubblicazione, con l'ok dell'utente.

## Criteri di accettazione

Parte A:

- [x] `site/index.html` servita da un server locale mostra intestazione,
      «How it works» e «Merch» con una scheda per maglietta di
      `products.js`, a 1280 px e a 520 px di larghezza.
- [x] Una maglietta con `buyUrl` `https` ha «Buy» che apre quell'indirizzo
      in una scheda nuova; senza, «Coming soon» e nessun link.
- [x] La pagina non carica niente da altri siti; l'unico indirizzo esterno
      è il link del credito OpenStreetMap.
- [x] `cd site && npm test` è verde, senza installare niente.
- [x] `python3 site/tools/make_prints.py` rifà gli stessi file.

Parte B: da scrivere con le scelte dell'utente.

## File toccati

```
site/**                          (nuova)
.github/workflows/site.yml       (nuovo)
docs/SITO.md                     (nuovo)
docs/tasks/TASK-237.md           (nuovo)
docs/STATUS.md                   (le righe di TASK-237)
docs/DECISIONS.md                (ADR-0201)
docs/INDEX.md                    (una riga per SITO.md)
```

## Fuori scope

- Pagamenti, carrello, ordini o dati dei clienti sul sito: li tiene il
  servizio di stampa.
- Pubblicare il sito, comprare un dominio, toccare `deploy/` o il server.
- Scegliere il servizio, i prezzi, i nomi e i disegni definitivi.
- Altre pagine (privacy, termini, contatti: TASK-184), altre lingue,
  i tasti degli store (l'app non è sull'App Store: TASK-152).
- L'app, l'API, il motore.

## Esito

**Parte A** (2026-10-05): il sito è in `site/`, guardato in Chrome senza
finestra a 1280 e 520 px; 12 test verdi. Quattro magliette proposte (cuore
di Milano, lumaca di Torino, stella di Trento, logo), tutte «Coming soon».
Il cuore in cima sta nella pagina e non in un'immagine: disegnato dentro
un `<img>` l'animazione non partiva nel controllo, e la riga restava
nascosta.

**Aspettano l'utente**: il servizio di stampa e l'account; magliette,
nomi, colori e prezzi; i testi della pagina («Runs that draw a shape on
the map.», i tre passi, «Sgrava is in preview on iPhone, not yet on the
App Store.»); dominio e pubblicazione.
