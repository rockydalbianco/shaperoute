# TASK-206 — Forme in bici più riconoscibili

**Stato**: In corso (parte A, il motore, in `main` dalla PR #249, con i
campioni di Trento giudicati dall'utente; parte B, l'API e il contratto,
in `main` dalla PR #263; parte C, l'app, in corso sul branch
`feat/TASK-206-bike-on-foot-app`)
**Fase**: 4 · **Branch**: `feat/TASK-206-bike-shapes` (parte A)
**Dipende da**: TASK-190 (la bici: motore, API e app in `main`)

## Obiettivo

Le forme in bici si riconoscono come quelle di corsa. Chiesto dall'utente
il 2026-10-03, dopo i cinque campioni di Trento di TASK-190 (cuore e
cerchio «quasi», le stelle «no»): «va bene ma migliora».

## Scelta dell'utente (2026-10-03)

Mostrata la pagina `out/task206-bike-walk-compare.html` (Trento, 10 km:
corsa, bici di oggi, bici con tratti a mano in blu, a sei e a tre volte il
costo), alla domanda «In bici le forme migliorano solo se il percorso può
avere brevi tratti con la bici a mano: li permettiamo?»:
**«Sì, poco»** — circa 0,7–1 km a mano su 10, che si vedono sulla mappa e
la voce annuncia. Scartate: «Sì, di più» (fino a 2,5 km su 10) e «No,
solo in sella» (solo le gallerie stradali tolte).

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §4, «La rete della bici»
- `docs/MAPS.md` «Sorgente», «Cache», «Le zone della bici»
- `docs/DECISIONS.md` ADR-0153 (la bici), ADR-0167 (la bici a mano)
- `docs/tasks/TASK-190.md`, «I campioni»
- `services/route-engine/route_engine/network.py`, `validation.py`

## Cosa si è misurato (2026-10-03, sul Mac, senza rete)

Sulla zona della bici di Trento scaricata per TASK-190 (e sulle risposte
di Overpass rimaste nella cache di OSMnx), cuore, cerchio e stella da
Piazza Duomo, somiglianza a 10 km (bici di oggi 0,70 · 0,77 · 0,95; corsa
0,86 · 0,91 · 0,98):

| Prova | Cuore | Cerchio | Stella | Esito |
|---|---|---|---|---|
| La forma nel verso opposto | 0,71 | 0,71 | 0,94 | niente |
| Senza sensi unici (solo misura, non si può) | 0,80 | 0,78 | 0,99 | un po' |
| Sentieri con `bicycle=yes` in sella | 0,70 | 0,74 | 0,95 | niente |
| Zone pedonali in sella | 0,72 | 0,72 | 0,91 | niente |
| Zone dei punti più larghe (3–4% del perimetro) | 0,70–0,78 | 0,72–0,83 | non disegnabile | peggio |
| Altre partenze (Trento Nord, Clarina, Madonna Bianca, Povo) | 0,62–0,86 | non disegnabile–0,71 | non disegnabile–0,94 | niente |
| **Bici + tratti a piedi, 6× il costo** | **0,79** | **0,90** | 0,92 (più grande) | **0,7–1,1 km a piedi** |
| Bici + tratti a piedi, 3× il costo | 0,90 | 0,87 | 0,95 | 1,2–2,6 km a piedi |
| Bici + tratti a piedi, stesso costo | 0,89 | 0,86 | 0,95 | 5,7–6,4 km a piedi |

La rete della bici a Trento ha due terzi dei km di quella a piedi (mancano
marciapiedi e sentieri) e un quinto è a senso unico. I tratti a piedi
delle prove venivano dalla zona a piedi unita a quella della bici: una
stima di quello che fa la parte A, non la parte A.

## Cosa fare

In tre PR, come TASK-190.

**A. Route Engine** (fatta, ADR-0167)

1. `walkable`: le vie dove la bici si porta a mano (`footway`, `path`,
   `bridleway`, zone pedonali chiuse alle bici, `bicycle=dismount`; mai
   scale, mai `foot=no`); archi nei due sensi segnati `walk`.
2. L'altro senso di ogni senso unico, a piedi (`walkable_beside`),
   aggiunto dopo la semplificazione; nessun arco a piedi accanto a uno in
   sella fra gli stessi nodi nello stesso verso.
