# INDEX — Cosa leggere, e quando

Scopo: **non caricare documentazione inutile**. Trova la riga del tuo task e
leggi solo quei documenti.

## Regola generale

| Sempre | Mai «per sicurezza» |
|---|---|
| `CLAUDE.md`, `STATUS.md`, il task file | tutto il resto di `docs/` |

**`DECISIONS.md` e `docs/archive/` non si leggono interi**: si cercano con
grep per numero (`grep -n "ADR-0300" docs/DECISIONS.md docs/archive/*.md`,
`grep -n "TASK-347" docs/archive/*.md`) e si legge solo la voce trovata.
Le righe qui sotto che dicono «ADR-…» vogliono dire questo.

## Instradamento

| Sto lavorando su… | Leggi |
|---|---|
| Installare tutto e partire da zero | `SETUP.md` |
| Forme, proiezione, snapping, routing, ottimizzazione, validazione | `ROUTE_ENGINE.md` (§2–§6), `MAPS.md`, `TESTING.md` |
| I cancelli chiusi e le vie `access=no` sulla rete a piedi; rifare le zone in cache | `MAPS.md` «I cancelli chiusi», `DEPLOY.md` F.15, `ROUTE_ENGINE.md` §4, `tasks/TASK-421.md`, ADR-0349 |
| Disegno libero ancorato alle strade (map matching per tratto) | `ROUTE_ENGINE.md` §4–§5, `API.md` «Stroke matches», `tasks/TASK-347.md`, ADR-0300 |
| Guardare o confrontare percorsi generati | `../samples/README.md` |
| Export GPX o wearable | `GPX.md` |
| Endpoint, contratti REST, validazione input | `API.md`, `ARCHITECTURE.md` §3 |
| Quanti percorsi regge il server; i processi che calcolano i percorsi (`--route-processes`) | `tasks/TASK-276.md`, ADR-0242 |
| Il primo percorso mostrato mentre il job calcola (`first`, `?first=1`), le alternative dopo | `tasks/TASK-435.md`, ADR-0361, `API.md` «Richieste in due tempi» |
| Dove va il tempo di un percorso nel motore; le tabelle calcolate una volta per grafo (punti degli archi, maschera delle strade) | `tasks/TASK-434.md`, `tasks/TASK-436.md`, ADR-0362 |
| Cosa sa leggere un'app vecchia, `X-MuW-Reads`, uno sport nuovo nelle liste | `API.md` «Quello che un'app sa leggere», ADR-0328 |
| Parole lette dall'AI, Ollama | `AI.md` |
| Schermate, mappa, «Draw», «Edit the drawing», disegno a mano, girare la figura, i pezzi | `UI.md`, `PRODUCT.md` |
| Il tema, il look premium, `src/ui/`, i movimenti (`motion.ts`) | `UI.md` «Il tema» e «Il look premium», ADR-0293, ADR-0329, `tasks/TASK-339.md`, `tasks/TASK-388.md` |
| Barra di schede, header, swipe fra le schede | `UI.md`, ADR-0311, ADR-0323 |
| Modello dati, migrazioni, PostGIS | `DATABASE.md` |
| Server, deploy, OTA, pubblicazione | `DEPLOY.md`, `AGENTI.md` |
| Scelta di libreria, provider, formato | `DECISIONS.md` (indice, poi grep) |
| Struttura cartelle, confini tra moduli | `ARCHITECTURE.md` |
| Test, fixture, criteri di accettazione | `TESTING.md` |
| Branch, PR, review, rilasci | `TEAM_WORKFLOW.md` |
| Il sito, il merch | `SITO.md` |
| Pubblicità, AdMob, pagamenti | `PUBBLICITA.md`, ADR-0198 |
| Feed: schede, filtri «Tutti»/«Seguiti», percorsi di MuW | `API.md` «Feed», ADR-0306, ADR-0308, ADR-0310 |
| Post: video, compositore, calorie e battito | `API.md` «Drawings», `tasks/TASK-336.md`, `tasks/TASK-348.md`, `tasks/TASK-345.md` |
| La pagina del post (foto, video, foglio, sezioni, `run_stats`) | `tasks/TASK-410.md`, ADR-0340 (precisazioni C, D, F), `API.md` «Run stats», `DATABASE.md` (0064) |
| La mia immagine al posto dell'animale nel video (foto tonda, GIF, cartellino sul 3D) e il video «Together» con le persone taggate sullo stesso orologio | `tasks/TASK-417.md`, `DECISIONS.md` ADR-0345 e ADR-0339, `tasks/TASK-408.md` |
| Video della corsa ed editor con l'animale 3D | ADR-0303, ADR-0339, `UI.md` «Il post da condividere», `tasks/TASK-408.md` |
| Messaggi, chat, allegati | `API.md` «Messages», `UI.md`, ADR-0279, ADR-0305 |
| Profilo: record personali, badge, il mio corpo, VO₂ max | `API.md` «Profile», ADR-0312, ADR-0318, `tasks/TASK-341.md`, `tasks/TASK-397.md` |
| Posizione del telefono e privacy | `tasks/TASK-363.md`, ADR-0306 |
| Il gioco delle forme, squadre e sfide | `GIOCO.md` |
| Concorsi e sfide del mese | `CONCORSI.md`, `tasks/TASK-343.md` |
| Corse di gruppo | `EVENTI.md`, `tasks/TASK-309.md` |
| Attività da altre app (GPX, TCX, FIT), post di sole foto | `IMPORTAZIONI.md`, `tasks/TASK-312.md` |
| Apple Salute, Health Connect | ADR-0281, `tasks/TASK-321.md` |
| «MuW Style» | `STYLE.md`, `tasks/TASK-384.md` |
| Percorsi in bici di MuW in «Explore» | `UI.md` «Pedalalo tu», ADR-0309 |
| Il catalogo di «Explore»: forme nuove, i mille disegni, la pagina | `../catalog/README.md`, ADR-0347, `tasks/TASK-418.md`, `tasks/TASK-419.md`, `tasks/TASK-420.md` |
| Le forme candidate e quelle approvate: `candidate_outlines/`, `tools/draw_new_shapes.py` (`APPROVED`), `ZONE_SHAPES` | `tasks/TASK-418.md`, ADR-0346 e la precisazione B, ADR-0036 |
| Aggiungere uno sport, il banco `tools/sport_bench/` | `sports/README.md`, `sports/COME-AGGIUNGERE.md`, `sports/CONDIVISO.md`, ADR-0320 |
| Uno sport in particolare (corsa, bici, canoa, hike, gravel, roller, gym, skimo, wheelchair, snowshoes) | `sports/<sport>.md` e il suo task file se aperto |
| Nuoto in piscina: calorie, battito e zone | `tasks/TASK-409.md`, ADR-0318, ADR-0334 |
| Walk, nuoto in acque libere | `ROUTE_ENGINE.md` (le reti, §8), `tasks/TASK-371.md` |
| Sci: «Record only», stazioni, meteo | `MAPS.md` «Impianti e piste da sci», ADR-0319, ADR-0338, `tasks/TASK-375.md`, `tasks/TASK-406.md` |
| La modalità sci: scelto lo sci, l'app diventa un'app per lo sci (schede, giornata, mappa con legenda, stagione) | `tasks/TASK-429.md`, ADR-0357, ADR-0338, ADR-0319 |
| Apple Watch | `tasks/TASK-370.md`, ADR-0314 |
| Dati dal vivo in registrazione, «Share live activity» (link web a token) | `tasks/TASK-424.md`, ADR-0352, `API.md` «Live shares», `SITO.md` «La pagina dal vivo», `UI.md` «La corsa» («Share live») e «Calories» (le formule di ogni attività), ADR-0352 precisazione C |
| La corsa in registrazione: le tre pagine «Compass», «Map», «Data», la mappa che gira dove punta il telefono | `UI.md` «La navigazione», ADR-0350, ADR-0137, `tasks/TASK-422.md` |
| La freccia di chi corre (anello e cono azzurri, punta dove punta la mappa su «Compass»), i disegni delle tre schede, i token `you` e `north` | `UI.md` «La freccia di direzione» e «La corsa: tre pagine», ADR-0359, `tasks/TASK-431.md` |
| Le schede della palestra guidate: la guida in 5 passi, le settimane che cambiano, «My plans», l'app di prima che le legge | `sports/gym.md` «Le schede guidate», ADR-0360, ADR-0341, `API.md` «Gym», `tasks/TASK-433.md` |
| I giorni di corsa nella scheda della palestra, «Come funzionano le schede» al primo tocco di Palestra | `sports/gym.md` «Le schede guidate», ADR-0363, `tasks/TASK-433.md` (parti B e C) |
| «Edit the drawing» su una traccia che finisce lontano dalla partenza: chiusa fino alla partenza, non corsa due volte; se si incrocia, un anello alla partenza; anche un percorso chiuso di «Explore» che si incrocia | `UI.md` «Edit the drawing: la figura sulla mappa», ADR-0353, ADR-0356 (e precisazione), ADR-0313, `tasks/TASK-425.md`, `tasks/TASK-428.md`, `tasks/TASK-432.md` |
| «Draw on the map»: la partenza, un pallino da spostare lungo il disegno | `UI.md` «Disegnare sulla mappa» («La partenza»), ADR-0354, ADR-0336, `tasks/TASK-426.md` |
| I percorsi di MuW nel Feed: spenti, l'interruttore per riaccenderli | `UI.md` «Feed», ADR-0358, ADR-0310, `tasks/TASK-430.md` |
| Cosa fare dopo | `ROADMAP.md`, `STATUS.md` |

Le righe di prima, con i rimandi ai task chiusi, sono in
`archive/INDEX-fino-al-2026-11.md`.

## Stato dei documenti

Tutti pieni, tranne `UI.md` (pieno per mappa e posizione) e `PUBBLICITA.md`
(pieno per account e pagamenti; gli annunci veri con TASK-153). Uno stub si
riempie quando arriva il suo task, non prima.

## Chi possiede cosa

Ogni informazione vive in **un solo** documento: se la trovi in due posti,
uno dei due è già sbagliato.

- Stato corrente e prossimo passo → `STATUS.md`; task chiusi →
  `archive/COMPLETATI.md`
- Perché una scelta è stata fatta → `DECISIONS.md` (e i suoi archivi)
- Cosa faremo e in che ordine → `ROADMAP.md`
- Come funziona un algoritmo → il documento di dominio
- Regole permanenti → `CLAUDE.md`
- Risultati generati e loro giudizio → `samples/LOG.md`
