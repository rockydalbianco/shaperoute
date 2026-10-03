# TASK-225 — L'acqua dei quattro luoghi della canoa sul server

**Stato**: In corso (codice in PR; l'acqua sul server aspetta l'ok del
coordinatore, regola 9)
**Fase**: 4 · **Branch**: `feat/TASK-225-paddle-water`
**Dipende da**: TASK-191 (A2 #235, B #241 e C #255 in `main`)

## Obiettivo

Il server disegna in canoa solo dove ha già l'acqua in
`data/cache/water/`. Overpass rifiuta il suo indirizzo e la query
dell'acqua non ha mai avuto risposta (ADR-0154). Così oggi ogni richiesta
`paddling` risponde `503 map_data_unavailable`, e `main`, che dalla #255
ha «Paddle» pronto, non si può pubblicare. Questo task mette sul server
l'acqua di Riccione, Jesolo, Lago di Garda e Lago di Como, i quattro luoghi
di «Explore» con «Paddle», e la prova con una richiesta vera.

## Scelte dell'utente (2026-10-03 sera)

- «SI GRAZIE» (nella sessione del coordinatore) e «SI FALLO» (nella
  sessione di TASK-191 C): scaricare l'acqua dei quattro luoghi e metterla
  sul server.
- «Aspetta e poi pubblica»: la pubblicazione dell'app la coordina il
  coordinatore, dopo l'acqua sul server.

## Contesto da leggere

- `docs/tasks/TASK-191.md`, «Esito» A2, B e C, e «Note per il deploy»
- `docs/DECISIONS.md` ADR-0154, ADR-0161, ADR-0164, ADR-0119 (le zone da
  un estratto)
- `services/route-engine/route_engine/water.py` (`OverpassWaterSource`),
  `water_fit.py` (`water_bbox`)
- `services/api/shaperoute_api/zone_extract.py`, `paddling.py`
- `docs/MAPS.md` «Cache», «Zone scaricate prima»; `docs/DEPLOY.md` F.12
- `docs/AGENTI.md` regole 5–11

## Cosa fare

1. **Come legge l'acqua l'API.** Se la cache vale solo per lo stesso
   riquadro, fare in modo che un'area più grande, scaricata prima, copra
   le richieste dentro di lei, come `covering_path` per le strade. Con
   test deterministici, e con corsa, bici e forme di oggi identiche.
2. **Scaricare l'acqua** dei quattro luoghi: da Overpass dal Mac, con
   poche richieste grandi e piano. Se Overpass non risponde, da un
   estratto Geofabrik (laghi e costa).
3. **Sul server**, dopo l'ok del coordinatore: i file in
   `data/cache/water/` di `/root/shaperoute`. Poi una richiesta `paddling`
   vera dentro il container: un cuore da 2 km a Riccione (44.00355,
   12.66338), più i campioni v2 e Como da far giudicare all'utente.
4. **La pubblicazione** dell'app: la fa il coordinatore, non questo task.

## Criteri di accettazione

- [x] Una richiesta dentro un file d'acqua più grande è servita da quel
      file, senza download, con lo stesso percorso che darebbe il file del
      suo riquadro (test).
- [x] Corsa, bici e forme identiche: `route_engine` non cambia, e
      l'impronta del motore resta quella.
- [ ] L'acqua dei quattro luoghi è in `data/cache/water/` sul server.
- [ ] Una richiesta `paddling` vera sul server dà un percorso: il cuore da
      2 km a Riccione.
- [ ] I campioni v2 (Riccione, Jesolo, Garda) e Como, per il giudizio
      dell'utente.

## File toccati

- `services/api/shaperoute_api/water_extract.py` (nuovo)
- `services/api/tests/test_water_extract.py` (nuovo)
- `docs/tasks/TASK-225.md` (nuovo)
- `docs/MAPS.md` (sotto «Cache», la voce dell'acqua: come si fa da un
  estratto)
- `docs/DECISIONS.md` (ADR-0187, solo aggiunta)
- `docs/STATUS.md` (solo le righe di questo task)

## Fuori scope

- Pubblicare l'app: è del coordinatore, con l'ok dell'utente.
- Gli esempi della canoa in `draw_examples` e l'«Explore» della canoa come
  quello della corsa: TASK-227.
- Le forme con gli occhi sull'acqua: TASK-226.
- Altri luoghi d'acqua oltre i quattro. Ogni partenza fuori dai riquadri
  chiede ancora Overpass, che rifiuta il server: `503`.

## Esito

### Il codice — 2026-10-03

**Il punto 1 era già fatto.** `OverpassWaterSource.covering_path` cerca,
fra i file di `data/cache/water/`, il più piccolo il cui riquadro contiene
quello chiesto, e `ServerWater.needs_download` usa la stessa ricerca.
`build_area` ritaglia poi tutto al riquadro della richiesta. Un file
grande serve quindi ogni richiesta che ci sta dentro, uguale a un
download del suo riquadro: l'acqua da Overpass è un sovrainsieme, e il
ritaglio dà la stessa area. **`route_engine` non cambia**, quindi la
corsa, la bici e le forme sono identiche per costruzione. L'impronta del
motore resta quella, non c'è da rilanciare `draw_examples` e non c'è
niente da dire a TASK-214 B né a TASK-223.

**Overpass rifiuta il Mac** (2026-10-03, 22:05): tutti e due gli indirizzi
di `overpass-api.de` chiudono la connessione. Come per le zone
(ADR-0119), l'acqua viene allora da un estratto: **ADR-0187**.

- `shaperoute_api/water_extract.py` (nuovo, sul modello di
  `zone_extract.py`). Legge un ritaglio OSM XML di osmium e sceglie quello
  che Overpass risponderebbe a `water.water_query(bbox)`:
  - un nodo dentro il riquadro;
  - una via con un nodo dentro o un tratto che lo attraversa;
  - una relazione con un membro così;
  - le vie a meno di 40 m dalle vie dell'acqua o dalle vie membro delle
    sue relazioni.

  Ordina come `out` di Overpass e scrive il file con `compact` e
  `write_water`, col nome di un download di quel riquadro. Il comando:
  `python -m shaperoute_api.water_extract --osm ritaglio.osm --bbox
  S,W,N,E --cache-dir data/cache`. Con `--extract` taglia da sé con
  `osmium extract --strategy smart` e 500 m di margine.
- **Test**: `services/api/tests/test_water_extract.py`, 10 test, nessuna
  rete e nessun osmium. Le due fixture dell'acqua del motore, scritte come
  XML con gli id dei nodi, tornano uguali a un download. La via che
  attraversa l'angolo del riquadro c'è; quello che sta fuori, o a più di
  40 m dall'acqua, no. La strada del lungolago si trova attraverso le vie
  senza tag della relazione del lago. Un membro che manca dal ritaglio si
  lascia fuori. Una richiesta dentro un file grande dà lo stesso percorso
  del file del suo riquadro; una che esce dal file non è coperta.

**I riquadri**: la richiesta più grande, 5 km, chiede ±5,04 km attorno
alla partenza (`water_bbox`), quindi ogni riquadro è allargato di 5,2 km
attorno ai luoghi da cui si parte:

| File | Si parte da | S, W, N, E |
|---|---|---|
| Riccione | la costa da Rimini (Torre Pedrera) a Cattolica | 43.903, 12.435, 44.147, 12.845 |
| Jesolo | da Cavallino a Eraclea Mare | 45.403, 12.433, 45.607, 12.867 |
| Garda nord | Riva, Torbole, Limone, Malcesine | 45.703, 10.693, 45.937, 10.957 |
| Garda | tutto il lago | 45.383, 10.433, 45.937, 10.947 |
| Como città | Como | 45.743, 8.983, 45.907, 9.187 |
| Como | tutto il lago | 45.753, 8.993, 46.217, 9.507 |

Per ogni richiesta l'API legge il file più piccolo che la contiene: gli
esempi di Riva e di Como leggono il file piccolo, una partenza a Sirmione
o a Lecco il lago intero.

**Sul Mac non si riesce a tagliare l'estratto.** Gli estratti Geofabrik
nord-est (Emilia-Romagna, Veneto, Trentino: Riccione, Jesolo, Garda) e
nord-ovest (Lombardia: Como e la riva ovest del Garda) sono in
`out/task225-water/`, fuori dal repository. osmium-tool va in OOM nella
VM docker da 2 GB, e pyosmium non ha finito in 30 minuti. Sul Mac un'app
nel simulatore iOS gira all'860% di CPU da 36 ore, con un load average di
117. Proposto al coordinatore: tagliare e scrivere sul server, che ha
osmium nell'immagine `shaperoute-prefetch`, 8 GB e la rete verso
Geofabrik, in un container usa-e-getta e senza fermare l'API. Si aspetta
la sua risposta (regola 9).

## Note per il deploy

- Nessun aggiornamento del codice serve per l'acqua: l'API sul server
  (`7098cb9`) legge già i file di `data/cache/water/` e il più piccolo che
  copre la richiesta. `water_extract.py` serve solo a scriverli.
- I file vanno in `/root/shaperoute/data/cache/water/`, lo stesso volume
  delle zone, leggibili dall'utente del container.
- Il Lago di Lugano, in parte svizzero, è nel riquadro di Como intero ma
  non negli estratti italiani tutto intero: lì l'acqua può mancare. Non è
  uno dei quattro luoghi.
