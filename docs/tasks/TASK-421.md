# TASK-421 — I percorsi a piedi non passano per i cancelli chiusi

**Stato**: Done — motore in `main` (#973, 2026-11-08), documenti #1009 e
la PR di chiusura; le 53 zone foot di «Explore» rifatte sul server il
2026-11-10, le vecchie all'ombra da parte (`DEPLOY.md` F.15)
**Fase**: 5 · **Branch**: `feat/TASK-421-foot-barriers` · **ADR**: ADR-0349 ·
numeri dal Coordinatore (2026-11-08) · sessione «Foot routes barrier
filtering», avviata dall'utente

## Obiettivo

Un percorso di corsa o camminata non passa più per una strada chiusa da un
cancello chiuso, privato o bloccato, né per una via `access=no`: oggi la
rete `foot` li tiene, perché il filtro Overpass vede solo le vie e la
semplificazione di OSMnx butta i tag dei nodi.

## Contesto da leggere

- `docs/MAPS.md` «Sorgente» e «I cancelli chiusi»; `docs/DEPLOY.md` F.15.
- `docs/DECISIONS.md` ADR-0349; ADR-0324 (`skate_ways`), ADR-0343 punto 2.
- `services/route-engine/route_engine/networks/roller.py` (il precedente).

Cosa è successo: il 2026-11-08, correndo, l'utente ha trovato alcune strade
del percorso chiuse da un cancello.

## Cosa fare

1. Misurare su 2–3 zone in cache quanti nodi e km toglie la regola, prima di
   cambiare il motore (fatto, sotto).
2. `networks/foot.py`: download senza semplificare con i tag dei nodi
   (`barrier`, `access`, `foot`, `locked`) e `foot` sulle vie; `foot_ways`
   toglie i nodi che bloccano (`blocks_foot`) e le vie chiuse
   (`closed_to_foot`), poi semplifica come OSMnx. La lista esatta in
   ADR-0349. `networks/base.py`: `node_tags`, come `way_tags`.
3. Test deterministici con un paese finto: un cancello chiuso, uno aperto,
   uno pedonale, uno bloccato, una recinzione, un dissuasore; vie
   `access=no`, `access=no foot=yes`, `foot=private`, `access=destination`.
   Il percorso evita solo quelli chiusi.
4. Il banco di corsa prima/dopo su Trento, Levico, Milano (sotto).
5. L'impronta del motore: `ROUTES` nuovo in `test_walk_fingerprint.py`;
   nuotate e canoa con la prova delle stesse rotte; `engine.zip` rifatto.
6. Il piano per rifare le zone in cache: `MAPS.md` «I cancelli chiusi» e
   `DEPLOY.md` F.15. **Sì dell'utente il 2026-11-08** («Sì, dopo il
   merge»): le zone foot del server si rifanno dopo il merge della #973 e
   il server aggiornato, coi passi di F.15 dati all'utente come one-liner
   ssh, uno per volta. Il sì per il server e `draw_examples` lo chiede il
   Coordinatore.

## Misure (2026-11-08)

Dalle risposte Overpass in `data/cache/http/` sul Mac, senza rete: la rete
foot ricostruita senza semplificare, con i tag dei nodi, prima e dopo la
regola (`out/TASK-421/` sul Mac).

| Zona | nodi `barrier` | tolti | km di vie chiuse | km di rete prima → dopo | pezzi |
|---|---|---|---|---|---|
| Levico, 9 km | 126 | 26 (21 %) | 2,1 | 628,9 → 626,1 | 43 → 46 |
| Trento, 9 km | 1.871 | 122 (6,5 %) | 7,0 | 841,8 → 832,0 | 231 → 266 |
| Trento, 17 km (zona del banco) | 2.279 | 156 (6,8 %) | 10,6 | 1.238,8 → 1.224,1 | 311 → 363 |
| Milano, 17 km | 28.462 | 123 (0,4 %) | 46,0 | 3.224,8 → 3.176,7 | 514 → 558 |
| Parigi, 9 km | 11.755 | 132 (1,1 %) | 14,7 | 1.391,6 → 1.375,4 | 993 → 1.019 |