3. `WALK_COST` = 6 nel costo del tracciamento e in `step_cost` (il
   ritorno da una partenza vicina, i tratti fra le lettere).
4. Il secondo filtro della bici scarica tutti i sentieri e i marciapiedi;
   `foot` fra i tag tenuti.
5. I controlli: i metri a piedi (`on_foot`) e l'avviso «… m of the route
   with the bike on foot»; la CLI li stampa.
6. Le zone di prima restano valide, senza tratti a piedi; quelle nuove
   portano `on_foot=True`.

**B. API e contratto** (via del coordinatore il 2026-10-03; branch
`feat/TASK-206-bike-on-foot-api` da `origin/main` aggiornato, in un
contesto pulito)

7. `on_foot` nel risultato (`RouteResult` del motore, `RouteResultBody`,
   `shared-types`, `contract.json`): `[da, a]` indici nei punti, entrambi
   compresi, come i `walks` della penna alzata, calcolati dai nodi del
   percorso (i punti sono il primo nodo più i punti di ogni arco tranne il
   primo, `_edge_points`: lo stesso in `snap_to_network`, `pen_up`,
   `with_approach`, `first_leg`); un arco è a piedi se `on_foot_edge`.
   Anche nelle alternative, nelle partenze vicine (l'avvicinamento può
   essere a piedi) e nei percorsi tenuti (`route_store`, preferiti).
   `API.md`. **Si aggiunge senza togliere niente**: vuoto per la corsa e
   la canoa, un'app vecchia lo ignora (test del contratto);
   `test_contract.py` vuole gli stessi campi in `RouteResult` e
   `RouteResultBody`, quindi entrano insieme.
8. **Incrocio** (coordinatore): TASK-211 A (seguire e la ricerca degli
   iscritti nell'API) può toccare `app.py`, `schemas.py` e `shared-types`;
   lì solo aggiunte, entra prima chi è pronto prima, l'altro si aggiorna.
9. Le frasi della voce per i tratti a mano **non sono di B ma di C**
   (indicazione del coordinatore): B dà solo i dati.
10. Sul server, dopo B: rifare la zona della bici di Trento dall'estratto
    e `draw_examples`, in un aggiornamento solo, **con un nuovo ok
    dell'utente** («Note per il deploy»).

**C. App**

11. I tratti a mano sulla mappa, in un altro stile (`src/theme/tokens.ts`),
    e i metri a mano nella scheda del percorso; la voce che li annuncia
    all'inizio e alla fine di un tratto; testi da far approvare
    all'utente.

### Piano della parte C (2026-10-03)

Branch `feat/TASK-206-bike-on-foot-app` da `main`. Prima i testi e lo
stile, chiesti all'utente una domanda alla volta (qui sotto, «Le domande
della parte C»); **il codice parte dopo la #259** (TASK-209, la voce in
cinque lingue: le frasi nuove vanno nelle sue tabelle di `src/voice/`),
quando il coordinatore scrive «#259 dentro».

1. **I tratti** — `src/route/onFoot.ts` (nuovo): `onFootOf(points,
   on_foot)` li controlla come `walksOf` controlla i `walks` (stessa forma:
   indici interi, in ordine, dentro i punti); da un'API vecchia, o se non
   tornano, nessun tratto e il percorso di prima. I metri di un tratto
   lungo i punti, come `walkedMetres`.
2. **La mappa** — `messages.ts`: `showRoute` manda anche i tratti a mano
   (`onFoot`, linee); `mapPage.ts`: un livello `on-foot` **sopra** la linea
   del percorso (la bici a mano è parte del disegno, al contrario dei
   `walks` della penna alzata, che stanno sotto), nello stile scelto
   dall'utente, con un token nuovo in `tokens.ts` (solo aggiunta);
   `MapView.tsx`: la prop `onFoot`; `App.tsx`: `on_foot` del percorso
   scelto, di quello seguito e di un preferito aperto, accanto ai `walks`.
   Le alternative grigie restano senza tratti.
