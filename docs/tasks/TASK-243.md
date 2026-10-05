# TASK-243 — La penna si alza anche sulle deviazioni del contorno

**Stato**: Done
**Fase**: 2 · **Branch**: `feat/TASK-243-outline-detours`

## Obiettivo

Con la penna alzata, anche il contorno di una forma a pezzi si disegna
senza le sue lunghe deviazioni: si camminano, come quelle dei pezzi
(TASK-242), e i baffi che tornano al nodo da cui partono si tagliano.

## Contesto

L'utente, il 2026-10-05, subito dopo il «sì» ai campioni di TASK-242:
«alza la penna anche sulle deviazioni del contorno». In ADR-0208 (punto 5)
il contorno era rimasto fuori apposta, come scelta dell'utente: ora è
presa. Numeri dal coordinatore: TASK-243, ADR-0209.

**A quali forme si applica** (da dire anche all'utente): solo alle forme a
pezzi chieste con la penna alzata, cioè `PEN_UP_SHAPES` (`smiley`,
`ghost`, `donut`, `sun` e le cinque con `lift`: `cat`, `fish`, `dog_head`,
`rabbit_head`, `pumpkin`). Cuore, cerchio e le altre forme senza pezzi non
si possono chiedere con `pen_up` (`models.PEN_UP_WITHOUT_PIECES`): per
loro, per le parole, per l'acqua e per ogni richiesta **senza** `pen_up`
non cambia niente. Da verificare leggendo `RouteRequest`, non da dare per
buono.

## Contesto da leggere

- `docs/tasks/TASK-242.md` (Esito) e ADR-0208 in `docs/DECISIONS.md`
- `docs/ROUTE_ENGINE.md` §5 «La penna alzata», «Le deviazioni di un pezzo»
- `services/route-engine/route_engine/detours.py`, `pen_up.py` (`trace`,
  `_lifted`, `LiftedRoute`, `sized_m`), `tests/test_detours.py`

## Da dove si parte (scritto alla fine di TASK-242)

- **Il punto da cambiare** è `pen_up._lifted`: oggi salta il pezzo 0 (il
  contorno) con `if k > 0`. `detours.strays` / `loops` / `parts` fanno già
  il resto, e `lifted_m` tiene ferma la distanza che la ricerca insegue.
- **La partenza**: il percorso deve cominciare al nodo della partenza
  (`pen_up.check_begins`, `points[0]`). Per il contorno la testa non si
  può lasciare fuori: `begin` resta 0 anche se è un anello (per i pezzi
  chiusi `strays(closed=True)` taglia testa e coda insieme: per il
  contorno no). La coda sì: il contorno può finire prima, e da lì parte il
  tratto a piedi verso il primo pezzo.
- **Quante deviazioni ha un contorno**: nella faccina da 15 km a Trento
  (variante A, `LIFT_NEAR` 58 m, `LIFT_FAR` 174 m) il contorno ha nove
  tratti fuori dalla linea più lunghi di 100 m; quattro superano
  `LIFT_FAR` (profondi 227, 210, 197 e 187 m; lunghi 569, 489, 321 e
  303 m). Con la soglia dei pezzi sarebbero 4 tratti a piedi in più: 8 in
  tutto, sotto `MAX_WALKS` = 9, ma un bordo con quattro buchi. **La scelta
  tecnica vera è qui**: soglia propria del contorno, tetto ai tratti sul
  contorno, o solo i baffi. Va decisa sui campioni, non a tavolino.
- **I baffi** (andata e ritorno che torna allo stesso nodo,
  `detours.loops`) si tagliano senza tratti a piedi: è il guadagno più
  sicuro, e nelle immagini di TASK-242 il contorno ne aveva due o tre.
  `snap_to_network` ne toglie già una parte (`prune_spurs`,
  `prune_parallel_spurs`, con i nodi degli angoli tenuti): un baffo verso
  un **angolo** della forma disegna l'angolo e non va tagliato. Il
  contorno può avere **tratti ripassati** (i baffi del gatto, i raggi con
  la penna giù): sono sulla linea, ma vanno provati.
- **Il tetto**: `detours.MAX_WALKS` = 9 vale per contorno e pezzi insieme,
  le deviazioni più profonde per prime. Il sole ha già 8 tratti fra i
  pezzi: gliene resta uno.
- **Non toccare** `network.py` (sta nell'impronta del motore sull'acqua:
  il test di `paddleExamples.json` diventa rosso), né `optimizer.py` e
  `models.py` (TASK-232 A): se servono, fermarsi e scrivere al
  coordinatore.
- **Strumenti** (fuori dal repository, in `out/task-243/` del checkout
  principale): `compare.py` (42 richieste da una partenza sola,
  deterministico: `MODE=before` con il `PYTHONPATH` del checkout
  principale, `MODE=after` con quello del worktree; una riga JSON e un PNG
  per caso), `api_like.py` (il pianificatore dell'API con le varianti
  A/B/C), `where_off_line.py` (le deviazioni trovate su ogni pezzo del
  percorso scelto). Vanno adattati: sono script di prova.
  **Non lanciare i confronti insieme ad altri lavori pesanti**: il
  pianificatore con le partenze vicine ha tempi massimi, e a Mac carico
  sceglie percorsi diversi (in TASK-242 sembrava un rallentamento del
  codice, era il carico).
- **La richiesta dello screenshot**: `smiley`, 15 km, penna alzata, da
  46.0664, 11.1258 (Trento centro). Le altre partenze usate: Trento
  46.0679, 11.1211; Levico 46.0122, 11.2986; Milano 45.4642, 9.19.

## Cosa fare

1. Decidere sui campioni come si alza la penna sul contorno (vedi sopra:
   soglia, tetto, baffi) e scriverlo in ADR-0209 con le misure.
2. `pen_up._lifted` e, se serve, `detours.py`: il contorno senza le sue
   deviazioni, la partenza ferma.
3. Test deterministici nuovi (la città di prova di `test_detours.py` ha
   già una ferrovia: il contorno la attraversa solo più in là).
4. Rifare `engine.zip`; controllare che l'impronta dell'acqua non cambi.
5. Campioni prima/dopo in `samples/` (la faccina dello screenshot, almeno
   tre città, una forma senza deviazioni che resta identica), con quanto
   del contorno resta disegnato e i km disegnati.
6. **Il giudizio dell'utente sulle immagini prima del merge.**

## Criteri di accettazione

- [x] Un contorno con una lunga deviazione si disegna senza, con un tratto
      a piedi; la partenza resta il primo punto del percorso. *(Solo se la
      deviazione è un baffo: ADR-0209. Le altre restano disegnate.)*
- [x] Un baffo del contorno che torna al suo nodo si taglia senza tratti a
      piedi; un baffo verso un angolo della forma resta.
- [x] Mai più di `MAX_WALKS` tratti a piedi, contorno e pezzi insieme.
- [x] Forme senza pezzi, parole, acqua e ogni richiesta senza `pen_up`:
      stesso percorso di `main`, punto per punto.
- [x] Un confronto su più forme e città scritto in `ROUTE_ENGINE.md`:
      quante richieste cambiano, in meglio o in peggio.
- [x] Test del motore e dell'API verdi; `engine.zip` rifatto.
- [x] Il giudizio dell'utente sui campioni.

## File toccati

```
services/route-engine/route_engine/detours.py
services/route-engine/route_engine/pen_up.py
services/route-engine/tests/test_detours.py          (o un file nuovo)
apps/mobile/assets/engine/engine.zip
samples/TASK-243_*.gpx                               (nuovi)
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-243.md
```

## Fuori scope

- Le forme senza pezzi (cuore, cerchio, …) e le parole: la penna alzata
  per loro è un'altra richiesta.
- L'acqua (TASK-226) e l'inclinazione (TASK-232).
- `schemas.py` e `models.py`: descrivono ancora i `walks` come «uno in
  meno dei pezzi» (seguito di TASK-242, di chi li ha in mano).
- Il server, `draw_examples` e la pubblicazione: del coordinatore, con
  l'ok dell'utente.

## Esito

Fatto (PR #362, 2026-10-05). Con la penna alzata il contorno di una forma
a pezzi non disegna più i suoi baffi: diventano tratti a piedi, al più
due. Su 42 richieste di prova 26 restano identiche, 14 cambiano (10 con
lo stesso disegno e la somiglianza più alta; in 4 la ricerca sceglie un
altro disegno, e in 2 la somiglianza scende), una diventa disponibile. La
faccina dello screenshot tiene il suo disegno e perde un baffo: 0,79 →
0,80. Giudicato dall'utente sulle otto immagini prima/dopo: «continua va
bene».

Gli strumenti dei confronti sono in `out/task-243/` del checkout
principale, fuori dal repository (`explore.py`, `run3.sh`, `table.py`,
`pairs.py`, `attempts.py`, `cli_pair.sh`, `gpx_pair.py`).

La regola scelta (ADR-0209): sul contorno si camminano solo i **baffi**,
le deviazioni che rientrano vicino a dove escono; le altre restano
disegnate. Applicare al contorno la regola dei pezzi, com'era scritto in
«Da dove si parte», lo riempiva di buchi e spostava la ricerca su disegni
peggiori.

Emerso:

- quasi nessun baffo torna allo stesso nodo (`snap_to_network` li toglie
  già): il guadagno vero sono i baffi che rientrano a pochi metri, e
  vogliono un tratto a piedi;
- la somiglianza premia ogni buco nel contorno: non basta per scegliere
  la regola, vanno guardate le immagini e i tentativi della ricerca
  (`out/task-243/attempts.py`);
- il buco di un baffo va misurato **lungo la linea** del contorno, non in
  linea d'aria: la prima versione prendeva per baffi tratti di contorno
  di chilometri (ADR-0209, alternative scartate);
- a metà task è entrato in `main` TASK-232 (forme inclinate): misure e
  campioni sono rifatti su quella base (c2bb428);
- cambiando ciò che la ricerca misura, in 4 richieste su 42 sceglie un
  altro disegno, e in 2 la somiglianza scende (il costo conta anche
  distanza e inclinazione).

Rimandato:

- **`schemas.py` e `models.py`** descrivono ancora i `walks` come «uno in
  meno dei pezzi» (come dopo TASK-242).
- **Server e `draw_examples`**: del coordinatore, con l'ok dell'utente.
- **La prova sull'iPhone** di un tratto a piedi a metà del contorno.
