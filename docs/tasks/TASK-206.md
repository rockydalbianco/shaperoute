# TASK-206 — Forme in bici più riconoscibili

**Stato**: In corso (parte A, il motore, fatta: PR da aprire; B e C da
fare; i campioni veri aspettano Overpass o il server)
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

**B. API e contratto**

7. `on_foot` nel risultato (`RouteResult` del motore, `RouteResultBody`,
   `shared-types`, `contract.json`): `[da, a]` indici nei punti, come i
   `walks` della penna alzata, calcolati dai nodi del percorso; anche nelle
   alternative, nelle partenze vicine e nei percorsi tenuti. `API.md`.
8. Le indicazioni a voce: un passo «Walk your bike» all'inizio di un
   tratto e «Ride on» alla fine (`directions.py`), testi da far approvare
   all'utente.
9. Sul server: rifare la zona della bici di Trento dall'estratto e
   `draw_examples`, in un aggiornamento solo, con l'ok dell'utente.

**C. App**

10. I tratti a mano sulla mappa, in un altro stile (`src/theme/tokens.ts`),
    e i metri a mano nella scheda del percorso; la voce che li annuncia;
    testi da far approvare all'utente.

## Criteri di accettazione

- [x] Dalla CLI e nei test, senza rete: un percorso `cycling` può portare
      la bici a mano su marciapiedi, sentieri e nell'altro senso di un
      senso unico, mai su scale, mai su vie chiuse ai pedoni.
- [x] Un metro a piedi costa sei metri in sella; i controlli e l'avviso
      dicono quanti metri a piedi.
- [x] La corsa e la canoa non cambiano: la suite del motore e dell'API
      verde con i valori di prima.
- [ ] Campioni in bici a Trento (e Levico, Padova) rifatti con la parte A,
      giudicati dall'utente: quando Overpass riapre per il Mac, o dal
      server dopo l'aggiornamento.
- [ ] Nell'app i tratti a mano si vedono e la voce li annuncia (parte C).
- [ ] Test deterministici per motore, API e app.

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
```

Rispetto all'elenco mandato al coordinatore: `models.py` e `optimizer.py`
non servono in A (`on_foot` nel risultato è della parte B, perché
`test_contract.py` vuole gli stessi campi nel motore e nell'API);
`nearby_starts.py` e `pen_up.py` sì (`step_cost` nel ritorno e fra le
lettere); i due test dell'API dicevano che la bici non passa mai dal
marciapiede né contromano.

## Fuori scope

- Le gallerie stradali in bici (fino a 1 km nei campioni di TASK-190): un
  seguito.
- Lo sterrato, la bici da corsa contro la mountain bike (TASK-190).
- Le stelle: con i tratti a mano non migliorano a Trento.

## Esito

### Parte A — 2026-10-03

Fatta come «Cosa fare» 1–6 (ADR-0167). Motore 1.205 test verdi (`-m "not
network"`, 27 nuovi in `tests/test_bike_on_foot.py`); in
`tests/test_bike_network.py` quattro test dicono ora «in sella» dove
dicevano «mai». Nella città dei test il cerchio in bici da 10 km porta la
bici a mano per un isolato, 300 m. API: i due test della bici che
vietavano marciapiede e contromano ora li ammettono a piedi, con l'avviso.

**Non verificato**: una zona vera fatta con la parte A. Overpass rifiuta
il Mac dalle 09:15Z (dopo i download dei campioni di TASK-190) e la zona
di Trento sul server è di prima; i numeri della tabella sopra vengono dalla
stima con la zona a piedi.