3. **La scheda del percorso** — il motore manda già l'avviso «923 m of the
   route with the bike on foot», che oggi la scheda mostra così com'è, in
   inglese. Una regola in `warnings.ts` lo dice col testo approvato,
   attraverso `t()` (tabelle di `src/i18n/`, solo aggiunte): `RoutePanel.tsx`
   non cambia. Sotto 1 km i metri arrotondati a 10, da 1 km «1,1 km».
4. **La voce** — `src/navigation/onFootVoice.ts` (nuovo), funzioni pure
   come `penUp.ts`: dai metri lungo il percorso del navigatore (ADR-0052)
   la frase d'inizio prima di un tratto e quella di fine alla sua fine, una
   volta ciascuna; un fix peggiore di `POOR_FIX_M` non muove niente. La
   registrazione **non** va in pausa: il tratto a mano è disegno e
   punteggio (ADR-0167). Le frasi nel `Phrasebook` delle cinque tabelle di
   `src/voice/` (inglese e italiano approvati dall'utente, tedesco,
   spagnolo e francese «da confermare»); `useNavigation.ts` le chiama
   accanto a `movePen`. Tratti troppo corti o troppo vicini: soglie decise
   dall'agente sui campioni di Trento, in `DECISIONS.md`.
5. **I preferiti** — `api/favorites.ts`: `on_foot` nella richiesta solo se
   non vuoto, e `asBefore` lo toglie (il secondo tentativo con un'API
   precedente, come `walks` e `activity`); `favoriteRoute.ts`: lo tiene
   salvando e lo ridà aprendo un preferito.
6. **Test** deterministici: `onFoot.test.ts`, la mappa (`messages`,
   `mapPage`), `warnings.test.ts`, `onFootVoice.test.ts`, `useNavigation`,
   i preferiti, e un test dell'app con un percorso in bici
   (`route-result-cycling.json` di `shared-types`).
7. **Documenti**: `UI.md` (la mappa, la scheda, la voce), ADR-0167
   «Aggiornamento (parte C)», `STATUS.md`, questo file.

**Non nella parte C**: il GPX (non cambia), le corse salvate (senza
`on_foot`), il server e la pubblicazione (l'app che manda `on_foot` nei
preferiti va pubblicata dopo l'aggiornamento del server: «Note per il
deploy»).

**File di altri** (risposta del coordinatore, 2026-10-03): `App.tsx` e
`favoriteRoute.ts` si toccano subito, solo aggiunte piccole (la #255 è in
pausa e si aggiornerà lei); `src/route/warnings.ts` è libero (non è nel
diff della #255); `useNavigation.ts` e `src/voice/` dopo il merge della
#259 («#259 dentro»).

### Le domande della parte C

Una per volta, ognuna con una proposta; le risposte qui sotto.

1. La riga dei metri a mano nella scheda del percorso.
2. Le frasi della voce all'inizio e alla fine di un tratto (inglese e
   italiano).
3. Lo stile del tratto sulla mappa.
4. «Start» su un percorso in bici apre la navigazione della corsa (ritmo
   al km, voce della corsa): cosa farne (TASK-190, «Seguiti» e domanda 2).
5. Con la penna alzata in bici la scheda dice «km walking between them» e
   la voce «Walk to the U»: cosa farne (TASK-190, «Seguiti»).

**Le risposte dell'utente (2026-10-03)**, tutte sulla proposta:

1. **La scheda**: EN «Includes 920 m walking the bike.» · IT «Di cui 920 m
   con la bici a mano.» Una nota `info`; sotto 1 km i metri arrotondati a
   10, da 1 km «1.1 km» («1,1 km» in italiano).
2. **La voce**: un avviso **50 m prima** del tratto, EN «In 50 metres, get
   off and walk the bike for 200 metres.» · IT «Tra 50 metri scendi e porta
   la bici a mano per 200 metri.»; alla **fine** del tratto EN «Back on the
   bike.» · IT «Risali in bici.» I metri del tratto arrotondati come nella
   scheda. Tedesco, spagnolo e francese scritti dall'agente, «da
   confermare».
3. **La mappa**: la linea del percorso resta **gialla e intera**; sopra il
   tratto a mano corrono **trattini scuri** (token nuovo in `tokens.ts`,
   dal colore del testo sul giallo). Scartati il blu delle pagine di
   confronto (spezza la forma) e il giallo tratteggiato.
