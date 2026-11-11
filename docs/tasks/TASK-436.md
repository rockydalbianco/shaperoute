# TASK-436 — Le due tabelle del grafo fatte a blocchi

**Stato**: Done — in `main` con la #1106 (`4dfeca6d`, 2026-11-11)
**Fase**: 5 · **Branch**: `feat/TASK-436-graph-tables` · **ADR**: 0362

## Obiettivo

Le due tabelle che il motore calcola una volta per grafo (i tre punti di
ogni arco, i punti di ogni strada per la maschera) si fanno con una
chiamata a shapely su tutti gli archi insieme invece di una per arco, e
danno gli stessi identici numeri di prima: stessi percorsi, meno tempo.

## Contesto da leggere

- `docs/tasks/TASK-434.md`, proposte 1 e 7: i numeri del profilo e il
  prototipo (`out/TASK-434/prototype_tables.py` nel checkout principale).
- `grep -n "ADR-0320" docs/DECISIONS.md docs/archive/*.md`: la prova dei
  percorsi identici (`SAME_ROUTES_AS`, `test_same_routes.py`).

## Cosa fare

1. `network._work_out_samples`: capo, punto di mezzo e altro capo di ogni
   arco con `shapely.get_coordinates(..., return_index=True)` su tutte le
   geometrie insieme. `_edge_coords` resta: la usano altri.
2. `optimizer.RoadMask.__init__`: i punti di ogni strada allo stesso modo,
   con `NoRoadsError` per un grafo senza strade.
3. `optimizer.search`: `perimeter(shape)` una volta, fuori da `road_fit`.
4. Test deterministici: su grafi piccoli fatti a mano le tabelle nuove sono
   uguali con `np.array_equal` a quelle calcolate nel modo di prima, tenuto
   nel test come riferimento.
5. Prova dei percorsi identici (`test_same_routes`), righe in coda a
   `SAME_ROUTES_AS`, `engine.zip` rifatto nell'ultimo commit.
6. Tempi prima e dopo sul banco di TASK-434, scritti qui sotto.

## Criteri di accettazione

- [x] Le tabelle nuove sono uguali bit per bit a quelle di prima sui grafi
      dei test (archi con e senza geometria, geometria scritta al
      contrario, archi paralleli, cappio, grafo senza archi) e sui 10 grafi
      del banco.
- [x] `test_same_routes`: le 9 rotte hanno gli stessi hash di prima; le
      impronte efficaci (`engine_fingerprint`) non cambiano.
- [x] `engine.zip` corrisponde ai sorgenti (`test_phone_engine`).
- [x] CI verde.
- [x] I secondi prima e dopo sono scritti in «Tempi».

## File toccati

```
services/route-engine/route_engine/network.py
services/route-engine/route_engine/optimizer.py
services/route-engine/tests/test_graph_tables.py        (nuovo)
services/api/shaperoute_api/route_store.py              (solo righe in coda a SAME_ROUTES_AS)
services/api/tests/fixtures/same_routes/*.json          (prove nuove)
apps/mobile/assets/engine/engine.zip
docs/tasks/TASK-436.md
```

Lista approvata dal Coordinatore il 2026-11-10. Le righe di `STATUS.md`,
`DECISIONS.md` (ADR-0362) e `INDEX.md` vanno in una PR di soli documenti
dopo il merge.

## Fuori scope

- Le altre proposte di TASK-434: figli già avviati, `fork`, garbage
  collector, indicazioni, `fit_xy` a blocchi.
- Qualsiasi cambiamento ai percorsi: se una tabella non esce identica ci si
  ferma e lo si segnala.
- Comandi sul server: il passo lo compone il Coordinatore, col sì
  dell'utente.

## Come è fatto

- `network._work_out_samples`: un giro sugli archi raccoglie le righe dei
  due nodi e le geometrie; `shapely.get_coordinates(..., return_index=True)`
  legge tutte le geometrie insieme; il verso di ogni geometria, il punto di
  mezzo e i due capi escono da indici numpy. Quale capo viene prima lo
  diceva `math.dist`, che arrotonda a modo suo: dove le due distanze sono
  uguali entro 1e-9 (i cappi, di fatto) decide ancora `math.dist`, arco per
  arco, così la tabella è quella di prima per costruzione e non solo sui
  grafi misurati. Un test (`test_near_ties_need_the_engines_own_distance`)
  mostra che la sola radice di numpy su quei casi girerebbe qualche arco
  dall'altra parte.
- `optimizer._road_points` (nuova) + `RoadMask.__init__`: la stessa lettura
  a blocchi; l'array dei punti è lo stesso di prima, nello stesso ordine, e
  tutto il conto che segue non è cambiato.
- `optimizer.search`: `shape_perimeter = perimeter(shape)` una volta; il
  prodotto `band_share * shape_perimeter * scale` è nello stesso ordine.

