# TASK-191 — Percorsi in canoa e paddle

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-191-paddle-routes`
**Dipende da**: TASK-189 («Sport» in «Settings»: la riga «Paddle» da
accendere), TASK-177 (la pagina «Settings»). Meglio dopo la parte A e B
di TASK-190, che aprono `activity` a un secondo valore.

## Obiettivo

Chi sceglie «Paddle» riceve un percorso che disegna la forma **sull'acqua**
di un lago o lungo la costa, con partenza e arrivo dalla riva. Chiesto
dall'utente il 2026-10-02: «anche per la canoa […] da fare esempi anche
in base alle varie località marittime e dove ci sono laghi; terrai come
esempio Lago di Garda, Lago di Como, Jesolo, Riccione».

## Scelte dell'utente (2026-10-02)

- **Il disegno resta entro circa 1 km dalla riva**, con un avviso di
  sicurezza prima di partire.
- Luoghi d'esempio: **Lago di Garda, Lago di Como, Jesolo, Riccione**.
- In «Settings» la riga «Paddle» resta «Soon» finché questo task non è
  finito (ADR-0152).

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §1, §2 (la forma), §3 (la proiezione), §5
  (rotazione, scala, «Trova dove la forma ci sta»), §6
- `docs/MAPS.md` «Sorgente», «Overpass: come si scarica», «Cache»
- `docs/DECISIONS.md` ADR-0008, ADR-0023, ADR-0119, ADR-0136 (gli esempi
  tenuti), ADR-0152
- `docs/API.md`: la richiesta di percorso e il campo `activity`
- `services/route-engine/route_engine/models.py`, `optimizer.py`,
  `projection.py`, `export_gpx.py`
- `services/api/shaperoute_api/draw_examples.py`, `prefetch_zones.py`

## Il punto

Sull'acqua non c'è una rete di strade: la forma proiettata **è** il
percorso, se sta tutta nell'acqua. Il lavoro non è agganciare la forma a
un grafo, è **trovare dove la forma ci sta**: rotazione, scala e
posizione in cui la linea resta nell'acqua, entro 1 km dalla riva, senza
attraversare terra, isole e porti. Resta il principio di `CLAUDE.md`: la
forma la decide il motore, mai l'AI.

Serve una **fonte nuova** nel motore: l'acqua da OpenStreetMap.

- **Laghi**: poligoni `natural=water` (Garda e Como sono relazioni
  grandi: il lago intero pesa, serve il ritaglio attorno alla partenza).
- **Mare**: OSM non ha un poligono del mare, ha la linea
  `natural=coastline`. L'acqua è «il riquadro meno la terra»: la terra va
  costruita dalla linea di costa dentro il riquadro. È la parte meno
  ovvia del task: va provata per prima su Jesolo (laguna, foci, canali) e
  Riccione (costa dritta, scogliere frangiflutti e moli).
- **Dipendenze**: `shapely` è già del motore; OSMnx scarica anche gli
  elementi (`features_from_bbox`), con `geopandas`, che OSMnx installa
  già. **Controllare che basti**: se serve una dipendenza nuova, fermarsi
  e chiedere all'utente.

## Cosa fare

`activity` ha già il posto nel contratto: si aggiunge il valore
`"paddling"`, e l'app traduce «Paddle» in `"paddling"`. Nessun campo
`sport` nuovo.

In tre PR, in quest'ordine (se il coordinatore preferisce, tre task).

**A. Route Engine**

1. Un modulo nuovo per l'acqua: scarica e tiene in cache (separata dalle
   strade) l'acqua attorno a un punto, lago o mare, come geometria in
   metri sul piano proiettato.
2. La fascia navigabile: l'acqua entro 1 km dalla riva, meno un margine
   dalla riva stessa e da moli e scogliere (il margine va deciso sui dati
   e scritto nell'ADR-0154).
3. La ricerca: per una forma e una distanza, la rotazione, la scala e la
   posizione in cui la linea sta tutta nella fascia; la somiglianza è
   quella della forma con sé stessa, quindi il punteggio misura quanto si
   è dovuto rimpicciolire o spostare. Se la forma non ci sta, è un errore
   che lo dice, non un percorso che attraversa la terra.
4. Partenza e arrivo: il punto della riva più vicino alla forma dove si
   arriva a piedi (spiaggia, molo, strada sul lungolago), con il tratto
   dalla riva alla forma e ritorno. Come si sceglie va nell'ADR.
5. La validazione di §6 per l'acqua: la linea non tocca terra; la
   distanza massima dalla riva; la distanza totale. Niente scale, strade
   principali e ripercorrenza: non hanno senso sull'acqua.
6. Limiti di distanza per l'attività (proposta: 1–10 km, da confermare
   con la fascia di 1 km sui quattro luoghi d'esempio).
7. CLI `--activity paddling`, fixture senza rete per i test (un pezzo di
   lago e un pezzo di costa), campioni in `samples/` per Garda, Como,
   Jesolo e Riccione, da far giudicare all'utente.

**B. API**

8. `activity: "paddling"` nelle richieste e in `shared-types`; gli errori
   nuovi («qui non c'è acqua», «la forma non ci sta»).
9. Gli esempi dei quattro luoghi disegnati prima (`draw_examples.py`),
   con il punto di partenza di ognuno scelto a mano e scritto nel task
   (per i laghi: quale paese della riva).

**C. App**

10. `ready: true` per «Paddle» in `sport.ts`; «Draw» manda `activity`
    secondo lo sport e propone le distanze della canoa; l'avviso di
    sicurezza prima di partire (testo da far approvare all'utente).
11. La mappa: il percorso è sull'acqua, dove la mappa scura ha poco
    contrasto (`color.map.water`): controllare che la linea si legga.
12. Dove si trovano gli esempi dei laghi e del mare in «Explore» **è una
    scelta di prodotto**: proporla all'utente prima di toccare «Explore».

## Criteri di accettazione

- [ ] Dalla CLI, senza rete e senza chiavi, sulle fixture: un percorso
      `paddling` chiuso, che parte e arriva sulla riva e non tocca terra
      in nessun punto.
- [ ] Nessun punto del percorso è oltre 1 km dalla riva.
- [ ] Una richiesta `paddling` lontano dall'acqua è un errore che lo
      dice; una forma che non sta nella fascia è un errore che lo dice.
- [ ] Una richiesta `running` si comporta come prima.
- [ ] Campioni di Garda, Como, Jesolo e Riccione in `samples/`, giudicati
      dall'utente.
- [ ] Nell'app, con «Paddle» scelto, «Draw» chiede un percorso
      `paddling` e mostra l'avviso di sicurezza; con «Run» tutto è come
      prima.
- [ ] Test deterministici per motore, API e app; nessuna dipendenza nuova
      senza l'ok dell'utente.

## File toccati

Elenco previsto; ogni PR dichiara i suoi.

```
services/route-engine/route_engine/water.py        (nuovo)
services/route-engine/route_engine/models.py
services/route-engine/route_engine/validation.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/errors.py
services/api/shaperoute_api/draw_examples.py
services/api/tests/
packages/shared-types/src/index.ts
apps/mobile/src/settings/sport.ts
apps/mobile/App.tsx
samples/
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-191.md
```

## Fuori scope

- Fiumi, canali e lagune interne: solo laghi e costa del mare.
- Correnti, vento, onde, maree, meteo.
- **Le regole del posto** (zone riservate ai bagnanti, corridoi di
  lancio, divieti del lago, rotte dei traghetti): il motore non le
  conosce. L'avviso di sicurezza deve dirlo; non si promette che un
  percorso sia permesso o sicuro.
- La voce che guida e il punteggio a fine giro pensati per l'acqua.
- La bici: TASK-190.

## Domande aperte per l'utente

Una per volta, con una proposta:

1. Il testo dell'avviso di sicurezza (proposta da scrivere nella parte
   C: giubbotto, meteo, regole del posto, distanza dalla riva).
2. Le distanze: 1–10 km va bene, dopo aver visto i campioni?
3. Gli esempi di laghi e mare in «Explore»: una categoria a parte, o i
   luoghi fra le città quando lo sport scelto è «Paddle»?
4. Il nome nell'app: «Paddle» (canoa, kayak, SUP) o «Canoe»?

## Esito

*(si compila a fine task)*