4. **«Start» in bici**: **un task a parte**, «la navigazione in bici»
   (velocità in km/h sulla schermata e nella voce dei km, avvisi di svolta
   più in anticipo): **TASK-216** (numero del coordinatore,
   `tasks/TASK-216.md`). La parte C aggiunge solo la
   voce dei tratti a mano alla navigazione di oggi.
5. **La penna alzata in bici**: **in TASK-216**, con la scheda
   «… km riding between them» · «… km in bici fra una lettera e l'altra»
   e la voce «Letter done. Ride to the U: the drawing is paused.» ·
   «Lettera finita. Pedala fino alla U: il disegno è in pausa.» La parte C
   non tocca `RoutePanel.tsx` (della #255).

## Criteri di accettazione

- [x] Dalla CLI e nei test, senza rete: un percorso `cycling` può portare
      la bici a mano su marciapiedi, sentieri e nell'altro senso di un
      senso unico, mai su scale, mai su vie chiuse ai pedoni.
- [x] Un metro a piedi costa sei metri in sella; i controlli e l'avviso
      dicono quanti metri a piedi.
- [x] La corsa e la canoa non cambiano: la suite del motore e dell'API
      verde con i valori di prima.
- [x] Campioni in bici a Trento rifatti con la parte A, giudicati
      dall'utente (2026-10-03): i cerchi da «quasi» a «sì», cuori e stelle
      come prima. *(Levico e Padova quando Overpass riapre.)*
- [ ] Nell'app i tratti a mano si vedono e la voce li annuncia (parte C).
- [ ] Test deterministici per motore, API e app. *(Motore e API: parte
      B; l'app con la parte C.)*
- [x] `on_foot` nel risultato e nel contratto, solo come aggiunta: vuoto
      per la corsa e la canoa, un'app vecchia lo ignora (parte B).

## File toccati

**Parte A**:

```
services/route-engine/route_engine/network.py
services/route-engine/route_engine/validation.py
services/route-engine/route_engine/nearby_starts.py
services/route-engine/route_engine/pen_up.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_bike_on_foot.py              (nuovo)
services/route-engine/tests/test_bike_network.py
services/api/tests/test_zone_extract.py
services/api/tests/test_cycling.py
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-206.md                                        (nuovo)
samples/TASK-206_{heart,circle,star}_{10,20}km_trento_v1.gpx (nuovi)
samples/LOG.md
```

**Parte B**:

```
services/route-engine/route_engine/models.py
services/route-engine/route_engine/network.py
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/nearby_starts.py
services/route-engine/route_engine/pen_up.py
services/route-engine/tests/test_bike_on_foot_result.py       (nuovo)
services/route-engine/tests/test_contract.py
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/route_store.py
services/api/shaperoute_api/favorites.py
services/api/migrations/0012_favorite_on_foot.sql             (nuovo)
services/api/tests/test_contract.py
services/api/tests/test_route_store.py
services/api/tests/test_favorites.py
packages/shared-types/src/index.ts
packages/shared-types/test/contract.test.ts
packages/shared-types/fixtures/route-result-cycling.json      (nuovo)
packages/shared-types/fixtures/favorite-request-on-foot.json  (nuovo)
packages/shared-types/fixtures/favorite-on-foot.json          (nuovo)
docs/API.md
docs/DATABASE.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-206.md
```

**Parte C** (previsti, dal piano; quelli di altri con l'ok del
coordinatore, qui sopra nel piano):

```
apps/mobile/src/route/onFoot.ts                          (nuovo)
apps/mobile/src/route/onFoot.test.ts                     (nuovo)
apps/mobile/src/route/warnings.ts
apps/mobile/src/route/warnings.test.ts
apps/mobile/src/map/messages.ts
apps/mobile/src/map/messages.test.ts
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPage.test.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/MapView.test.tsx
apps/mobile/src/theme/tokens.ts                          (solo aggiunta)
apps/mobile/App.tsx
apps/mobile/__tests__/AppBikeOnFoot.test.tsx             (nuovo)
apps/mobile/src/navigation/onFootVoice.ts                (nuovo)
apps/mobile/src/navigation/onFootVoice.test.ts           (nuovo)
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useNavigation.test.ts
apps/mobile/src/voice/{phrasebook,en,it,de,es,fr}.ts
apps/mobile/src/i18n/{it,de,es,fr}.ts                    (solo aggiunte)
apps/mobile/src/api/favorites.ts
apps/mobile/src/api/favorites.test.ts
apps/mobile/src/favorites/favoriteRoute.ts
apps/mobile/src/favorites/favoriteRoute.test.ts
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-206.md
docs/tasks/TASK-216.md                                   (nuovo)
```

La migrazione dei preferiti non era prevista: chiesta al coordinatore, che
l'ha approvata il 2026-10-03 (il numero è il primo libero in `main` al
merge: la `0011` l'ha presa TASK-211 A, entrata prima). `pen_up.py`
per `walks_problem`, che controlla anche i tratti a mano.

Rispetto all'elenco mandato al coordinatore: `models.py` e `optimizer.py`
non servono in A (`on_foot` nel risultato è della parte B, perché
`test_contract.py` vuole gli stessi campi nel motore e nell'API);
`nearby_starts.py` e `pen_up.py` sì (`step_cost` nel ritorno e fra le
lettere); i due test dell'API dicevano che la bici non passa mai dal
marciapiede né contromano.

## Note per il deploy

- **La rete della bici si chiama ancora `bike`** (ADR-0167, punto 6): il
  coordinatore aveva chiesto di scrivere il nome nuovo, ma un nome nuovo
  non c'è. I file `bike_*` fatti prima di TASK-206 restano sul disco e
  **funzionano come prima, senza tratti a mano**; un grafo fatto dopo porta
  `on_foot=True`. Per avere la bici a mano una zona va **rifatta**:
  cancellare il `bike_*.graphml` col suo `.pickle` e rifarlo (sul server
  `prefetch_zones --activity cycling --extract …`, `MAPS.md`, «Le zone
  della bici»; sul Mac da Overpass).
- **Una zona della bici pesa quasi il doppio.** Misurato sul Mac sulla
  zona lontana di Trento (19 × 19 km), letta dal pickle in un processo
  nuovo: prima 20.972 nodi e 45.933 archi, 89 MB in memoria, pickle 12 MB,
  GraphML 26 MB; con la parte A 35.824 nodi e 92.699 archi, **156 MB** in
  memoria (×1,75), pickle 21 MB, GraphML 49 MB; letta in 0,3 s. **Stima
  per il server**, dove la zona della bici è di 26 × 26 km (`bike_zone_box`,
  circa 1,9 volte l'area): la zona di Trento di oggi (41 MB) passa a circa
  75–80 MB su disco e a **circa 0,3 GB in memoria**; la forbice per una
  zona della bici di ADR-0153 (0,15–0,6 GB) diventa **0,3–1,1 GB**. L'API
  tiene in memoria una sola zona della bici (`API.md`, «Grafi»): sul CX33
  da 8 GB resta posto, ma va guardato `docker stats` dopo la prima
  richiesta in bici.
- **Rifare Trento dall'estratto**: oggi 120 s, con un picco di osmium di
  3,6 GB (TASK-205, il taglio dell'estratto, che non cambia). La parte di
  OSMnx lavora circa il doppio degli archi: stima **3–4 minuti**, picco di
  osmium uguale, quello di Python più alto. Con `draw_examples` (circa 35
  minuti) l'aggiornamento costa circa 40 minuti di server occupato, l'API
  ferma solo i 15–20 s del riavvio.
- **Cambia l'impronta del motore**: dopo l'aggiornamento del server va
  rilanciato `draw_examples` (circa 35 minuti, `AGENTI.md` regola 11),
  anche se gli esempi di corsa vengono identici. Un aggiornamento solo dopo
  la parte B, con un nuovo ok dell'utente: server a `main`, zona della bici
  di Trento rifatta, `draw_examples`. Il server non si tocca prima.
- **La parte B porta una migrazione** (`0012_favorite_on_foot.sql`, ok del
  coordinatore): `favorites` prende `on_foot`, additiva, default `[]`,
  senza riscrivere la tabella. La applica l'API da sola all'avvio, come le
  altre. **Il numero**: TASK-211 A è entrata prima con la `0011`
  (`0011_follows.sql`), questa è la `0012` (`AGENTI.md` regola 10); se
  un'altra entra prima, si rinomina al primo libero. L'app che manda `on_foot` nei preferiti (parte
  C) va pubblicata dopo l'aggiornamento del server: un'API precedente
  rifiuta il campo.

## Fuori scope

- Le gallerie stradali in bici (fino a 1 km nei campioni di TASK-190): un
  seguito.
- Lo sterrato, la bici da corsa contro la mountain bike (TASK-190).
- Le stelle: con i tratti a mano non migliorano a Trento.

## Esito

### Parte A — 2026-10-03

In `main` dalla PR #249 (CI 5/5 verde). Fatta come «Cosa fare» 1–6
(ADR-0167). Motore 1.205 test verdi (`-m "not
network"`, 27 nuovi in `tests/test_bike_on_foot.py`); in
`tests/test_bike_network.py` quattro test dicono ora «in sella» dove
dicevano «mai». Nella città dei test il cerchio in bici da 10 km porta la
bici a mano per un isolato, 300 m. API: i due test della bici che
vietavano marciapiede e contromano ora li ammettono a piedi, con l'avviso.

**La corsa e la canoa non cambiano** (condizione del coordinatore).
Impronte (`request_log.fingerprint`, i punti al centimetro) dei cinque casi
di Trento di TASK-203, come li fa l'API (`plan_nearby` con tre partenze
vicine, `processes=False`), sulle zone a piedi della cache del Mac lette e
mai scritte; prima: `main` a `d0e8692`; dopo: questo branch. Uguali anche
a quelle di TASK-203:

| Caso | Scelto, prima e dopo | Alternative, prima e dopo |
|---|---|---|
| cuore 10 km | `0c9cb198491a0906` (0,883; 8 652 m) | `71f46a1810bc0532` · `ecc51e4b109a0737` |
| cerchio 15 km | `78255caddef6e01e` (0,970; 14 594 m) | `596b462eddebd6d4` · `15ed4e9c6ec49d30` |
| «CIAO» 12 km | `c6a22a5b3aeb0103` (0,835; 11 384 m) | `1212305a33f45982` · `50b0954c4ddc45e7` |
| stella 5 km | `7b54a0cf04b185ae` (0,992; 4 938 m) | `5f113df32363c56d` · `8f800c711720425f` |
| «CIAO» penna alzata 12 km | `d3d24e68de65fbeb` (0,974; 14 777 m) | `5a603e81d9134dfd` · `e1db67986d16843c` |

La canoa, sulle fixture dell'acqua (`plan_paddling`), prima e dopo:
costa cuore 2 km `6f7628cc8ed91f7e`, cerchio 2 km `692bedbb0dc0e5ce`,
stella 3 km `d601df8505be23a0`; lago cuore `1aff621a6cf076da`, cerchio
`239047fc75b4f66b`, stella `6c4fa0766c572559`.

**I test che le tengono**: per la corsa `tests/test_kept_per_graph.py`
(TASK-203: sette richieste senza rete con le impronte di prima, verde
senza modifiche); per la canoa
`test_bike_on_foot.py::test_paddling_routes_are_those_of_before` (le sei
qui sopra, calcolate su `main`); più `test_on_foot_nothing_changes` (sulla
rete a piedi nessun arco `walk`, costi uguali alle lunghezze).

**La zona di Trento con la parte A**, fatta senza rete: le risposte di
Overpass delle strade della bici rimaste nella cache di OSMnx (quelle dei
campioni di TASK-190), più la risposta del secondo filtro nuovo ricostruita
dalla risposta a piedi della stessa area (con tutti i tag) unita a quella
vecchia dei sentieri con `bicycle`. Mancano solo le vie chiuse ai pedoni
senza tag `bicycle`, che `walkable` scarta comunque. La zona vicina passa da
16.569 a 29.383 nodi e da 36.872 a 77.584 archi, di cui 29.215 a piedi;
quella lontana 34.531 nodi e 90.922 archi. Cartella:
`out/task206-cache/` (ignorata). Con le stesse risposte anche la zona più
larga che chiede la ricerca lontana del cerchio da 20 km (35.061 nodi),
e la stessa col codice di prima per il confronto
(`out/task206-cache-old/`).

**I campioni** (2026-10-03), come li fa l'API (`plan_nearby`, tre
partenze vicine) da Piazza Duomo, prima e dopo sulla stessa zona; pagina
`out/task206-bike-samples.html`, a mano in blu. Giudizio proposto
dall'agente, **confermato dall'utente**, in `samples/LOG.md`:

| Forma | Oggi | Con la bici a mano | A mano | Giudizio |
|---|---|---|---|---|
| cuore 10 km | 0,80 · 9,0 km | 0,80 · 8,7 km | 101 m | quasi (come prima) |
| cerchio 10 km | 0,77 · 10,8 km | **0,87** · 9,9 km | 502 m | **sì** (era quasi) |
| stella 10 km | 0,95 · 9,1 km | 0,95 · 10,5 km | 96 m | no (come prima) |
| cuore 20 km | 0,85 · 19,2 km | 0,85 · 20,7 km | 636 m | quasi (come prima) |
| cerchio 20 km | 0,82 · 19,2 km | **0,93** · 18,2 km | 659 m | **sì** (era quasi) |
| stella 20 km | 0,93 · 18,0 km | 0,98 · 18,6 km | 301 m | no (come prima) |

A mano 100–660 m su 10–20 km, meno della stima (0,7–1,1 km su 10): con le
partenze vicine la bici di oggi era già meglio di quella senza (cuore 10
km 0,80 contro 0,70). Le stelle non si leggono né in bici né di corsa a
Trento: non è la rete della bici.

### Parte B — 2026-10-03

Fatta come «Cosa fare» 7–9, più i preferiti (ADR-0167, «Aggiornamento
(parte B)»). In `main` dalla PR #263 (CI 5/5 verde), migrazione `0012`
(la `0011` è di TASK-211 A). Non sul server.

- **Il motore**: `RouteResult.on_foot`, coppie `[da, a]` di indici nei
  punti, compresi tutti e due, una per ogni fila di archi a piedi
  (`network.on_foot_stretches`, dai nodi del percorso: il primo nodo più i
  punti di ogni arco tranne il primo, lo stesso arco che sceglie
  `_edge_points`). In `plan_shape`, nel piano di una partenza vicina e in
  `with_approach`, dove contano anche l'avvicinamento e il ritorno; le
  alternative sono piani come gli altri. Vuoto sulla rete a piedi, su una
  zona della bici di prima e sull'acqua (`paddling.py` non cambia).
- **Il contratto**: `on_foot` facoltativo in `shared-types` (tipo
  `Stretch`), sempre nelle risposte dell'API, controllato come i `walks`
  (lo stesso `walks_problem`, con il nome «stretch on foot») anche quando
  l'app lo rimanda nel `GpxRequest`. Le fixture di prima restano quelle di
  un'API vecchia; `route-result-cycling.json` è un cerchio in bici da 10 km
  con 923 m a mano, e un'alternativa con i suoi.
- **I percorsi tenuti**: `route_store` legge `on_foot` (quelli tenuti
  prima: vuoto); i preferiti lo tengono con la migrazione `0012`
  (`favorite-request-on-foot.json`, `favorite-on-foot.json`), quelli di
  prima vuoto. Le corse salvate no.
- **Il GPX non cambia**: il task file non lo chiedeva, e la bici a mano
  è percorso, senza pause.
- **Non toccato**: le frasi della voce (parte C), il server (vuole l'ok
  dell'utente: «Note per il deploy»; ora c'è anche la migrazione `0012`).
- **I test**, sul Mac, senza rete: motore 1.223 verdi (`-m "not
  network"`; 8 nuovi, 7 in `tests/test_bike_on_foot_result.py`: gli
  indici su un grafo finto, con archi piegati; il cerchio in bici della
  città dei test, ogni pezzo dentro un tratto è di un arco a piedi e ogni
  pezzo fuori di uno in sella; `plan_nearby` con le alternative;
  `with_approach` con l'avvicinamento e il ritorno a piedi; la corsa senza
  tratti). API 837 verdi (14 nuovi: contratto, `route_store`, preferiti
  con la migrazione e quelli di prima). `shared-types` 30 verdi, typecheck
  e Prettier puliti, `ruff` e `black` puliti. Le impronte della corsa
  (`test_kept_per_graph.py`) e della canoa non cambiano: `on_foot` non
  tocca i punti.

