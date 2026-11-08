# TASK-421 — I percorsi a piedi non passano per i cancelli chiusi

**Stato**: In corso — PR #973 (codice, test, documenti); dopo il merge le
zone del server (`DEPLOY.md` F.15) col sì dell'utente
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

## La sequenza sul server (dopo il «via server 973» del Coordinatore)

Sì dell'utente: «Sì, ok server» (sessione del Coordinatore) e «Sì, dopo il
merge» (questa sessione), 2026-11-08. Un comando ssh per volta, lanciato
dall'utente dal Mac (`!` davanti); io leggo l'esito e do il successivo.
Una pubblicazione alla volta: prima potrebbero passare TASK-419 e la #957.

**A. Il server al `main` con la #973** (F.12, come gli aggiornamenti di prima)

1. Stato e copia: `main` pulito sul server, dump del database, immagine di
   ritorno.

   ```bash
   ssh root@188.245.9.220 'cd /root/shaperoute && git status --short | head -3 && git fetch -q origin && git log --oneline -1 origin/main'
   ```

   ```bash
   ssh root@188.245.9.220 'cd /root/shaperoute/deploy && docker compose exec -T backup bash /backup.sh now && docker tag shaperoute-api shaperoute-api:before-task421 && df -h / | tail -1'
   ```

2. Codice, build prima e `up` dopo (pochi secondi di API ferma), salute.

   ```bash
   ssh root@188.245.9.220 'cd /root/shaperoute && git pull -q --ff-only && cd deploy && docker compose build -q api && docker compose up -d && sleep 25 && curl -s http://127.0.0.1:8000/health && docker compose logs api --tail 30 | grep -i "accounts\|schema\|migration"'
   ```

3. L'impronta nel container deve essere `8ab61d8e87f9`.

   ```bash
   ssh root@188.245.9.220 'cd /root/shaperoute/deploy && docker compose exec -T api python -c "from shaperoute_api.route_store import engine_fingerprint; print(engine_fingerprint())"'
   ```

4. L'immagine dei download rifatta sulla nuova API (porta il motore nuovo:
   senza, le zone uscirebbero coi cancelli).

   ```bash
   ssh root@188.245.9.220 "printf 'FROM shaperoute-api\nUSER root\nRUN apt-get update && apt-get install -y --no-install-recommends osmium-tool\nUSER shaperoute\n' | docker build -q -t shaperoute-prefetch -"
   ```

**B. Le zone foot** (F.15)

5. Spazio e zone vecchie da parte (`prefetch_zones` salta una città «ready»).

   ```bash
   ssh root@188.245.9.220 'cd /root/shaperoute/data/cache && du -sh . && mkdir -p before-task421 && mv foot_*.graphml foot_*.pickle foot_*.zone.json.gz before-task421/ && ls before-task421 | wc -l'
   ```

6. Le italiane più Rovereto dall'estratto, staccato dalla ssh (circa un
   minuto a città, memoria fino a 4 GB).

   ```bash
   ssh -f root@188.245.9.220 'cd /root/shaperoute && (setsid nohup docker run --rm --memory 4g --env-file deploy/.env -v /root/shaperoute/data/cache:/app/data/cache -v /srv/shaperoute/extracts:/extracts shaperoute-prefetch python -m shaperoute_api.prefetch_zones --preset italy Rovereto --extract /extracts/italy-260930-highways.osm.pbf --cache-dir /app/data/cache > data/prefetch-task421.log 2>&1 &)'
   ```

   Si segue finché «missing» è vuoto:

   ```bash
   ssh root@188.245.9.220 'tail -5 /root/shaperoute/data/prefetch-task421.log; ls /root/shaperoute/data/cache/foot_*.graphml 2>/dev/null | wc -l'
   ```

7. Le estere da Overpass (pausa e tetto: dopo pochi download rifiuta, si
   rilancia più tardi; le italiane del preset sono già «ready»).

   ```bash
   ssh -f root@188.245.9.220 'cd /root/shaperoute && (setsid nohup docker run --rm --memory 4g --env-file deploy/.env -v /root/shaperoute/data/cache:/app/data/cache shaperoute-prefetch python -m shaperoute_api.prefetch_zones --preset featured --max-downloads 4 --cache-dir /app/data/cache > data/prefetch-task421-featured.log 2>&1 &)'
   ```

**C. Le zone del telefono** (80 minuti circa, dentro il container dell'API:
non riavviare l'API finché gira)

   ```bash
   ssh -f root@188.245.9.220 'cd /root/shaperoute/deploy && (setsid nohup docker compose exec -T api nice -n 19 python -m shaperoute_api.phone_zone_api > ../data/phone-zones-task421.log 2>&1 &)'
   ```

**D. Gli esempi** (`draw_examples`, circa 35 minuti, dopo le zone)

   ```bash
   ssh -f root@188.245.9.220 'cd /root/shaperoute/deploy && (setsid nohup docker compose exec -T api python -m shaperoute_api.draw_examples --api http://127.0.0.1:8000 --preset italy --preset featured Rovereto > ../data/draw-examples-2026-11-08-task421.log 2>&1 &)'
   ```

   Alla fine «66 of 66»; una città «not found by the city search» si rifà
   da sola per nome. Si segue con:

   ```bash
   ssh root@188.245.9.220 'tail -3 /root/shaperoute/data/draw-examples-2026-11-08-task421.log'
   ```

**E. Controllo**: dall'app, il percorso del 2026-11-08 non passa più dal
cancello; `du -sh data/cache`. Dopo una settimana, `rm -r
data/cache/before-task421`.

**Rollback**: zone, `mv data/cache/before-task421/* data/cache/` e
`docker compose restart api`; API, `docker tag shaperoute-api:before-task421
shaperoute-api && docker compose up -d` (il dump del passo 1 per il database).

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
- [ ] CI verde sulla PR #973.
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

*(a fine task)*
