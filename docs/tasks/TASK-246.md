# TASK-246 — Le figure «Paddle» dei posti vicini già sul telefono

**Stato**: Done — in `main` dalla #369 (`2fcf6b5`, 2026-10-05); figure dei tre posti più vicini già sul telefono, prova sull'iPhone dell'utente dopo la pubblicazione
**Parte B**: In lavorazione — il server tiene le figure dei laghi e delle spiagge (sotto, «Parte B»)
**Fase**: 4 · **Branch**: `feat/TASK-246-paddle-shapes-ahead`
**Dipende da**: TASK-214 (le mappe della zona al primo avvio, ADR-0177),
TASK-227 e TASK-233 (gli esempi sull'acqua di «Explore»)

## Obiettivo

Chi apre «Explore» con «Paddle» trova **subito** le figure dei posti più
vicini, senza aspettare che il server le disegni. Chiesto dall'utente il
2026-10-05: «Quando scarichi l'app, devi scaricare anche un po' di mappe
vicino a me e un po' di figure per il padel, così sono già caricate sul
dispositivo dell'utente».

## Cosa c'era già

- **Le mappe vicino a sé**: al primo avvio il telefono scarica la zona
  intorno, a piedi e in bici, e poi piano piano quelle dei paesi vicini
  (TASK-214, parti B e B2). Non cambia.
- **Le figure in canoa**: dentro l'app solo quelle dei quattro luoghi
  scelti a mano (TASK-227). Quelle di ogni altro lago le disegnava il
  server quando si apriva «Explore» con «Paddle», una alla volta.

Lo **sfondo della mappa** (l'immagine, i tasselli di MapLibre) non si
scarica prima: detto all'utente, che non l'ha chiesto. Sarebbe un task
a parte.

## Scelte dell'utente (2026-10-05)

- **I tre posti più vicini, sempre**: le otto forme dei tre posti più
  vicini entro 30 km, con qualunque sport di «Settings», anche con i dati
  mobili. Proposte anche: solo con «Paddle» in «Settings»; solo il posto
  più vicino.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0211
- `docs/UI.md` «Sull'acqua: «Paddle»», «Explore»
- `apps/mobile/src/explore/exampleRoutes.ts` (`fromFile`, `ExampleSet`)
- `apps/mobile/src/paddle/waterSpots.ts` (solo letto)
- `apps/mobile/src/engine/usePhoneZones.ts`

## Cosa fare

1. `src/paddle/aheadExamples.ts`: `drawShapesAhead(apiUrl, here)` chiede
   all'API, una dopo l'altra, le forme che mancano dei tre posti più
   vicini e le salva.
2. `src/paddle/aheadStore.ts`: il file del telefono,
   `Documents/paddle-ahead.json`, separato da quello della pagina.
3. `exampleRoutes.ts`: `fromFile` legge anche quel file, per la canoa.
4. `usePhoneZones.ts`: il giro parte dopo le mappe della zona, quando il
   server risponde.

## Criteri di accettazione

- [x] A ogni apertura, dopo le mappe della zona, il telefono chiede le
      otto forme dei tre posti più vicini entro 30 km, dal più vicino, con
      la distanza del posto (2 km, meno su un lago piccolo).
- [x] «Explore» con «Paddle» mostra quelle forme senza chiedere niente
      all'API (test con la pagina vera degli esempi).
- [x] Un'apertura dopo non chiede niente; un posto le cui forme vengono
      con l'app non costa niente; una forma già tenuta dalla pagina non si
      richiede.
- [x] Una forma che l'API non riesce a disegnare lì non si richiede per
      una settimana; senza rete il giro si ferma e riprende all'apertura
      dopo; un posto senza acqua sul server si salta.
- [x] Al massimo una richiesta ogni 6 secondi.
- [x] Con l'app in secondo piano non parte nessuna richiesta: il giro
      aspetta che l'app torni davanti.
- [x] Senza risposta del server alle mappe della zona il giro non parte.
- [x] Typecheck, lint, prettier e tutti i test dell'app verdi.
- [x] Il giro vero contro un'API vera con l'acqua dei laghi, sul Mac: le
      otto forme del Lago di Levico arrivano e restano nel file (vedi
      «Esito»).

## File toccati

```
apps/mobile/src/paddle/aheadExamples.ts        (nuovo)
apps/mobile/src/paddle/aheadExamples.test.ts   (nuovo)
apps/mobile/src/paddle/aheadStore.ts           (nuovo)
apps/mobile/src/explore/exampleRoutes.ts       (righe: fromFile, due export)
apps/mobile/src/engine/usePhoneZones.ts        (righe: il giro dopo le zone)
apps/mobile/src/engine/usePhoneZones.test.ts
docs/tasks/TASK-246.md
docs/STATUS.md
docs/DECISIONS.md
docs/UI.md
```

## Fuori scope

- Lo sfondo della mappa scaricato prima.
- Le figure tenute **dal server**: vedi «Seguiti».
- Gli esempi della corsa della propria città scaricati prima (era nella
  scelta 4 di TASK-214, mai fatto: «Explore» li chiede quando si apre).
- Un avviso o una riga in «Settings» per queste figure.

## Seguiti

- **Il server non tiene le figure dei laghi** (è la parte B, sotto).
  `route_store.py` tiene solo
  i percorsi dai centri delle città: ogni telefono nuovo fa disegnare al
  server fino a 24 figure (tre posti, otto forme), anche se un altro
  telefono le ha già chieste dallo stesso punto. Con pochi telefoni non è
  un problema; prima di una pubblicazione larga conviene che il server le
  tenga come tiene quelle delle città (i punti di `lakes.json` e delle
  spiagge fra i centri di `route_store`, e un giro di `draw_examples`
  sui laghi). È codice dell'API e un aggiornamento del server: un task
  suo, da chiedere all'utente.
- Sul Mac una figura da 2 km sull'acqua esce in meno di mezzo secondo
  (misurato qui): sul server, tre-cinque volte più lento, le 24 figure di
  un telefono nuovo sono circa un minuto di motore, sparso su due minuti e
  mezzo. Per questo il seguito sopra non è urgente.

## Esito

Fatto nel codice dell'app, con i test. Le figure dei tre posti più vicini
si scaricano da sole dopo le mappe della zona e «Explore» con «Paddle» le
mostra subito.

**Provato dal vero sul Mac** (2026-10-05): `drawShapesAhead` contro un'API
locale di questo branch con l'acqua dei laghi d'Italia, da Levico Terme. I
tre posti: Lago di Levico, Lago di Caldonazzo, Lago della Serraia (1 km).
Le otto forme del Lago di Levico: tutte disegnate, una ogni 6 secondi,
mezzo secondo l'una; testa di cane e testa di coniglio con i tre tratti a
penna alzata; il file pesa 47 kB per un posto, quindi circa 150 kB per
tre.

**In `main`** dalla #369 (`2fcf6b5`), con le spiagge di TASK-245 fra i
«tre posti» (test con Alassio) e il giro fermo mentre l'app è in secondo
piano (paletto del coordinatore). La pubblica il coordinatore.

**Non visto** sullo schermo, né nel simulatore né sull'iPhone: la prova è
dell'utente dopo la pubblicazione (aprire l'app, aspettare tre minuti, poi
«Explore» con «Paddle»: le otto forme del lago vicino devono esserci senza
«Drawing…», e così i due posti dopo). Nessun cambiamento al server.

## Parte B — Il server tiene le figure dei laghi e delle spiagge

**Stato**: In lavorazione · **Branch**: `feat/TASK-246-b-water-shapes-kept`
· aggiunta ad ADR-0211 · via del coordinatore il 2026-10-09, dopo il #440
(TASK-203 B) e il suo `draw_examples`. Il merge lo allinea il coordinatore
con TASK-245 C (le spiagge nuove), così server e `draw_examples` si fanno
una volta sola.

### Obiettivo

Il seguito sopra: l'API tiene le figure «Paddle» chieste dai punti di
`lakes.json` e `beaches.json` come tiene quelle dal centro di una città
(ADR-0136), e `draw_examples` le può disegnare prima. Un telefono nuovo
dove un altro ha già chiesto non fa lavorare il motore.

### Cosa fare

1. `water_spots.py` (nuovo): i punti delle due liste dell'app.
2. `route_store.py`: i punti sull'acqua come centri dati all'avvio, in
   `routes/water/` con un limite loro.
3. `__main__.py`: il `RouteStore` con i punti; una riga all'avvio.
4. `draw_examples.py`: `--water` e `--water-name`, le otto forme di ogni
   punto come le chiede il telefono.
5. `Dockerfile` e `.dockerignore`: i due file delle liste nell'immagine.
6. L'app: niente, se le stesse richieste tornano più in fretta
   (controllato: `aheadExamples.ts` chiede dal punto stesso).

### Criteri di accettazione

- [x] La stessa richiesta dallo stesso punto delle liste torna `done`
      nella risposta al `POST`, anche dopo un riavvio dell'API; da 10 m
      più in là, o con la forma spostata (`near`), non si tiene.
- [x] I percorsi sull'acqua non spingono fuori gli esempi delle città.
- [x] `draw_examples --water` chiede le otto forme nell'ordine dell'app,
      con la penna alzata per le forme a pezzi, e salta un punto senza
      acqua alla prima forma; `--water-name` sceglie i punti per nome.
- [x] Test deterministici senza rete; tutti i test dell'API verdi.
- [x] Misurato sul Mac: le 24 forme di un telefono nuovo prima e dopo; il
      giro di tutti i punti stimato per il server.
- [ ] Server aggiornato e `draw_examples --water` lanciato: del
      coordinatore, con l'ok dell'utente.

### File toccati (parte B)

```
services/api/shaperoute_api/water_spots.py      (nuovo)
services/api/shaperoute_api/route_store.py
services/api/shaperoute_api/__main__.py         (righe: RouteStore, avvio)
services/api/shaperoute_api/draw_examples.py
services/api/tests/test_water_spots.py          (nuovo)
services/api/tests/test_route_store.py
services/api/tests/test_draw_examples.py
Dockerfile                                      (una COPY)
.dockerignore                                   (due righe)
docs/API.md
docs/tasks/TASK-246.md
docs/STATUS.md
docs/DECISIONS.md
```

### Esito parte B

ESITO-DA-SCRIVERE
