# TASK-073 — L'immagine nell'app e nell'API

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-073-image-in-app` (parte da `main`)

Assegnato dal coordinatore su richiesta dell'utente (2026-09-25), seguito di
TASK-072. Perimetro deciso dall'utente: un soggetto chiaro su sfondo
uniforme, solo il contorno esterno; le foto con sfondi pieni di cose si
rifiutano con un motivo chiaro. `expo-image-picker` autorizzato
dall'utente. ADR-0069.

## Obiettivo

Nell'app, accanto a Shape e Word, l'utente sceglie una foto (o ne scatta
una), vede il contorno che il motore ne ricava **prima** di chiedere il
percorso, e da lì chiede il percorso come per una forma; un'immagine
rifiutata mostra il motivo in parole semplici.

## Contesto da leggere

- `docs/tasks/TASK-072.md` (giudizio, le due righe «da valutare»)
- `docs/DECISIONS.md` ADR-0068
- `docs/API.md` («Richieste in due tempi», «Errori»), `docs/UI.md` («Forma
  e distanza», «Quando non va»)

## Cosa fare

1. API: `POST /image-outlines` (immagine in base64 dentro JSON, con un
   limite) e `POST /image-route-jobs` (il contorno, controllato come ogni
   input); codice `image_not_usable` con `reason`. Nessuna dipendenza
   Python nuova.
2. `shared-types`: tipi, costanti e fixture nuovi, retrocompatibili.
3. App: «Image» nell'interruttore, «Choose picture» e «Take photo»
   (`expo-image-picker`), anteprima del contorno sopra la foto, motivo del
   rifiuto, richiesta del percorso con il contorno.
4. Valutare se la semplificazione di ADR-0068 toglie troppi dettagli.
5. Prova sull'iPhone con l'utente prima del merge.

## Criteri di accettazione

- [x] `POST /image-outlines` dà `points` normalizzati, `image_points` e
      `aspect` (anche per una foto ruotata dall'EXIF); rifiuta con
      `image_not_usable` e il `reason` giusto sfondo rumoroso, due soggetti,
      immagine vuota, GIF; base64 non valido e immagini oltre 10 MB sono
      `invalid_request`.
- [x] `POST /image-route-jobs` crea un job letto su `/route-jobs/{id}`, con
      `shape` e `word` `null`; rifiuta un contorno aperto, che si incrocia,
      fuori da [-1, 1], con meno di 3 punti o più di 100 angoli, numeri non
      finiti; partenza e distanza controllate come per una forma.
- [x] Il GPX di un percorso da immagine si chiama `shaperoute-image-…`.
- [x] I motivi del motore sono tutti nel contratto (test sul sorgente).
- [x] Fixture di `shared-types` lette da `tsc`, dai test Node e dai test
      dell'API; `RouteRequest` e `models.py` invariati.
- [x] App: scelta dalla libreria e dalla fotocamera, permesso negato, foto
      troppo grande; anteprima con la linea sopra la foto e senza; motivo
      del rifiuto in parole semplici per ogni `reason`; richiesta del
      percorso a `/image-route-jobs`; test Jest.
- [x] `ruff`, `black --check`, `pytest -m "not network"` in `services/api`;
      `npm run typecheck`, `npm test`, `npm run lint`, `format:check`.
- [x] Prova da capo a fondo con il motore vero (mela di TASK-072, Trento,
      10 km): 9,2 km, somiglianza 0,94, 27 s, con le indicazioni.
- [x] Prova sull'iPhone con l'utente (Expo Go).

## File toccati

```
services/api/shaperoute_api/images.py                     (nuovo)
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/jobs.py                       (solo i tipi)
services/api/tests/test_images.py                         (nuovo)
services/api/tests/test_contract.py
services/api/tests/test_routes.py, test_route_jobs.py, test_shape_readings.py
                                                           ("reason": null negli errori attesi)
packages/shared-types/src/index.ts
packages/shared-types/test/contract.test.ts
packages/shared-types/fixtures/api-error.json, api-error-codes.json,
  route-job-failed.json
packages/shared-types/fixtures/image-*.json, route-result-image.json   (nuovi)
apps/mobile/App.tsx                                        (ok del coordinatore)
apps/mobile/app.json, apps/mobile/package.json, package-lock.json
apps/mobile/src/api/routes.ts, routes.test.ts
apps/mobile/src/api/imageOutlines.ts, imageOutlines.test.ts          (nuovi)
apps/mobile/src/route/RoutePanel.tsx, RoutePanel.test.tsx
apps/mobile/src/route/problems.ts, problems.test.ts
apps/mobile/src/route/useRouteRequest.ts, useRouteRequest.test.ts
apps/mobile/src/route/useGpxExport.ts                      (ok del coordinatore; solo il tipo)
apps/mobile/src/route/pickImage.ts, useImageOutline.ts, ImagePreview.tsx,
  ImageChoice.tsx e i loro test                                      (nuovi)
