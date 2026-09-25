# TASK-072 — La forma ricavata da un'immagine (motore e CLI)

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-072-image-outline` (parte da `main`)

Assegnato dal coordinatore su richiesta dell'utente (2026-09-25): «l'utente
può caricare un'immagine da rappresentare e dai contorni si ricava la
forma». Perimetro deciso dall'utente per la prima versione: **un soggetto
chiaro su sfondo uniforme**, **solo il contorno esterno**; le foto con
sfondi pieni di cose si rifiutano con un motivo chiaro. Pillow autorizzata
dall'utente. ADR-0068.

## Obiettivo

Il motore ricava da un'immagine PNG o JPEG il contorno del soggetto, con
regole fisse, e la CLI ne fa un percorso come con `--outline`; un'immagine
che non va è rifiutata con il motivo.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0035 (la sagoma sta nel contorno), ADR-0038
  (forme dritte), ADR-0039 (dettagli sottili)
- `route_engine/shapes/outline.py` (`Outline`, `parse_outline`)
- `route_engine/__main__.py` (`--outline`)

## Cosa fare

1. Modulo nuovo `route_engine/image_outline.py`: immagine → sfondo dal
   bordo → soggetto per soglia → il pezzo più grande → contorno esterno
   lisciato e semplificato → `Outline`. Rifiuti con `reason`: formato,
   illeggibile, sfondo non uniforme, nessun soggetto, più soggetti,
   soggetto sul bordo, troppo piccolo, troppo frastagliato.
2. CLI: `--image FILE` come `--outline` (`plan_shape`, `tilt_limit`), e
   `--save-outline FILE` per scrivere il contorno in JSON.
3. Test deterministici con immagini disegnate da Pillow nel test.
4. Campioni: cinque immagini semplici (con una sagoma di mappa, spunto
   del coordinatore da gpsart.info), Trento e Milano, 15 km, con i grafi
   di zona dell'API in memoria (nessun ritaglio su C:); righe in
   `samples/LOG.md`; pagina di giudizio sì / quasi / no.

## Criteri di accettazione

- [x] `outline_from_image` dà un `Outline` valido per cerchio, stella (anche
      da JPEG), rettangolo con rientranza, anello e disegno a linee (solo il
      contorno esterno), sfondo trasparente, foto grande e ruotata (EXIF).
- [x] Rifiuta con il suo `reason` sfondo rumoroso, immagine vuota, due
      soggetti, soggetto sul bordo, soggetto piccolo, ingranaggio
      frastagliato, GIF, file che non è un'immagine.
- [x] La stessa immagine dà lo stesso contorno; il JSON salvato si rilegge
      con `read_outline` uguale.
- [x] `--image` e `--save-outline` dalla CLI, con errori in una riga.
- [x] `ruff`, `black --check`, `pytest -m "not network"` puliti in
      `services/route-engine`.
- [x] 9 campioni in `samples/`, righe in `samples/LOG.md`, pagina di
      giudizio.
- [x] Giudizio dell'utente in `samples/LOG.md` (dopo la PR, non per il
      merge).

## File toccati

```
services/route-engine/route_engine/image_outline.py        (nuovo)
services/route-engine/tests/test_image_outline.py          (nuovo)
services/route-engine/tests/test_cli_image.py              (nuovo)
services/route-engine/route_engine/__main__.py
services/route-engine/pyproject.toml
samples/TASK-072_* (5 immagini, 9 GPX), samples/LOG.md
docs/ROUTE_ENGINE.md (§2, «Il contorno da un'immagine»)
docs/tasks/TASK-072.md
docs/DECISIONS.md (ADR-0068), docs/STATUS.md
```

Il modulo è `route_engine/image_outline.py` e non
`route_engine/shapes/image_outline.py`, come proposto: `test_shapes.py`
vuole `shapes/` con la sola libreria standard, e il modulo usa Pillow,
numpy e shapely. Così nessun file di altri cambia.

## Fuori scope

- L'app e l'API: scelta della foto, anteprima del contorno, richiesta del
  percorso, `packages/shared-types`. È TASK-073.
- I dettagli interni come tratti ripassati (occhi, finestre): solo il
  contorno esterno.
- Foto con sfondi pieni di cose, segmentazione con modelli, altre librerie
  (scikit-image, OpenCV).
- `network.py`, `directions.py`, `words.py`, `letters.json`,
  `optimizer.py`, `shapes/outlines/*`, `shapes/__init__.py`.

## Campioni (2026-09-25)

15 km, partenze di `docs/TESTING.md`, solo zone già in cache, con i grafi
di zona dell'API in memoria. Le immagini, disegnate dall'agente, sono in
`samples/` (3–115 KB). Somiglianza · distanza reale · tempo. Pagina di
giudizio: https://claude.ai/artifact/Eu4gz4LKoJWpVJF9PM8knx

| Immagine | Angoli | Trento | Milano |
|---|---|---|---|
| mela (`apple.png`, disegno) | 40 | 0,93 · 13,5 km · 12 s | 1,00 · 14,5 km · 37 s |
| stella (`star.png`, logo trasparente) | 16 | 0,90 · 15,0 km · 14 s | 1,00 · 14,7 km · 33 s |
| gatto (`cat.png`, sagoma) | 39 | 0,96 · 14,1 km · 12 s | 0,99 · 15,0 km · 33 s |
| pera (`pear.jpg`, finta foto) | 25 | 0,96 · 14,3 km · 19 s | — |
| Italia (`italy.png`, mappa) | 42 | 0,96 · 15,8 km · 25 s | 1,00 · 15,7 km · 34 s |

La pera a Milano non c'è: alta e stretta, chiede un'area oltre la zona
scaricata, e per i campioni non si scarica niente. La pera a Trento corre
l'11% su strade già fatte e il 23% accanto a se stessa (limiti 5% e 10%),
l'Italia a Trento il 14% accanto a se stessa: la punta dello stivale e il
collo della pera sono stretti per quelle strade.

Due bozze dei disegni sono state rifatte prima dei campioni: il gatto con
la coda staccata dal corpo e la mela con il gambo staccato. Il motore aveva
tenuto solo il pezzo più grande, come previsto (ADR-0068), e la forma
perdeva la coda e il gambo.

## Esito

Il motore ricava il contorno esterno da un'immagine con un soggetto chiaro
su sfondo uniforme, con regole fisse (ADR-0068), e la CLI ne fa un
percorso (`--image`, `--save-outline`); le immagini che non vanno sono
rifiutate con il motivo. Anteprima:
https://claude.ai/artifact/Eu4gz4LKoJWpVJF9PM8knx. Giudizio dell'utente
(2026-09-25, `samples/LOG.md`):

| Immagine | Trento | Milano |
|---|---|---|
| mela | sì | sì |
| stella | quasi | sì |
| gatto | no | no |
| pera | sì | — |
| Italia | sì | sì |

Commento dell'utente: «alcune forme però sono irriconoscibili anche dalla
forma reale, il gatto è molto difficile da riconoscere anche dalla forma:
bisogna essere più dettagliati, oppure non fare tutto il corpo se è così
poco dettagliato». Il gatto non si riconosceva già dal contorno, prima
delle strade: la sagoma di profilo seduta, senza occhi né muso, non basta.

Da valutare con TASK-073, non ancora deciso:

- l'anteprima del contorno nell'app deve far vedere all'utente se la
  sagoma si riconosce **prima** di chiedere il percorso, perché il gatto
  non si riconosceva già dal contorno;
- valutare se la semplificazione (lisciatura al 2%, angoli all'1%, al più
  100) toglie troppi dettagli.
