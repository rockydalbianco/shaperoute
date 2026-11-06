# TASK-380 — Roller: i pattini in linea sull'asfalto liscio

**Stato**: In corso — parte 0: misure in `main` (#886), scelte in PR.
**Fase**: 4 · **Branch**: `docs/TASK-380-0-roller` (parte 0), poi
`feat/TASK-380-a-roller-engine-api`, `feat/TASK-380-b-roller-app` ·
**ADR**: ADR-0324 · numeri dal Coordinatore (2026-11-04) · sessione
dello sport, avviata dal «Coordinatore Sport»

## Obiettivo

Chi va sui pattini in linea riceve un percorso che disegna la forma **solo
dove si pattina**: asfalto e cemento lisci, ciclabili, aree pedonali e
strade tranquille; niente sterrato, niente porfido o ciottoli, niente
strade principali. Lo pattina con passo, voce, salvataggio, Feed, Apple
Salute, Health Connect e Strava del suo sport.

È il terzo sport della fase 1 (TASK-376, ADR-0320), dopo Escursionismo
(TASK-377) e Gravel/MTB (TASK-378): file nuovi più una riga per registro,
come dice `docs/sports/COME-AGGIUNGERE.md`. Ogni altro file è una deroga,
da scrivere in `docs/sports/CONDIVISO.md`.

## Contesto

Scelta dell'utente del 2026-11-04 (`tasks/TASK-376.md`, punto 3): «Sì,
Roller», al posto dello sci di fondo, già «Record only». Indicazione di
allora: asfalto liscio e `inline_skates=yes`, e prima si misura quanta rete
resta.

Nessuna rete di oggi va bene così com'è:

- la rete **foot** (corsa, camminata) prende sentieri, sterrati, scalinate
  escluse ma anche ciottoli e porfido;
- la rete **bike** (ADR-0153, ADR-0167) pedala ogni `track` e le strade
  principali, e fa i marciapiedi «a piedi con la bici».

Chi pattina, per il Codice della strada (art. 190), è un pedone: niente
sensi unici, e le aree pedonali e i marciapiedi sono suoi.

Da leggere: `docs/sports/COME-AGGIUNGERE.md`, `docs/sports/CONDIVISO.md`,
`docs/sports/README.md` (il banco), `docs/sports/bike.md` e
`docs/sports/gravel.md` (le misure della bici), `docs/sports/roller.md`
(le misure di questo task), ADR-0320, ADR-0322.

## Cosa fare

### Parte 0 — misura e proposta (solo documenti)

1. Col banco, un comando per volta, `nice -n 10`, aspettando gli altri banchi
   e le suite: reti di prova con `--loader` (`out/TASK-380/loader.py`),
   senza toccare il motore e senza Overpass (i download grezzi della bici
   della parte 0 di TASK-378). Forme del catalogo a 5, 10, 20 e 30 km
   sulle sei zone.
2. Su cosa corrono i percorsi (superficie, strade con le auto, ciclabili),
   e quanto salgono e scendono, dalle tegole Terrarium (`CONDIVISO.md`, «Le
   quote»): `out/TASK-380/mix.py`. La bici di oggi come base.
3. Quanta rete dice `inline_skates` in OSM (`out/TASK-380/skates_tag.py`).
4. Le misure in `docs/sports/roller.md`, ADR-0324 in DECISIONS come
   «Proposto».
5. Le domande all'utente, una per volta, con una proposta già pronta: nome
   ed emoji, la rete, le distanze, gioco e record, i testi in en/it/de/fr/es,
   «ready». Le risposte qui sotto; ADR-0324 «Accettato».
6. La lista della parte A al Coordinatore, con il numero della migrazione.

### Parte A — motore, contratto, API (dopo le scelte, in una sessione sua)

Lista approvata dal Coordinatore il 2026-11-06, con la migrazione 0055.
È fatta sul diff della 378-A (#875), che ha toccato gli stessi registri:

```
services/route-engine/route_engine/networks/roller.py           (nuovo: filtro, regole di roller.md, ogni via nei due sensi)
services/route-engine/route_engine/networks/__init__.py         (una riga)
services/route-engine/route_engine/activities/inline_skating.py (nuovo: 5–30 km, rete roller)
services/route-engine/route_engine/activities/__init__.py       (una riga)
services/route-engine/tests/test_inline_skating.py              (nuovo)
services/route-engine/tests/test_sport_registry.py, test_bike_network.py, test_hiking.py,
    test_walking.py, test_mountain_biking.py, test_gravel_biking.py  (le liste «aggiunte da allora» e l'ordine)
packages/shared-types/src/sports/inline_skating.ts              (nuovo)
packages/shared-types/src/sports/index.ts                       (una riga)
packages/shared-types/fixtures/route-request-inline_skating.json (nuovo)
packages/shared-types/fixtures/contract.json, reads.json, run-activities.json
packages/shared-types/test/inlineSkating.test.ts                (nuovo)
packages/shared-types/test/sportRegistry.test.ts, hiking.test.ts, gravelMtb.test.ts
services/api/shaperoute_api/sports/inline_skating.py            (nuovo: InlineSkate, zone, SportBests 5/10/21,1/42,2 km, GPX)
services/api/shaperoute_api/sports/__init__.py                  (una riga)
services/api/shaperoute_api/activities.py                       (un nome nel Literal)
services/api/shaperoute_api/personal_bests.py                   (un nome nel Literal Sport)
services/api/shaperoute_api/reads.py                            (una riga)
services/api/shaperoute_api/game_rules.py                       (il Roller con chi va a piedi: scelta 4)
services/api/migrations/0055_inline_skating.sql                 (nuovo: CHECK di runs, favorites, group_runs, run_bests)
services/api/tests/test_inline_skating_api.py                   (nuovo)
services/api/tests/test_sport_registry_api.py, test_personal_bests.py, test_hiking_api.py,
    test_walking_api.py, test_cycling.py, test_record_only.py, test_favorites.py,
    test_paddling.py, test_gravel_mtb_api.py, test_game_rules.py (le liste)
services/api/shaperoute_api/route_store.py                      (una riga in SAME_ROUTES_AS, se la prova regge)
services/api/tests/fixtures/same_routes/<impronta>.json         (nuovo: la prova)
apps/mobile/src/sports/inline_skating.ts                        (nuovo: il profilo, nascosto)
apps/mobile/src/sports/index.ts                                 (una riga)
apps/mobile/src/search/searchFilters.ts                         (l'esclusione, se serve ancora, come in 378-A)
apps/mobile/src/sports/sportProfiles.test.ts, activityName.test.ts,
    src/route/distanceMiles.test.ts, src/api/accounts.test.ts   (le liste)
apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json  (da scripts/watch-sports.sh)
apps/mobile/assets/engine/engine.zip                            (rifatto, ultimo commit)
docs/tasks/TASK-380.md, docs/STATUS.md, docs/sports/CONDIVISO.md, docs/sports/roller.md,
    docs/DECISIONS.md (precisazione di ADR-0324)
```

- **L'impronta del motore**: `networks/roller.py` è un file nuovo nel
  motore. Se i nove percorsi fissi di `test_same_routes.py` restano
  identici, si tiene con `SAME_ROUTES_AS`, come Hike e MTB; altrimenti
  serve una notte di esempi, col sì dell'utente.
- **Una zona `roller` in memoria sul server**: la parte A misura quanto
  pesa (`activity_graphs.ZONES_IN_MEMORY`), come la MTB.
- **Il banco sul motore vero**: la rete `roller` scaricata col suo filtro,
  sulle zone intere, contro le misure di `roller.md`; corsa, bici e canoa
  identiche (`compare --same`).
- **Il controllo «veicolo»** del gioco: vedi sotto, nelle scelte.
- **Lista approvata dal Coordinatore** (2026-11-06), con la migrazione
  **`0055_inline_skating.sql`**: la 0054 è di TASK-406 A (`ski_resorts`,
  #881).
- **L'ordine**: la #880 (400 B, piscina) tocca file che sono anche in
  questa lista (`reads.json`, `sports.json` dell'orologio, i test
  `sportProfiles`, `activityName` e `src/api/accounts.test.ts`). La
  sessione 380-A parte da `origin/main` solo dopo che la #880 è in `main`.
  Prima della PR unisce `main` con quello che è entrato nel frattempo:
  378 C tocca `settings/sport.ts` e i test che contano gli sport, 385 E
  tocca `packages/shared-types`.
- **Il motore**: la prova delle stesse rotte (`test_same_routes.py` e
  `SAME_ROUTES_AS`) è obbligatoria, altrimenti la CI dell'API è rossa.
  `engine.zip` si rifà nell'ultimo commit. `schemas.py` non si tocca senza
  dirlo al Coordinatore.
- Prima del codice, la sessione della parte A conferma la lista al
  Coordinatore.

### Parte B — app (dopo A)

Il profilo completo (`settings/sport.ts`, l'emoji in
`screens/RunNoRouteButton.tsx`, i tipi nei file importati, `PublicParts`,
i testi in `i18n`, l'avviso `caution`), con la sua lista al Coordinatore
prima del codice. Apple `.skatingSports` (39) e Health Connect
`EXERCISE_TYPE_SKATING` (60), da verificare sulle librerie. Solo
JavaScript: l'impronta iOS non si muove.

## Scelte dell'utente

Una alla volta, ciascuna con la proposta dell'agente, il 2026-11-06. Tutte
come la proposta, tranne la quarta:

1. **Nome ed emoji**: «Roller» 🛼. In tedesco «Inline», perché «Roller» è
   il monopattino; in spagnolo «Patines».
2. **La rete**: `roller` di `roller.md`.
   - Dentro: asfalto e cemento lisci, ciclabili, marciapiedi, aree
     pedonali e strade fino alle terziarie.
   - Fuori: sterrato, ciottoli, porfido, strade principali e secondarie.
   - Ogni via va nei due sensi.

   Si promettono la città e la pianura: in montagna il motore spesso dice
   che la forma non si disegna (Fiemme e Asiago 2 su 9 al banco).
3. **Le distanze**: da 5 a 30 km (al banco a 5 km 13 su 18, a 10–30 km 34
   su 54).
4. **Gioco e record**: nel gioco, con record personali propri. La
   proposta era «come la bici», fuori dal gioco perché su ruote. I metri
   del Roller contano nel gioco come quelli di una corsa, con gli stessi
   controlli. I record personali sono suoi, su 5, 10, 21,1 e 42,2 km,
   separati da quelli della corsa.
5. **I testi**, approvati come proposti. Il tono è quello dell'app («tu»,
   in tedesco «du»).

   | en | it | de | fr | es |
   |---|---|---|---|---|
   | Roller | Roller | Inline | Roller | Patines |
   | Skate without a route | Pattina senza percorso | Ohne Route skaten | Rouler sans parcours | Patinar sin ruta |
   | Watch for traffic and steep descents: check the route before you set off. | Attento al traffico e alle discese ripide: controlla il percorso prima di partire. | Achte auf Verkehr und steile Abfahrten: Prüf die Route, bevor du losfährst. | Attention à la circulation et aux descentes raides : vérifie le parcours avant de partir. | Cuidado con el tráfico y las bajadas pronunciadas: revisa la ruta antes de salir. |

   - «Roller» è il nome in «Impostazioni», nella ricerca e nei post.
   - «Skate without a route» è il pulsante per partire senza percorso.
   - L'avviso sta sotto ogni percorso del Roller in «Disegna» (il campo
     `caution` del profilo, come Hike).
6. **Quando si accende**: appena pronto. «ready» diventa vero quando il
   server ha la parte A e l'app ha la parte B. Server, migrazione, notte
   degli esempi (se serve) e aggiornamento di produzione restano ciascuno
   col sì dell'utente.

**Deciso dall'agente su delega dell'utente**:

- L'attività nel contratto si chiama `inline_skating`, con la forma in
  «-ing» di quelle di oggi. Non `skating`, che alcuni test usano come
  attività sconosciuta.
- Nel gioco il Roller fa come la camminata e Hike: i metri contano, ma
  niente tempi migliori del gioco (le forme del passo restano della
  corsa). I record personali sono a parte, in `personal_bests`.

**Un punto aperto per la parte A**: il controllo «veicolo» del gioco
(`game_rules.py`) scarta una corsa se più del 10% va oltre i 7 m/s (25
km/h) su 200 m. Un pattinatore veloce, o in discesa, ci arriva. La parte A
misura sulle corse vere quanto succede e, se serve, propone una soglia per
sport. La soglia è una scelta da chiedere all'utente.

Le scelte toccano le liste di A e B in tre punti:

- **Parte A:** `game_rules.py` conta il Roller con la corsa, la camminata e
  Hike.
- **Parte A:** i record personali del Roller (`SportBests`) e il CHECK di
  `run_bests` nella migrazione.
- **Parte B:** l'avviso è il campo `caution` del profilo; `ready: true` va
  in `settings/sport.ts` solo dopo che il server ha la parte A.

## Criteri di accettazione

- [x] 0: le misure delle reti sono in `roller.md`; ADR-0324 è proposto.
- [x] 0: le scelte dell'utente sono scritte qui, una per una (2026-11-06).
- [x] 0: la lista della parte A è al Coordinatore, con la domanda sul numero
      della migrazione (approvata, 0055, 2026-11-06).
- [ ] A: un percorso roller sul grafo di prova sta sull'asfalto liscio e
      lascia fuori sterrato, ciottoli e strade principali; test
      deterministici; corsa, bici e canoa invariate al banco (`compare`).
- [ ] B: lo sport si sceglie, si pattina, si salva e va in Salute; i testi
      sono in cinque lingue.

## File toccati

Parte 0:

```
docs/tasks/TASK-380.md     (nuovo)
docs/sports/roller.md      (nuovo)
docs/DECISIONS.md          (solo ADR-0324, in fondo)
docs/STATUS.md             (righe proprie)
docs/INDEX.md              (una riga)
```

Seconda PR (le scelte): gli stessi file.

## Dove si è

2026-11-06: misurate col banco quattro reti di prova, dai download
grezzi della bici della parte 0 di TASK-378, senza Overpass. La bici sulla
stessa area è la base:

- **`roller`** (asfalto liscio, niente strade principali e secondarie):
  34 su 54, 10 buoni. Regge in città e in pianura, non in montagna, dove
  senza le secondarie la rete si spezza.
- **`rollersec`** (con le secondarie): 42 su 54, col 12% dei km su strade
  veloci.
- **`rollerquiet`**: 21 su 54.
- **`rollerflat`** (senza le salite oltre l'8%): 26 su 54. Vorrebbe le
  quote nel motore.
- **`inline_skates`**: 4,5 km in sei zone.

Le misure sono in `roller.md`, e ADR-0324 è scritto come proposto.
Prossimo: le scelte dell'utente, una alla volta.

- Gli script del banco sono in `out/TASK-380/` nel worktree della parte 0
  (`friendly-shirley-762bd1`), ignorato da git: `loader.py`, `mix.py`,
  `elevation.py`, `summ.py`, `tags.py`, `skates_tag.py`, `six.sh`.
- Le tegole Terrarium scaricate sono in `out/TASK-380/dem`.

2026-11-06: la parte 0 è in `main` (#886). Le scelte dell'utente, una alla
volta:

1. «Roller» 🛼;
2. la rete `roller`;
3. da 5 a 30 km;
4. nel gioco, con record personali propri (la proposta era fuori dal
   gioco);
5. i testi;
6. acceso appena pronto.

ADR-0324 accettato. Il Coordinatore ha approvato la lista della parte A,
con la migrazione 0055. Prossimo: la parte A in una sessione nuova, da
`origin/main` dopo la #880 (400 B).
