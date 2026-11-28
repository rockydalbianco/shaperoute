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
| Condividere un post: «Share» sui post, il post mandato in chat come rimando, il link di un post | `tasks/TASK-455.md`, ADR-0382, `API.md` «Un post in un messaggio» |
| Il link di un post che apre l'app: la barra di Safari, l'indirizzo letto dall'app, i link verificati | `tasks/TASK-482.md`, ADR-0391, ADR-0382, `SITO.md` |
| Profilo: record personali, badge, il mio corpo, VO₂ max | `API.md` «Profile», ADR-0312, ADR-0318, `tasks/TASK-341.md`, `tasks/TASK-397.md` |
| Posizione del telefono e privacy | `tasks/TASK-363.md`, ADR-0306 |
| Il gioco delle forme, squadre e sfide | `GIOCO.md` |
| Concorsi e sfide del mese | `CONCORSI.md`, `tasks/TASK-343.md` |
| Corse di gruppo | `EVENTI.md`, `tasks/TASK-309.md` |
| Attività da altre app (GPX, TCX, FIT), post di sole foto | `IMPORTAZIONI.md`, `tasks/TASK-312.md` |
| Il «+» del Feed: le voci, l'ordine, chi vede che cosa | `tasks/TASK-481.md`, ADR-0390, ADR-0387, `IMPORTAZIONI.md` §2 |
| Il parapendio registrato in volo: lo sport «Record only», i numeri del volo nel link dal vivo | `tasks/TASK-305.md` «Le parti R», ADR-0375, ADR-0352, ADR-0319 |
| Il parapendio come strumento di volo: schermata di widget, vario sonoro, mappa 3D, spazi aerei da file, gare, punteggio XC, meteo | `tasks/TASK-479.md`, ADR-0388, ADR-0375 |
| Apple Salute, Health Connect | ADR-0281, `tasks/TASK-321.md` |
| Il punteggio del sonno MuW | `tasks/TASK-467.md` |
| «Alimentazione»: diario dei pasti, piano, bilancio delle calorie, tabella nel profilo | `tasks/TASK-489.md`, ADR-0397, ADR-0318, ADR-0281 |
| «Longevity»: le storie animate nella «Explore» di «Nutrition» | `tasks/TASK-513.md`, ADR-0407, ADR-0397 (precisazione 5) |
| La modalità «Nutrition»: la barra Today · Plan · Explore · Feed · Profile | `tasks/TASK-514.md`, ADR-0408, ADR-0357, ADR-0398 |
| Le email del server in produzione: quali partono, Resend, «Forgot password?» | `tasks/TASK-515.md`, ADR-0410, ADR-0261, ADR-0244, `DEPLOY.md` «Email di ritorno» |
| La modalità Allenamento: scelta la palestra, l'app diventa un'app per allenarsi (Today, Workouts, Food) | `tasks/TASK-490.md`, ADR-0398, ADR-0357, ADR-0341, ADR-0392 |
| Il Coach MuW: consigli dagli allenamenti fatti, regole e studi, la scheda che cambia con «Apply» | `tasks/TASK-491.md`, ADR-0399, ADR-0396, ADR-0398, ADR-0392 |
| La mappa dei decolli: i siti di volo da OpenStreetMap, la scheda del decollo con lo storico dei voli | `tasks/TASK-493.md`, ADR-0400, ADR-0388, ADR-0375, `tasks/TASK-479.md` |
| Le scadenze della vela: revisione, ripiegatura della riserva, controllo dell'imbrago, l'avviso | `tasks/TASK-494.md`, ADR-0401, ADR-0393, `tasks/TASK-486.md` |
| L'avvio dell'app: quanto codice gira prima del primo disegno, `metro.config.js` con `inlineRequires`, il motore all'apertura | `tasks/TASK-500.md`, ADR-0404, ADR-0248 |
| L'animazione all'avvio: intera la prima volta e dopo una versione nuova, corta e saltabile le altre | `tasks/TASK-505.md`, ADR-0405, ADR-0147 |
| Le schede, lo swipe, il tasto indietro, il gesto dal bordo, i fogli, le pagine sopra l'app | `tasks/TASK-470.md`, ADR-0384, `UI.md` «Le pagine e la barra di schede» |
| La live in chat e nel Feed, anche programmata (una gara) | `tasks/TASK-468.md`, ADR-0381, ADR-0352, `API.md` «Live shares» e «Messages» |
| «MuW Style» | `STYLE.md`, `tasks/TASK-384.md` |
| Percorsi in bici di MuW in «Explore» | `UI.md` «Pedalalo tu», ADR-0309 |
| Il catalogo di «Explore»: forme nuove, i mille disegni, la pagina | `../catalog/README.md`, ADR-0347, `tasks/TASK-418.md`, `tasks/TASK-419.md`, `tasks/TASK-420.md` |
| Il catalogo di «Explore» a 2000 disegni: parole corte per città, i disegni già fatti, l'ordine misto di «NEAR YOU» | `../catalog/README.md`, `tasks/TASK-441.md`, ADR-0347 e la precisazione C |
| Le parole del catalogo a penna alzata: `walks` nel seme, `gaps` nelle liste, la lista di quelle lette a occhio | `../catalog/README.md` («Le parole a penna alzata»), `tasks/TASK-441.md` (parte B1), ADR-0366 |
| Le uscite in bici del catalogo: `activity` nel seme e nelle risposte, il parametro `activity`, le zone da un estratto, le otto forme | `../catalog/README.md` («Le uscite in bici»), `tasks/TASK-441.md` (parte B2), ADR-0366 precisazione, `API.md` «`GET /recommended-routes`», `MAPS.md` «Le zone della bici» |
| Le forme candidate e quelle approvate: `candidate_outlines/`, `tools/draw_new_shapes.py` (`APPROVED`), `ZONE_SHAPES` | `tasks/TASK-418.md`, ADR-0346 e la precisazione B, ADR-0036 |
| Le forme nuove d'inverno, delle feste e di sport, i 35 contorni candidati: `tools/draw_theme_shapes.py`, la prova sulle strade, la registrazione di tutte insieme | `tasks/TASK-516.md`, ADR-0411, ADR-0346 e la precisazione B, `tasks/TASK-418.md` |
| Il catalogo guardato a occhio: la regola delle strade in più, il voto da 0 a 3, i 499 tolti, i 3120 nuovi, la classifica | `tasks/TASK-521.md`, ADR-0416, `../catalog/README.md` («La revisione e i 3000 disegni nuovi»), ADR-0347 |
| Aggiungere uno sport, il banco `tools/sport_bench/` | `sports/README.md`, `sports/COME-AGGIUNGERE.md`, `sports/CONDIVISO.md`, ADR-0320 |
| Uno sport in particolare (corsa, bici, canoa, hike, gravel, roller, gym, skimo, wheelchair, snowshoes) | `sports/<sport>.md` e il suo task file se aperto |
| L'alpinismo registrato senza percorso; uno sport sul server prima del contratto (`SERVER_FIRST`) | `tasks/TASK-463.md`, ADR-0373, ADR-0319, `sports/COME-AGGIUNGERE.md` |
| La carrozzina e il passeggino: la rete `wheel`, le sole forme di un'attività (`Activity.shapes`) | `sports/wheelchair.md`, `tasks/TASK-414.md`, ADR-0343 e la sua precisazione A |
| Nuoto in piscina: calorie, battito e zone | `tasks/TASK-409.md`, ADR-0318, ADR-0334 |
| Walk, nuoto in acque libere | `ROUTE_ENGINE.md` (le reti, §8), `tasks/TASK-371.md` |
| Sci: «Record only», stazioni, meteo | `MAPS.md` «Impianti e piste da sci», ADR-0319, ADR-0338, `tasks/TASK-375.md`, `tasks/TASK-406.md` |
| La modalità sci: scelto lo sci, l'app diventa un'app per lo sci (schede, giornata, mappa con legenda, stagione) | `tasks/TASK-429.md`, ADR-0357, ADR-0338, ADR-0319 |
| Apple Watch | `tasks/TASK-370.md`, ADR-0314 |
| Dati dal vivo in registrazione, «Share live activity» (link web a token) | `tasks/TASK-424.md`, ADR-0352, `API.md` «Live shares», `SITO.md` «La pagina dal vivo», `UI.md` «La corsa» («Share live») e «Calories» (le formule di ogni attività), ADR-0352 precisazione C |
| La corsa in registrazione: le tre pagine «Compass», «Map», «Data», la mappa che gira dove punta il telefono | `UI.md` «La navigazione», ADR-0350, ADR-0137, `tasks/TASK-422.md` |
| Il file della corsa e il suo diario (`current-run.journal`), la mappa e l'orologio quando nessuno li vede (tasca, app dietro) | `tasks/TASK-496.md`, ADR-0264 e la sua aggiunta, `UI.md` «La traccia della corsa» |
| La freccia di chi corre (anello e cono azzurri, punta dove punta la mappa su «Compass» e dove punta il telefono su «Map», TASK-519), i disegni delle tre schede, i token `you` e `north` | `UI.md` «La freccia di direzione» e «La corsa: tre pagine», ADR-0359, `tasks/TASK-431.md`, `tasks/TASK-519.md` |
| «Compass»: la riga con quanta strada e quanto tempo, la direzione scritta sotto la freccia del nord («NE · 42°») | `UI.md` «La corsa: tre pagine», ADR-0350 (aggiunta 2026-11-24), `tasks/TASK-518.md` |
| Le schede della palestra guidate: la guida in 5 passi, le settimane che cambiano, «My plans», l'app di prima che le legge | `sports/gym.md` «Le schede guidate», ADR-0360, ADR-0341, `API.md` «Gym», `tasks/TASK-433.md` |
| I giorni di corsa nella scheda della palestra, «Come funzionano le schede» al primo tocco di Palestra | `sports/gym.md` «Le schede guidate», ADR-0363, `tasks/TASK-433.md` (parti B e C) |
| Lo storico di un esercizio in palestra: «Last time», i campi già compilati, il suggerimento, «History» col massimale stimato | `tasks/TASK-483.md`, ADR-0392, `sports/gym.md`, ADR-0327 |
| La corsa su misura nelle schede della palestra: il ritmo sui 10 km e il lungo nella guida, i ritmi di ogni corsa, la proposta a fine ciclo dalle corse salvate | `sports/gym.md` «Le schede guidate», ADR-0369, `API.md` «Gym», `tasks/TASK-452.md` |
| La scheda che si adatta: «Come ti è sembrata la scheda?» a fine allenamento e a fine corsa, i passi in `adapt`, i segni ↑ = ↓ e l'interruttore in «My plans» | `sports/gym.md` «La scheda si adatta», ADR-0396, `API.md` «Gym», `tasks/TASK-488.md` |
| «Delete plan» in ogni passo della guida quando si modifica una scheda della palestra | `sports/gym.md` «Le schede guidate» («My plans»), `tasks/TASK-492.md` |
| La tabella del piano in «My plans», il prossimo allenamento e «This week: X of Y done», il piano di sola palestra, i segni degli sport nella guida | `sports/gym.md` «Le schede guidate», `tasks/TASK-506.md`, ADR-0371 (aggiunta 2026-11-23) |
| Il pianificatore completo: almeno due sport, il corpo libero, i giorni fuori (camminata, hike, bici, nuoto, canoa), i piani verso una distanza o una salita | `sports/gym.md` «Il pianificatore completo» e «L'ingresso e il corpo libero», ADR-0371, `API.md` «Gym», `tasks/TASK-461.md` |
| «Edit the drawing» su una traccia che finisce lontano dalla partenza: chiusa fino alla partenza, non corsa due volte; se si incrocia, un anello alla partenza; anche un percorso chiuso di «Explore» che si incrocia | `UI.md` «Edit the drawing: la figura sulla mappa», ADR-0353, ADR-0356 (e precisazione), ADR-0313, `tasks/TASK-425.md`, `tasks/TASK-428.md`, `tasks/TASK-432.md` |
| «Draw on the map»: la partenza, un pallino da spostare lungo il disegno | `UI.md` «Disegnare sulla mappa» («La partenza»), ADR-0354, ADR-0336, `tasks/TASK-426.md` |
| I percorsi di MuW nel Feed: spenti, l'interruttore per riaccenderli | `UI.md` «Feed», ADR-0358, ADR-0310, `tasks/TASK-430.md` |
| Il calendario di tutte le attività nel profilo e in «My activities», lo storico mese per mese | `UI.md` «Il calendario delle attività», `API.md` «Il calendario delle attività», ADR-0372, `tasks/TASK-462.md` |
| Lo stretching: la figura che respira e si gira, «Get ready», tick, «Skip»; routine, palestra, mattino, routine pubblicate | `tasks/TASK-466.md`, ADR-0378, ADR-0247, ADR-0147 |
| I segni a linea: il contorno delle forme nei riquadri (`ShapeGlyph`), le icone sotto i post, gli avvisi del percorso col triangolo e la «i» (`NoteRow`), le icone in `assets/ui/icons/` | `UI.md` (la griglia delle forme, «Feed», gli avvisi «in parole semplici»), `tasks/TASK-444.md` |
| Overpass in errore: una richiesta per job, la pausa di OSMnx, il secondo servizio | `tasks/TASK-471.md`, ADR-0385, `MAPS.md` «Overpass: come si scarica» |
| L'attrezzatura: scarpe, bici, sci, caschi… coi km, sul profilo, nel post, dai capi taggati | ADR-0393, `tasks/TASK-486.md` |
| I gruppi per uscire insieme («Groups»): ingresso, ruoli, la pagina, le uscite del gruppo anche senza percorso, Explore, la chat di gruppo | `GRUPPI.md`, `tasks/TASK-495.md`, ADR-0402, `EVENTI.md` |
| «Surprise me» in «Draw»: la pastiglia del passo 2, la scelta fra i percorsi del catalogo vicini, le forme di riserva, le sorprese venute male | `UI.md` (il passo 2 di «Draw»), ADR-0413, `tasks/TASK-448.md` |
| Il pannello degli sport (tre caselle per riga, famiglie) e la riga «Sport» di «Settings» che lo apre | `UI.md` «Lo sport» e «Settings», ADR-0420, ADR-0165, `tasks/TASK-512.md` |
| «Save & redo» a fine corsa: i metri di percorso mancati, dove ci si è fermati su un giro chiuso, «Draw» riaperto con forma, km e partenza | `UI.md` «La fine della corsa», ADR-0419 e la precisazione, `tasks/TASK-451.md` |
| I segni a linea, secondo giro: gli sport (Lucide e sette disegnati per MuW), palestra, profilo, lucchetto dei badge, meteo, gruppi, attrezzatura, righe di «Settings»; i premi restano emoji | `tasks/TASK-510.md`, `tasks/TASK-444.md` |
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