docs/API.md, docs/UI.md, docs/DECISIONS.md (ADR-0069), docs/STATUS.md
docs/tasks/TASK-073.md
```

`ChooseScreen.tsx`, `Segmented.tsx` e `route_engine/image_outline.py` non
sono serviti: il terzo pulsante entra nell'interruttore com'è, e la
semplificazione resta (sotto).

## Fuori scope

- I dettagli interni (occhi, finestre) come tratti ripassati; più pezzi.
- Ritaglio della foto nell'app (vorrebbe `expo-image-manipulator`).
- Il contorno disegnato sulla mappa prima del percorso.
- `src/navigation/`, `words.py`, `letters.json`, `optimizer.py`,
  `network.py`, `shapes/outlines/*`, `shapes/__init__.py`.

## Le due righe di TASK-072

- **Anteprima prima della richiesta**: fatta. La linea gialla sopra la foto
  attenuata, e «Hide the picture» per vederla da sola, come sarà sulla
  mappa: il gatto si giudica lì, prima di aspettare il percorso.
- **Semplificazione**: resta com'è (ADR-0069). Sovrapposizione fra contorno
  finale e sagoma grezza sui cinque campioni, con 16–42 angoli:

  | Campione | Attuale (1% / 1%) | Metà (0,5% / 0,5%) | 0,3% / 0,3% |
  |---|---|---|---|
  | mela | 0,987 · 40 | 0,992 · 48 | 0,995 · 66 |
  | gatto | 0,981 · 39 | 0,989 · 54 | 0,993 · 73 |
  | Italia | 0,968 · 42 | 0,985 · 53 | 0,987 · 63 |
  | pera | 0,984 · 25 | 0,990 · 32 | 0,993 · 60 |
  | stella | 0,985 · 16 | 0,991 · 16 | 0,991 · 18 |

  Più angoli non rendono il gatto più riconoscibile: la sua sagoma è già
  quella del disegno.

## Prova sull'iPhone (2026-09-26)

Fatta dall'utente con i passi qui sotto, riferita dal coordinatore:
«sì, funziona tutto».

Dove siamo (2026-09-26): codice, test e documenti fatti, PR #89 aperta con
CI verde, legata alla sessione. Manca solo la prova dell'utente; poi
«TASK-073 fatto» al coordinatore con il numero della PR, e il merge lo fa
lui. Worktree `D:\shaperoute-TASK-073` (branch
`feat/TASK-073-image-in-app`, con il suo `node_modules`): **resta** fino al
merge, poi va rimosso. Nessun `.venv` nel worktree: si usa quello del
checkout principale con `PYTHONPATH` sui pacchetti del worktree (le
installazioni editabili puntano al checkout principale).

Passi per l'utente (Windows PowerShell):

1. Fermare API ed Expo che girano (Ctrl+C nelle due finestre).
2. Prima finestra, l'API:

   ```
   cd D:\shaperoute-TASK-073
   $env:PYTHONPATH = "D:\shaperoute-TASK-073\services\api;D:\shaperoute-TASK-073\services\route-engine;D:\shaperoute-TASK-073\services\ai"
   C:\Users\ricky\PycharmProjects\shaperoute\services\api\.venv\Scripts\python.exe -m shaperoute_api --lan --cache-dir C:\Users\ricky\PycharmProjects\shaperoute\data\cache
   ```

   `--cache-dir` punta alla cache del checkout principale: niente zone
   nuove né copie su C:.
3. Seconda finestra, Expo: `cd D:\shaperoute-TASK-073`, poi
   `npm.cmd run mobile`; QR con la fotocamera dell'iPhone, Expo Go.
4. Start «Another place»: Trento o Milano (zone in cache). Poi «Image»:
   - un oggetto scuro su un foglio bianco con spazio attorno (forbici,
     chiave, foglia): la linea gialla gli somiglia? «Hide the picture»
     funziona? Poi 10 km e «Draw route»;
   - «Take photo»: iOS chiede il permesso della fotocamera la prima volta;
   - una foto di una stanza o di una strada: il motivo del rifiuto in
     parole semplici;
   - facoltativo: una cartina dell'Italia su bianco, la Sardegna resta
     visibile sotto la linea, senza contorno giallo.

Da raccogliere per ogni caso: va / non va, con quello che si vede. Se
qualcosa non va, si corregge sul branch della PR #89 e si ripete la prova.

Controlli già fatti in locale (per ripeterli: `services/api` con lo stesso
`PYTHONPATH` e il python del checkout principale, `-m ruff check .`,
`-m black --check .`, `-m pytest -m "not network"`; da
`D:\shaperoute-TASK-073`, `npm.cmd run typecheck`, `npm.cmd test`,
`npm.cmd run format:check`, `npm.cmd run lint`): 117 test dell'API, 14 di
`shared-types`, 332 dell'app. Sotto carico il Jest completo può scadere in
LoadingBar, MapView e RoutePanel: da soli passano, e `--maxWorkers=2` li
fa passare tutti.

## Esito

Nell'app, accanto a Shape e Word, «Image»: una foto dalla libreria o
dalla fotocamera, il contorno che il motore ne ricava mostrato sopra la foto
prima del percorso, poi il percorso come per una forma; un'immagine
rifiutata mostra il motivo in parole semplici (ADR-0069). Provato
sull'iPhone dall'utente il 2026-09-26: «sì, funziona tutto». Dopo il merge
il worktree `D:\shaperoute-TASK-073` va rimosso.