Cosa si toglie, Trento 9 km: 60 `gate`+`access=private`, 26
`gate`+`access=no`, 8 `gate`+`foot=no`, 8 `locked=yes`, 7
`lift_gate`+`access=private`, 1 `fence`. Cosa resta: 627 `gate` e 220
`lift_gate` senza tag, 593 `kerb`, 89 `bollard`, 47 `cycle_barrier`, 27
`gate`+`foot=yes`, 10 `gate`+`access=yes`, 7 `access=customers`, 7
`access=destination`. Le vie: quasi tutte `service` e `track` con
`access=no` senza `foot` (Milano 38,6 km di `service`). Cancelli nudi su vie
`access=destination`: 4 a Trento, 9 a Milano (non si eredita l'`access`).
Rovereto non è in cache sul Mac (solo sul server): al suo posto Trento e
Levico.

**Il banco** (`tools/sport_bench`, corsa, 8 forme × 3/5/10 km, la rete
ricostruita dalla stessa risposta con e senza la regola):

| Zona | somiglianza mediana | buoni (≥ 0,90) | riusciti (≥ 0,60) | tempo mediano |
|---|---|---|---|---|
| Trento | 0,91 → 0,90 | 13 → 13 su 24 | 24 → 24 | 1,1 → 1,2 s |
| Levico | 0,84 → 0,80 | 6 → 7 su 24 | 22 → 22 | 0,5 → 0,6 s |
| Milano | 0,96 → 0,96 | 20 → 20 su 24 | 24 → 24 | 1,7 → 1,4 s |

A Levico la partenza del banco è al Lido: entro 550 m ci sono otto cancelli
`access=private` o `locked=yes` sui vialetti del lido e del parco, che
prima il motore attraversava (cuore da 5 km 0,92 → 0,81, stella da 3 km
0,86 → 0,72): è il caso del task, non un difetto. Tempi uguali.

## La sequenza sul server (2026-11-10)

Sì dell'utente: «Sì, ok server» (sessione del Coordinatore) e «Sì, dopo il
merge» (questa sessione), 2026-11-08; «no fallo tu» il 2026-11-10: i passi
sul server li ha eseguiti il Coordinatore, non più one-liner all'utente.
Il piano scritto il 2026-11-08 («tutte le zone foot da parte, poi rifare
Italia dall'estratto ed estere da Overpass») **non è stato seguito**: il
metodo vero è in `DEPLOY.md` F.15, qui l'esito.

1. **Server al `main`** col passo unico del Coordinatore (#957, #973,
   migrazioni 0061–0064, Play; immagine di ritorno
   `shaperoute-api:before-2026-11-10`); impronta nel container
   `8ab61d8e87f9`, `{"status":"ok"}`; immagine `shaperoute-prefetch`
   rifatta sopra (`sha256:7f5a88f5…`).
2. **Primo tentativo**, 08:58Z: zone da parte in `before-task421/` e
   `prefetch_zones --preset italy Rovereto` nella cache. Fermato dopo Roma e
   Rovereto: in cache c'erano 934 zone, non 63 (USA, Europa, Italia 50k di
   ottobre), e il container è morto per la memoria quando ne è partito un
   secondo. Lo script `out/TASK-421/task421_split.py` ha rimesso in cache le
   2.458 zone fuori da «Explore»; il Coordinatore ha riportato le 61 città
   di «Explore» con `mv -n`: nessuna città scoperta.
3. **Il giro vero**, del Coordinatore: cartella a parte `cache-task421` coi
   `names_*.json` copiati, `--memory 5g` (con 4g osmium veniva ucciso
   dall'OOM, due volte), `--preset italy --preset featured Rovereto`
   dall'estratto `italy-260930`: **53 su 53** (4 ready, 49 downloaded, 0
   missing), log `data/prefetch-task421b.log`. Scambio per nome alle 10:25Z:
   49 con lo stesso nome (vecchi in `before-task421/*.old`), 4 col nome
   nuovo (Firenze, Milano, Levico, Trento).
4. **Le zone all'ombra**, 10:35Z, con `out/TASK-421/zone_shadows.py`
   (l'API prende la zona più piccola che contiene la richiesta, quindi le
   vecchie dentro le nuove vincevano): prova a secco «934 zone, 53 nuove;
   414 contenute, 13,7 GB; 63 della stessa città, 2,0 GB», poi `--apply`:
   477 zone, 1.413 file in `before-task421/` (1.564 file, 26 GB; 52 GB
   liberi). In cache 457 `foot_*.graphml`. Uscite in
   `out/TASK-421/dryrun-server.txt` e `apply-server.txt`.
5. **Prova** senza riavvio: aereo e cuore da 5,2 km a Trento, pronti in
   10–12 s, log «graph from disk (foot_45.98990_11.01550_46.14290_11.23600
   .graphml)»: la zona nuova.
6. **Riavvio, zone del telefono, esempi**: lanciati dall'utente dopo lo
   scambio; i numeri nel «server fatto 973» del Coordinatore (sotto,
   «Esito»).

**Rollback**: `DEPLOY.md` F.15.

## Criteri di accettazione

- [x] Un grafo finto con un cancello chiuso, uno aperto e uno pedonale: il
      percorso evita solo il primo (`tests/test_foot_barriers.py`).
- [x] I cancelli senza tag, `kissing_gate`, dissuasori e `foot=yes` restano.
- [x] `access=no` senza `foot` e `foot=private` tolgono la via;
      `access=destination` no.
- [x] La rete `hike` perde gli stessi nodi.
- [x] Le misure su 2–3 zone e il banco prima/dopo in questo file.
- [x] Impronta: `ROUTES` nuovo (`8ab61d8e87f9`); nuotate e canoa con la
      prova delle stesse rotte; `engine.zip` rifatto.
- [x] CI verde sulla PR #973.
- [x] Piano di rigenerazione delle zone in `MAPS.md` e `DEPLOY.md`; il
      server non si tocca senza il sì dell'utente.

## File toccati

```
services/route-engine/route_engine/networks/foot.py
services/route-engine/route_engine/networks/base.py          (node_tags)
services/route-engine/tests/test_foot_barriers.py            (nuovo)
services/api/tests/test_walk_fingerprint.py                  (ROUTES)
services/api/shaperoute_api/route_store.py                   (SAME_ROUTES_AS: nuotate e canoa)
services/api/tests/fixtures/same_routes/<impronta>.json      (nuovo, la prova)
apps/mobile/assets/engine/engine.zip                         (ricostruito, ultimo commit)
docs/tasks/TASK-421.md                                       (nuovo)
docs/MAPS.md, docs/DEPLOY.md, docs/ROUTE_ENGINE.md
docs/DECISIONS.md (ADR-0349), docs/STATUS.md, docs/INDEX.md  (righe proprie, nella PR di soli
                                                              documenti subito dopo il merge della #973:
                                                              regola del Coordinatore del 2026-11-08)
```

## Fuori scope

- **Segnalare un cancello dall'app** (l'utente che dice «qui c'è un
  cancello»): scelta di prodotto, da chiedere all'utente; non qui.
