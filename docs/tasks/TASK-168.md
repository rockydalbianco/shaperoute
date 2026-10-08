# TASK-168 — «Explore»: gli esempi di una città più veloci

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-168-explore-faster-examples` · ADR-0136

Chiesto dall'utente il 2026-10-02: «in Explore deve essere molto più
veloce quando seleziono una nuova città, gli esempi in Rovereto per
esempio».

Com'è oggi: scelta una città senza percorsi consigliati, l'app chiede
cuore, cerchio e stella da 5 km uno dopo l'altro (ADR-0116). Ognuno è un
calcolo del motore: 1–2,5 s sul Mac libero, circa 18 s sul server (5 km a
Trento), più il download della zona se il server non l'ha (Rovereto non è
fra le 52 città di TASK-137). L'app poi chiede lo stato ogni 2 s fissi: un
esempio pronto in 2,1 s si vede dopo 4. E ogni telefono rifà da capo gli
stessi tre calcoli della stessa città.

## Obiettivo

In una città che qualcuno ha già aperto, o disegnata prima, i tre esempi
compaiono appena scelta la città; dove si calcolano davvero, l'app li
vede appena sono pronti.

## Contesto da leggere

- ADR-0116 (gli esempi di una città), ADR-0032 (le richieste in due tempi),
  ADR-0085 e ADR-0092 (l'API non tiene la posizione di nessuno), ADR-0119
  (le zone sul server)
- `docs/API.md` («Richieste in due tempi», «Tempi»)

## Cosa fare

1. **API: gli esempi restano una volta disegnati.** File nuovo
   `route_store.py`: un percorso disegnato dal centro di una città (i
   centri che l'API stessa ha dato con `/cities` e `/city-suggestions`)
   resta in un file, e la stessa richiesta riceve il job già `done` nella
   risposta al `POST /route-jobs`. Niente da nessun'altra partenza, niente
   immagini. Un motore cambiato ridisegna (impronta del codice nel nome
   del file); 30 giorni, 3000 percorsi. In `data/cache/routes/`, che sul
   server è già fuori dal contenitore. `--no-route-store` lo spegne.
2. **API: disegnarli prima.** `python -m shaperoute_api.draw_examples
   --api … città… | --preset …`: chiede a un'API accesa quello che chiede
   l'app, una città alla volta.
3. **App: chiedere lo stato più spesso all'inizio.** `routes.ts`: ogni
   0,5 s nei primi 6 s, ogni secondo fino a 20 s, poi ogni 2 s come prima.
   Vale per ogni percorso, non solo per gli esempi.
4. Documenti: `API.md`, `UI.md` (le due righe), ADR-0136, `STATUS.md`.

## Criteri di accettazione

- [x] La seconda richiesta uguale dal centro di una città risponde `done`
      con il percorso nella risposta al `POST`, senza chiamare il motore
      (test via HTTP).
- [x] Un percorso da una partenza che non è il centro di una città, e
      quello di un'immagine, non lasciano niente sul disco (test).
- [x] Un motore diverso, un file illeggibile o più vecchio di 30 giorni
      fanno ridisegnare (test).
- [x] L'app, a un job già `done` nella risposta al `POST`, non chiede
      altro; i primi controlli arrivano ogni 0,5 s (test).
- [x] `draw_examples` dice per ogni città cosa ha disegnato e cosa ha
      trovato già tenuto (test).
- [x] Test verdi: API 465 (24 nuovi), app 820 (2 nuovi); ruff, black,
      lint, tipi, formattazione.
- [x] Visto dal vivo sul Mac (API del worktree, zona di Trento): primi tre
      esempi 10–14 s, gli stessi alla seconda richiesta 0,0 s.

## File toccati

```
services/api/shaperoute_api/route_store.py          (nuovo)
services/api/shaperoute_api/draw_examples.py        (nuovo)
services/api/shaperoute_api/jobs.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/__main__.py
services/api/tests/test_route_store.py              (nuovo)
services/api/tests/test_city_examples_kept.py       (nuovo)
services/api/tests/test_draw_examples.py            (nuovo)
services/api/tests/test_jobs.py
apps/mobile/src/api/routes.ts
apps/mobile/src/api/routes.test.ts
apps/mobile/__tests__/App.test.tsx                  (solo l'aiutante nextPoll)
docs/API.md
docs/UI.md                                          (due righe)
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-168.md
```

## Fuori scope

- Il motore: dove va il tempo di un esempio sul server (18 s contro 2 del
  Mac) va guardato nei log del server, con l'ok dell'utente.
- Le zone di altre città sul server (Rovereto e le città medie): è
  `prefetch_zones` sul server, con l'ok dell'utente (`DEPLOY.md` F.12).
- Lanciare `draw_examples` sul server: dopo il merge e l'aggiornamento
  dell'API, con l'ok dell'utente.
- «MEANWHILE, FROM THE FEED» quando gli esempi arrivano subito
  (`ExploreScreen.tsx`, `WhileDrawing.tsx`): oggi compare lo stesso, con
  «The shapes of this city are ready above.».
- Gli esempi senza A · B · C per fare prima: scelta dell'utente.
- Salvare tutti i percorsi generati (ADR-0086): è TASK-092, nel database.
  ADR-0136 dice come prende questo archivio di risposte.

## Esito

Fatto (2026-10-02). Un esempio disegnato dal centro di una città resta
sull'API e la stessa richiesta lo riceve nella risposta al `POST`: sul Mac
i tre esempi di Trento passano da 10–14 s a 0,0 s dalla seconda volta.
L'app chiede lo stato ogni 0,5 s all'inizio. Una città nuova per tutti
costa come prima: restano, con l'ok dell'utente, l'API aggiornata sul
server, `draw_examples` sulle città con la zona, le zone delle città medie
(Rovereto), e i log del server per capire i 18 s di un esempio. Emerso: i
disegni del feed compaiono in «Explore» anche quando gli esempi arrivano
subito (annotato in ADR-0136, «Conseguenze»).

**Sul server (2026-10-02, 10:38Z, con l'ok dell'utente).** API aggiornata
a `ec84042` (14 s ferma; immagine di prima `shaperoute-api:before-task171`).
`draw_examples` nel container dell'API, così la chiave non esce dal server:
62 città (le 52 italiane, Rovereto, le città in evidenza tranne Berlino),
186 percorsi, 13 MB, 30 minuti, mediana 27 s per città; picco di memoria
dell'API 1,87 GiB. Trento: 39 s la prima volta, 0 s la seconda. Zona di
Rovereto dall'estratto (`prefetch_zones --extract`, container a parte con
4 GiB): 84 s, 35 MB; il suo cuore da 62 s a 11 s, e ora tenuto. Venezia:
`engine_error` sulle tre forme, grafo senza nodi attorno al centro
(TASK-180). Dai log, i 18 s di un esempio: nei seguiti di `STATUS.md`.
