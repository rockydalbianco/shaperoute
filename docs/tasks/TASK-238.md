# TASK-238 — Spostare la figura sull'acqua

**Stato**: In corso (parte A PR #347; parte B fatta, PR da aprire dopo la A)
**Fase**: 4 · **Branch**: `feat/TASK-238-paddle-move-shape` (A),
`feat/TASK-238-paddle-move-app` (B)
**Dipende da**: TASK-191 (la canoa), TASK-226 (le forme a pezzi sull'acqua)

## Obiettivo

Chi ha un percorso in canoa davanti può **spostare la figura** dove la
vuole: un po' più a destra, a sinistra, più vicina alla riva, più al
largo. Chiesto dall'utente il 2026-10-05: «dai la possibilità nella
sezione padel di poter spostare la figura un po' più destra sinistro, un
po' più vicini alla riva, eccetera».

## Scelte dell'utente (2026-10-05)

- **Si sposta trascinandola col dito** sulla mappa: si tocca «Move», si
  trascina la figura, si lascia, e il motore la mette nel punto più vicino
  in cui ci sta. Proposte anche: quattro pulsanti («←», «→», «Closer to
  shore», «Farther out», la proposta dell'agente) e quattro frecce.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §8 «Sull'acqua», fino a «Una forma spostata
  dall'utente»
- `docs/API.md` «Sull'acqua: `"activity": "paddling"`»
- `docs/DECISIONS.md` ADR-0154, ADR-0161, ADR-0188, ADR-0202
- `docs/UI.md`: la mappa (`mapPage.ts`, i messaggi fra app e pagina)
- `services/route-engine/route_engine/water_fit.py`, `paddling.py`
- `apps/mobile/src/map/messages.ts`, `mapPage.ts`, `MapView.tsx`

## Il punto

Resta il principio di `CLAUDE.md`: **il percorso lo decide il motore**.
L'utente non disegna e non sceglie coordinate del percorso: dice *vicino a
dove* vuole la figura, e il motore la piazza nel posto più vicino in cui
sta tutta nella fascia (50 m dalla riva sui laghi, 200 m al mare, entro
1 km), con una riva raggiungibile a piedi entro 300 m. Per questo la
figura può fermarsi prima di dove è stata lasciata, e uscirne un po' più
piccola o inclinata.

## Cosa fare

**A. Motore, API, contratto** (una PR: il campo nuovo del risultato è
controllato da test di contratto in tutti e tre)

1. `RouteResult.centre`: il centro della forma sull'acqua, come è stata
   messa. `RouteRequest.near`: dove lo si vuole. Solo sull'acqua.
2. `water_fit.fit_shape(..., near=)`: la stessa ricerca, sui posti più
   vicini a `near`, con il costo dei metri di distanza da lì.
3. API: `near` nella richiesta, `centre` nella risposta; un percorso
   spostato non si tiene fra gli esempi.
4. `shared-types`, fixture, CLI `--near`.
5. `engine.zip` rifatto; gli esempi della canoa dentro l'app ridisegnati
   sull'acqua del server per controllare che non cambino.

**B. App**

6. La mappa: un modo «sposta» in cui il dito trascina il percorso invece
   della mappa, e al rilascio dice all'app di quanto (`messages.ts`,
   `mapPage.ts`, `MapView.tsx`).
7. «Draw» con «Paddle»: «Move» quando il risultato ha `centre`; al
   rilascio la richiesta di prima con `near` = `centre` + lo spostamento,
   la stessa `start`. Se la figura non è arrivata dove è stata lasciata,
   una riga lo dice.
8. I testi, in cinque lingue, **da far confermare all'utente**.
9. Gli esempi di «Explore» con «Paddle» non hanno `centre` (sono dentro
   l'app, disegnati prima): **non si spostano**, come i preferiti. Per
   farlo servirebbe ridisegnarli con `centre`, o chiedere il percorso al
   server al primo «Move the shape»: un seguito, da chiedere all'utente.

## Criteri di accettazione

Parte A:

- [x] Un percorso sull'acqua dice il `centre` della sua forma; su strada è
      `null`.
- [x] Con `near` a 150 m lungo la riva dal `centre`, la forma è lì (entro
      30 m più una cella della griglia), e il percorso passa la
      validazione sull'acqua.
- [x] Con `near` sulla terra, troppo al largo o fuori portata, la forma è
      nel posto più vicino in cui ci sta: più vicina a `near` di prima,
      mai più vicina alla riva del margine, sempre con la partenza dalla
      riva entro 300 m.
- [x] `near` uguale al `centre` ricevuto dà lo stesso percorso; due
      richieste uguali danno lo stesso percorso.
- [x] Senza `near` niente cambia: i 32 esempi dell'app, ridisegnati
      sull'acqua del server, sono identici punto per punto.
- [x] `near` con un'altra attività è `422 invalid_request`.
- [x] Un percorso spostato non si salva né si serve dagli esempi tenuti.
- [x] Una forma a pezzi (penna alzata) si sposta tutta insieme.
- [x] Test del motore, dell'API e di `shared-types` verdi; `engine.zip`
      allineato.

Parte B:

- [x] Con un percorso in canoa in «Draw», «Move the shape» fa trascinare
      la figura; al rilascio l'app richiede lo stesso percorso con `near`
      (`__tests__/AppPaddleMove.test.tsx`).
- [x] Mentre si trascina la mappa non si sposta; fuori dal modo «sposta»
      la mappa è com'era (`src/map/mapPageMove.test.ts`, e provato con
      MapLibre vero nel browser: la mappa ferma, la figura sotto il dito,
      `moved` all'app, poi la mappa che torna a muoversi).
- [x] Con un'API senza `centre` «Move the shape» non compare.
- [x] Se la figura non ci sta dov'è stata lasciata, una riga lo dice.
- [ ] I testi sono confermati dall'utente.
- [ ] Provato col dito sull'iPhone (il simulatore non l'ha visto: sul
      server la parte A non c'è ancora).

## File toccati

Parte A:

```
services/route-engine/route_engine/water_fit.py
services/route-engine/route_engine/paddling.py
services/route-engine/route_engine/models.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_water_near.py        (nuovo)
services/route-engine/tests/test_contract.py
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/on_phone.py
services/api/shaperoute_api/route_store.py
services/api/tests/test_paddling_near.py              (nuovo)
services/api/tests/test_contract.py
services/api/tests/test_better_distance.py            (l'elenco dei campi aggiunti)
services/api/tests/test_request_log.py                (i campi della richiesta registrata)
packages/shared-types/src/index.ts
packages/shared-types/test/contract.test.ts
packages/shared-types/fixtures/route-request-paddling-near.json  (nuovo)
packages/shared-types/fixtures/route-result-paddling.json        (nuovo)
packages/shared-types/fixtures/route-result-better-distance.json
apps/mobile/assets/engine/engine.zip
apps/mobile/src/paddle/paddleExamples.json            (solo la riga `engine`)
docs/ROUTE_ENGINE.md
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-238.md
```

Parte B (previsti):

```
apps/mobile/src/map/messages.ts
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/mapPageMove.test.ts               (nuovo)
apps/mobile/src/map/MapViewMove.test.tsx              (nuovo)
apps/mobile/src/paddle/MoveShape.tsx                  (nuovo, con il test)
apps/mobile/src/paddle/shapeMove.ts                   (nuovo, con il test)
apps/mobile/src/paddle/useMoveShape.ts                (nuovo, con il test)
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/App.tsx
apps/mobile/__tests__/AppPaddleMove.test.tsx          (nuovo)
apps/mobile/src/i18n/{de,es,fr,it}.ts
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-238.md
```

## I testi della parte B, da confermare con l'utente

| Dove | Inglese | Italiano |
|---|---|---|
| Pulsante sotto «Start» | Move the shape | Sposta la forma |
| Pannello, titolo | Move the shape | Sposta la forma |
| Pannello, cosa fare | Drag the shape where you want it, then let go. | Trascina la forma dove la vuoi, poi lasciala. |
| Pannello, nota | It stays on the water, off the shore, where it fits. | Resta sull'acqua, lontana dalla riva, dove ci sta. |
| Pannello, uscita | Cancel | Annulla |
| Se non ci sta | The shape does not fit there: this is the nearest place. | Lì la forma non ci sta: questo è il posto più vicino. |

Tedesco, spagnolo e francese sono in `src/i18n/`.

## Fuori scope

- Girare o ingrandire la figura col dito: TASK-232 porta l'inclinazione.
- Spostare la figura **su strada**: lì il posto lo trova la ricerca fra le
  strade, e uno spostamento a mano cambierebbe la somiglianza.
- Spostare la partenza dalla riva: la sceglie il motore, la più comoda per
  la figura dov'è.
- `draw_examples` e gli esempi di «Explore»: vedi il punto 9.

## Note per chi prosegue

- **L'acqua dei quattro luoghi d'esempio** si copia dal server in sola
  lettura (`scp 'root@<server>:/root/shaperoute/data/cache/water/…'`, i
  sei file del 2026-10-04) per rifare `paddle_examples`: 27 s. Dopo ogni
  modifica a un file che disegna sull'acqua (`models.py` compreso) vanno
  rifatti la riga `engine` di `paddleExamples.json` e `engine.zip`.
- **Sul server** la parte A arriva con il prossimo aggiornamento (con l'ok
  dell'utente, dal coordinatore); cambiando `route_engine`, poi va
  rilanciato `draw_examples`. L'app della parte B si può pubblicare anche
  prima: senza `centre` nella risposta «Move» non compare.

## Esito

*(parte A)* Il motore mette la figura vicino a un punto chiesto, l'API lo
passa e risponde il centro, il contratto li ha tutti e due. Sull'acqua
vera uno spostamento costa 1–6 s. La parte visibile, il trascinamento, è
la parte B.