- Rifare le zone del server: è un'azione sul server, col piano in
  `DEPLOY.md` F.15 e il sì dell'utente; qui solo il piano.
- Le reti `bike`, `mtb`, `roller`: hanno le loro regole (ADR-0153, ADR-0322,
  ADR-0324); `wheel` (TASK-414 A) riuserà `foot_ways`/`blocks_foot` se vuole.
- Ereditare l'`access` della via su un cancello nudo: misurato, non vale.

## Esito

2026-11-10. Motore in `main` con la #973 (ADR-0349, impronta
`8ab61d8e87f9`), documenti nella #1009 e in questa PR. Sul server le 53
zone foot di «Explore» rifatte dall'estratto del 2026-09-30 senza cancelli
e 477 zone vecchie all'ombra messe da parte (`DEPLOY.md` F.15); una
richiesta a Trento usa la zona nuova. Restano coi cancelli le circa 400
zone fuori da «Explore» e quelle più grandi di 17 km delle stesse città:
rifarle (`prefetch_zones --boxes`, estratti per paese, ore di server) è una
scelta dell'utente, che il Coordinatore gli porta. Zone del telefono ed
esempi: nel passo successivo del Coordinatore.

Strumenti fuori dal repository, in `out/TASK-421/` sul Mac:
`task421_split.py` (rimette in cache le zone fuori da «Explore»),
`zone_shadows.py` (le zone all'ombra, prova a secco e `--apply`).