## Prove che i percorsi sono gli stessi

- `tests/test_graph_tables.py` (27 test): tabelle uguali con
  `np.array_equal` al codice di prima, tenuto nel test, su grafi a mano
  (senza geometria, con geometria di 2–5 punti, scritta al contrario, archi
  paralleli, cappi, nodi a gradi interi, 600 quasi-pareggi, geometria di un
  punto, grafo senza archi → `NoRoadsError`) e sul grafo di Levico.
- I 10 grafi del banco (Trento, ~31.000 archi): motore di prima =
  prototipo e motore nuovo = prototipo, bit per bit
  (`out/TASK-436/tables-{before,after}.jsonl`).
- `test_same_routes`: i 9 hash di `ca29e58777cb.json` (motore nuovo, Mac)
  sono quelli di `b4967ef32e9a.json`, la prova di `main` dopo TASK-435 A
  (#1105, entrata prima: la prova è stata rifatta dopo aver unito `main`;
  prima dell'unione il motore era `7375da81cabc`, con gli stessi 9 hash di
  `2bca806f467b.json`). Tre righe in coda a
  `SAME_ROUTES_AS`: le impronte efficaci restano `8ab61d8e87f9` (percorsi),
  `b9d00c37d28d` (nuotate), `574fbfba41eb` (esempi di canoa). Sul server
  quindi niente cambia per i percorsi tenuti, le zone e gli esempi: nessun
  `draw_examples`, nessun ridisegno.
- Le 7 ricerche di `test_first_placement` (anche la parola «ciao»): stesso
  digest prima e dopo sul Mac (`out/TASK-436/digests-*.txt`).
- Il banco: stesso `start_route`, somiglianza, distanza, alternative e
  partenza scelta in tutti i giri, prima e dopo.

## Tempi

Banco di TASK-434 (`profile_main.py`, `profile_children.py`,
`prototype_tables.py`), Mac, zona foot di Trento in memoria, 2026-11-10.
Script, uscite e riepiloghi in `out/TASK-436/` del checkout principale
(`bench.sh`, `bench2.sh`, `SUMMARY.txt`, `SUMMARY2.txt`).

Le due tabelle da sole (meglio di 3, media dei 10 grafi):

| | prima | dopo |
|---|---|---|
| `_work_out_samples` | 0,123 s | 0,017 s |
| `RoadMask.__init__` | 0,094 s | 0,025 s |
| `perimeter` in `road_fit`, a ricerca | 0,034 s | 0,000 s |

La richiesta intera (`plan_request` + indicazioni + JSON), prima e dopo
alternati per tre giri con lo stesso carico (4,1–5,1); mediana dei tre giri
per caso, media dei casi:

| | prima | dopo | |
|---|---|---|---|
| 5 km (9 percorsi), tempo | 1,725 s | 1,509 s | −0,22 s, −12,5% |
| 5 km, ricerca della partenza | 1,152 s | 0,899 s | −0,25 s |
| 5 km, CPU processo + figli | 4,00 s | 3,40 s | −0,60 s, −15% |
| cuore 10 km, tempo | 3,129 s | 3,116 s | −0,4% |
| cuore 10 km, CPU processo + figli | 7,93 s | 7,59 s | −0,35 s, −4,4% |

Un figlio di una partenza vicina, uno alla volta (`children-*.jsonl`):
ricerca 0,661 → 0,450 s sui 5 km (−0,21 s), 1,689 → 1,504 s sui 10 km.

Note oneste: il Mac oggi era più carico che nella misura di TASK-434 (lì
1,46 s per i 5 km, qui 1,72 s prima del cambio); il primo giro non
alternato (`SUMMARY.txt`) aveva il carico quasi doppio nel «dopo» e non
dice niente sul tempo intero, per questo c'è il secondo. Sul cuore da
10 km il tempo intero non scende: lì si aspettano i figli, che guadagnano
0,2 s su 1,7. Sul server (circa 5,6 volte più lento) non è misurato: la
stima di TASK-434 resta una stima.

## Esito

Le due tabelle del grafo si fanno a blocchi (7 e 4 volte più in fretta) e
`perimeter` una volta a ricerca: un percorso da 5 km sul Mac passa da 1,72
a 1,51 s e usa il 15% di CPU in meno, con gli stessi identici percorsi
(impronte efficaci invariate). In `main` dall'11 novembre 2026 con la
#1106 (`4dfeca6d`, merge dell'utente, CI verde), dopo TASK-435 A (#1105).

Resta, non di questo task: il passo sul server (passo 8 del Coordinatore,
col sì dell'utente) e l'OTA che porta `engine.zip` sul telefono. Sul server
i tempi non sono misurati: se serve un «dopo», le righe `job_times` del
log delle richieste prima e dopo il passo 8. Le altre proposte di TASK-434
restano da costruire.
