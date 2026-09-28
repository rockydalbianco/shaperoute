# TASK-079 — Modificare il contorno di un'immagine

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-079-image-outline` (parte da `main`)

Approvato dall'utente (`docs/PASSAGGIO.md`, «Aperto»): modificare il
contorno ricavato da un'immagine: aggiungere una parte (unita alla sagoma),
aggiungere dettagli come occhi (tratti attaccati alla linea, fatti andata e
ritorno), annullare. **Sempre un tratto solo.** ADR-0074 (numero dato in
`PASSAGGIO.md`). Seguito di TASK-072 (ADR-0068) e TASK-073 (ADR-0069).

## Obiettivo

Nell'anteprima del contorno di «Image» l'utente disegna col dito una parte
da unire alla sagoma o un dettaglio attaccato alla linea, vede subito il
contorno nuovo, può annullare una modifica alla volta, e il percorso segue
il contorno modificato: sempre una linea sola.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0068, ADR-0069; ADR-0039 e ADR-0065 per i tratti
  ripassati
- `route_engine/shapes/outline.py` (il formato `strokes`, già nel motore)
- `docs/API.md` «Un'immagine invece di una forma», `docs/UI.md`
  «L'immagine (TASK-073)»

## Come funziona (scelte tecniche, su delega dell'utente)

- **Il formato c'è già**: un dettaglio è uno `stroke` dei file dei contorni
  (TASK-037): parte dalla linea o da un dettaglio prima, il percorso lo
  segue fino in fondo e torna indietro; se finisce su un suo punto chiude un
  anello (un occhio appeso alla linea). `parse_outline` controlla che non
  incroci niente: la linea resta una sola.
- **La geometria la fa il motore**, in un modulo nuovo
  (`route_engine/outline_edits.py`, shapely come `image_outline.py`):
  - *parte*: la linea disegnata si chiude, si semplifica all'1% come il
    contorno, si unisce alla sagoma; deve sovrapporsi alla sagoma
    (altrimenti i pezzi sarebbero due) e aggiungere qualcosa. I buchi si
    perdono, come nel contorno. I dettagli già fatti devono restare
    attaccati alla linea nuova;
  - *dettaglio*: la linea disegnata si semplifica, l'inizio si aggancia al
    punto più vicino della linea o di un dettaglio se è abbastanza vicino
    (il dito non è preciso); se la linea si incrocia da sola, lì si chiude
    l'anello e il resto si lascia; poi il controllo di `parse_outline`.
  - ogni rifiuto ha un motivo in una parola, come le immagini.
- **L'API non tiene stato**: `POST /image-outline-edits` riceve il contorno
  di adesso (nella cornice della foto), la modifica, e risponde con il
  contorno nuovo o con il rifiuto. «Undo» è nell'app: la pila dei contorni
  di prima, senza chiamare l'API.
- **`POST /image-route-jobs` accetta `strokes`**, facoltativo: un'app
  vecchia non lo manda e va come prima.
- **App**: sotto l'anteprima «Add a part», «Add a detail», «Undo»; si
  disegna col dito sull'anteprima (`PanResponder` di React Native: nessuna
  dipendenza nuova), la linea gialla sottile mentre si disegna.

## Cosa fare

1. Motore: `outline_edits.py` e i suoi test deterministici.
2. API: `POST /image-outline-edits` (modulo nuovo), `strokes` in
   `/image-route-jobs` e nel GPX; motivi nel contratto.
3. `shared-types`: tipi, costanti e fixture nuovi, retrocompatibili.
4. App: modifica sull'anteprima, pila per «Undo», dettagli disegnati
   nell'anteprima, `strokes` nella richiesta del percorso; test Jest.
5. Documenti: `API.md`, `UI.md`, `ROUTE_ENGINE.md` se serve, ADR-0074.

## Criteri di accettazione

- [x] Motore: una parte che si sovrappone alla sagoma la allarga in un
      contorno solo; una parte staccata è `not_joined`, una tutta dentro
      `inside`; un dettaglio che parte vicino alla linea si aggancia e
      torna un `stroke` valido; un dettaglio che si incrocia chiude
      l'anello; lontano dalla linea `not_on_line`; che incrocia la linea
      o un altro dettaglio `crosses`; troppi angoli `too_many_corners`;
      una parte che copre l'attacco di un dettaglio `covers_detail`.
- [x] Ogni risultato passa `parse_outline` con i suoi `strokes`.
- [x] API: `POST /image-outline-edits` risponde con `points`, `strokes`,
      `image_points`, `image_strokes`, `aspect`; rifiuta con
      `outline_edit_rejected` e `reason`; input fuori misura
      `invalid_request`.
- [x] API: `/image-route-jobs` con `strokes` crea il job; senza, come
      prima; `strokes` controllati come il contorno.
- [x] I motivi del motore sono tutti nel contratto (test sul sorgente).
- [x] `shared-types` retrocompatibile, fixture lette da `tsc`, Node, API.
- [x] App: disegnare una parte e un dettaglio, rifiuto con il motivo in
      parole semplici, «Undo» fino al contorno ricavato, «Choose another»
      azzera la pila; i dettagli nell'anteprima; `strokes` nella richiesta.
- [x] `ruff`, `black --check`, `pytest -m "not network"` in motore e API;
      `npm run typecheck`, `npm test`, `npm run lint`, `format:check`.
- [ ] Prova sull'iPhone con l'utente prima del merge.

## File toccati

```
services/route-engine/route_engine/outline_edits.py                  (nuovo)
services/route-engine/tests/test_outline_edits.py                    (nuovo)
services/api/shaperoute_api/outline_edits.py                         (nuovo)
services/api/tests/test_outline_edits.py                             (nuovo)
services/api/shaperoute_api/images.py
services/api/shaperoute_api/schemas.py        (anche di TASK-080: ok dell'utente)
services/api/shaperoute_api/app.py            (anche di TASK-080: ok dell'utente)
services/api/tests/test_contract.py, test_images.py
packages/shared-types/src/index.ts            (anche di TASK-080: ok dell'utente)
packages/shared-types/test/contract.test.ts
packages/shared-types/fixtures/api-error-codes.json, image-limits.json
packages/shared-types/fixtures/edit-reasons.json, image-outline-edit-request.json,
  image-outline-edited.json, outline-edit-error.json                (nuovi)
apps/mobile/App.tsx                           (anche di TASK-080: ok dell'utente)
apps/mobile/src/route/useRouteRequest.ts, useRouteRequest.test.ts
                                              (anche di TASK-080: ok dell'utente)
apps/mobile/src/api/imageOutlines.ts, routes.ts (solo il tipo di reason)
apps/mobile/src/api/outlineEdits.ts, outlineEdits.test.ts            (nuovi)
apps/mobile/src/route/drawnLine.ts, drawnLine.test.ts, imageEdits.ts,
  ImageChoice.test.tsx, OutlineBoard.tsx, OutlineBoard.test.tsx,
  boardView.ts, boardView.test.ts                                    (nuovi)
apps/mobile/src/route/ImageChoice.tsx, ImagePreview.tsx e test
apps/mobile/src/route/useImageOutline.ts, test
apps/mobile/src/route/problems.ts, problems.test.ts
docs/API.md, docs/UI.md, docs/ROUTE_ENGINE.md, docs/DECISIONS.md (ADR-0074),
  docs/STATUS.md
docs/tasks/TASK-079.md
```

Scelte per non toccare altri file di TASK-080: le fixture del contorno
ricavato e della sua richiesta restano senza `strokes` (sono come le manda
un'API o un'app di prima, e `RoutePanel.test.tsx` le usa); le azioni di
modifica arrivano a `ImageChoice` con un contesto React
(`imageEdits.ts`), senza passare da `RoutePanel.tsx`; lo stato delle
modifiche sta fuori da `ImageState`.

## Fuori scope

- Cancellare una parte del contorno, spostare punti, gomma.
- Più pezzi staccati, buchi come tratti.
- I dettagli ricavati dalla foto da soli (occhi trovati dal motore).
- Il contorno disegnato sulla mappa prima del percorso.
- Lo stile delle lettere (TASK-080), EAS Update (TASK-083).

## Prova da capo a fondo (2026-09-28)

Con il motore vero e la cache di Milano, dall'API (`TestClient`): un disco
nero su bianco ricavato in 24 angoli, due orecchie aggiunte come parti, una
terza parte staccata rifiutata (`not_joined`), un occhio ad anello dal
fianco sinistro: 27 angoli e un dettaglio di 6 punti, ogni modifica sotto i
10 ms. Percorso da 10 km da piazza del Duomo: 9,3 km, somiglianza 0,96, in
3 s: testa, orecchie e occhio in una linea sola.

## Prova sull'iPhone

Da fare con l'utente prima del merge. Dal Mac, due finestre del terminale:

1. API dal worktree, con l'ambiente e la cache del checkout principale:

   ```
   cd ~/Progetti/shaperoute-079/services/api
   PYTHONPATH=$PWD:$PWD/../route-engine:$PWD/../ai ../../../shaperoute/services/api/.venv/bin/python -m shaperoute_api --lan --cache-dir ../../../shaperoute/data/cache
   ```

2. Expo dal worktree: `cd ~/Progetti/shaperoute-079 && npm run mobile`,
   poi il QR con l'iPhone (Expo Go).
3. Start su Milano (zona in cache), «Image», una foto di un oggetto scuro
   su un foglio bianco:
   - «Edit the outline»: la lavagna a tutto schermo; due dita ingrandiscono
     e spostano, «Fit» torna com'era; lo schermo resta fermo disegnando.
   - «Add a part», un triangolo a cavallo della linea: si unisce? Uno
     lontano dalla linea: il motivo in parole semplici?
   - «Add a detail», dal bordo verso l'interno, poi un giro che incrocia la
     propria linea: diventa un occhio? La pagina resta ferma mentre si
     disegna?
   - «Undo» due volte: torna al contorno ricavato?
   - 10 km e «Draw route»: il percorso ha le parti e i dettagli.

## Prima prova sull'iPhone (2026-09-28)

Dall'utente, via hotspot (Tailscale: l'iPhone non era nella tailnet del
Mac). Esito: mentre si disegna col dito la pagina scorre su e giù; la
lavagna deve essere a tutto schermo, con lo zoom. Fatto: «Edit the
outline» apre la lavagna (`OutlineBoard.tsx`, `boardView.ts`), l'anteprima
nella pagina mostra soltanto. Da ripetere la prova.

## Esito

*(a fine task)*
