# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.**
> Primo file da leggere in ogni sessione, ultimo da aggiornare a fine task.
> Se è disallineato dalla realtà, tutto il resto del sistema smette di
> funzionare: aggiornarlo non è burocrazia, è la parte che regge il metodo.

**Ultimo aggiornamento**: 2026-09-25 · **Fase corrente**: 4 — Estensione (scritte)

---

## In una riga

Fase 2 chiusa: il MVP gira dall'iPhone, con l'API sul PC. Si scrivono
forma e distanza, fino a 21 km, e il percorso compare sulla mappa: 3–10 km nelle zone in cache in 5–25 s, da 15 a 21 km in 30–50 s,
con l'attesa che dice cosa succede. Una zona nuova aggiunge il suo download
da Overpass, che da questo PC risponde solo a volte (`MAPS.md`). Il
percorso si esporta in GPX, e Garmin Connect lo apre. La forma si scrive
in un riquadro, in italiano o in inglese, fra quelle del catalogo:
cerchio, cuore, stella, cavallo, luna, gatto e pesce. Gatto e pesce hanno
tratti interni, fatti andata e ritorno (gli occhi). Quando la forma non va
attorno alla partenza, il motore cerca un posto fino a 2 km e l'app mostra
«Start here»: così gatto e pesce si disegnano anche a Levico. Le parole che
la tabella non conosce («stemma della Ferrari») le legge un modello aperto
in Ollama sul PC, che sceglie una forma del catalogo o nessuna; se è
nessuna, l'app propone le forme del catalogo da toccare. Se la forma non ci
sta per la distanza, l'app propone quella che ci sta («Try N km»).

## Prossimo passo

**TASK-050 — Lettere una per una** (`ROADMAP.md`, fase 4): fatto,
giudicato `sì` nelle tre zone. TASK-056, la parola nell'API: fatto
(ADR-0051). Per le scritte il seguito è **TASK-057**, il campo nell'app,
chiesto dall'utente. L'alfabeto dalla A alla Z (TASK-059, ADR-0056) è
fatto; il seguito è **TASK-067**, chiesto dall'utente: lettere unite anche
dalla cima, e una scala per lettera vicina a quella delle vicine
(ADR-0063, dopo TASK-063, che ha `optimizer.py`). Da TASK-071: lettere più
piccole si leggono peggio; le lettere squadrate sono in prova con
TASK-077, e dopo il giudizio l'utente decide se sostituiscono quelle di
oggi o diventano una scelta nell'app (un task a parte).
Per le indicazioni di svolta il seguito è
**TASK-049**: mostrarle e dirle nell'app, dopo il tema. Dopo TASK-050,
**TASK-053 — Nomi dei marciapiedi**: un marciapiede senza nome prende il
nome della strada accanto (a Milano 213 indicazioni su 264 sono «footway»).

**App: TASK-058 — Barra anche durante il download della zona e la
connessione all'API**, chiesto dall'utente dopo TASK-055; poi TASK-057, il
campo per le parole (dopo TASK-056 e TASK-049).

Dal 2026-09-24 più sessioni lavorano insieme, con le regole di
`CLAUDE.md` («Autonomia», «Merge», «Lavoro in parallelo»).

## In lavorazione

Niente per l'app.

- **Programmatore Lettere** — TASK-077: lettere squadrate, un secondo
  alfabeto (`letters_block.json`, `style="block"`) con la parola girata
  sulla griglia delle vie, al più 30° (ADR-0072). Lo stile di oggi non
  cambia. Campioni «CIAO», «BELLO», «MAX» e «HURRY» nelle tre zone, in
  attesa del giudizio dell'utente (pagina nel task file).

## Completato

- **Programmatore Lettere** — TASK-071: verificato che il ritorno di un
  tratto ripassato prende a volte un'altra via e disegna un anello,
  soprattutto a Milano («CIAO» 51% di strade doppie contro il 74% del
  disegno). Provato il ritorno sulle strade dell'andata: una linea sola, ma
  percorso più lungo e lettere più piccole (fino a −28%); per l'utente 4
  parole su 9 peggio, nessuna meglio. Il motore resta com'è (ADR-0067
  «Scartata», codice nel commit `0e8add6`). Proposta all'utente, da
  decidere: lettere squadrate come nello screenshot di Strava (task file).
- **Motore** — TASK-075: il cuore da 10 km di Caldonazzo non è peggiorato.
  Motore di ieri (`87304b0`) e di oggi (`709f4f5`) danno lo stesso percorso
  punto per punto su 9 partenze su 9, oggi in 16,9 s invece di 21,4 s.
  Cambia invece con la partenza: 25–100 m di GPS portano la somiglianza da
  0,73 a 0,92. Nessun codice cambiato; da decidere se il motore debba
  provare partenze vicine (task file). Giudizio: 5 `sì`, 3 `quasi`, 2 `no`
  su 10 cuori; l'utente ha scelto che il motore provi più partenze vicine e
  tenga la migliore: **TASK-076**.
- **Motore** — TASK-072: la forma ricavata da un'immagine. Da un PNG o
  JPEG con un soggetto chiaro su sfondo uniforme il motore ricava il
  contorno esterno con regole fisse (`image_outline.py`, ADR-0068) e la CLI
  ne fa un percorso (`--image`, `--save-outline`); sfondo non uniforme,
  più soggetti, soggetto sul bordo, piccolo o frastagliato sono rifiutati
  con il motivo. Campioni a 15 km a Trento e Milano: mela, pera e Italia
  `sì`, stella `quasi`/`sì`, gatto `no` (non si riconosceva già dal
  contorno). Il seguito è **TASK-073**: l'immagine nell'app e nell'API,
  con l'anteprima del contorno prima del percorso (task file).
- **App** — TASK-061: un marciapiede senza nome con accanto una via dice
  «Turn left onto the footpath beside Via Roma», sul banner e a voce
  (ADR-0058). `street` vince sempre; un'API senza `along` legge come prima.
- **Programmatore Lettere** — TASK-068: la testa di cane come contorno
  candidato (`dog_head`), vista di fronte con le orecchie che pendono, e
  occhi, naso e bocca ripassati (ADR-0065); provata dalla CLI a 15 km:
  somiglianza 0,97 a Trento, 0,95 a Levico, 0,99 a Milano. Giudizio
  dell'utente in attesa (pagina nel task file); decide se il cane entra nel
  catalogo con TASK-065, e se come testa o intero.
- **Indicazioni** — TASK-060: ogni indicazione dell'API ha `along`, la via
  lungo cui corre una strada senza nome, distinta da `street` (ADR-0057);
  opzionale in `shared-types`. Nomi solo dalla cache, mai da Overpass
  durante una richiesta. Cuore da 15 km di Trento: 118 → 57 indicazioni
  senza nome né via. Il seguito è TASK-061, `along` nella navigazione.
- **App** — TASK-069: la barra di una parola stima il calcolo dalle
  lettere, 20 s l'una (misure nel task file, ADR-0064): «CIAO» a 15 km
  pulsa dopo 160 s invece di 75 s. Le forme come prima.
- **Programmatore Lettere** — TASK-064: quattro animali candidati
  (farfalla, uccello, cane, lumaca) disegnati come contorni, con antenne,
  zampe, coda, spirale e corna ripassate (ADR-0060), provati dalla CLI a
  15 km. Giudizio dell'utente: tutti `sì` a Milano; farfalla `quasi` a
  Trento e Levico, uccello `quasi` a Levico, lumaca `sì` a Trento, il
  resto `no`. Quali entrano nel catalogo lo decide l'utente, con TASK-065.
- **App** — TASK-057: un interruttore «Shape | Word»; la parola si scrive
  nell'app, controllata prima (A–Z, al più 7 lettere, 3 km a lettera, con
  «Use N km»), parte come `word` ed è il nome del percorso (ADR-0053);
  provato sull'iPhone. Seguito possibile: una stima della barra per le
  parole (`progress.ts`).
- **Motore** — TASK-063: dove va il tempo sopra i 10 km (numeri nel task
  file) e corridoio da 1,3 a 4,5 volte più veloce a percorsi identici
  (ADR-0059): Trento da 15 a 21 km da 80–97 s a 35–64 s sul PC carico.
- **App** — TASK-066: una risposta senza `directions` (API precedente a
  TASK-048) è `bad_answer`, non un crash; la guardia accetta anche i
  percorsi di una parola (`shape: null`, `word`), pronta per TASK-057.
- **App** — TASK-058: la barra di caricamento anche sulla mappa che si
  carica e sotto la lettura dell'AI; pulsa quando un'attesa dura più del
  doppio del solito, anche con l'API che non risponde (ADR-0055); provato
  sull'iPhone.
- **Indicazioni** — TASK-062: `numpy` dichiarato fra le dipendenze del
  motore (`>=1.24,<3`, lo stesso limite basso di osmnx).
- **Indicazioni** — TASK-053: un marciapiede senza nome prende la via lungo
  cui corre, dedotta a parte (`sidewalks.alongs`, ADR-0054); i nomi delle
  vie escluse dal grafo in un file per zona. Cuori da 15 km, indicazioni
  senza nome né via: Milano 231 → 81, Trento 118 → 57, Levico 34 → 30.
  Nell'API c'è da TASK-060; nell'app non ancora.
- **App** — TASK-055: barra di caricamento gialla sotto la mappa, stimata
  per fasi (ADR-0050); provata sull'iPhone.
- **App** — TASK-054: partenza dal GPS o da un altro luogo anche con il
  GPS acceso, rotellina durante l'attesa, avvisi in parole semplici
  (ADR-0048); provato sull'iPhone. TASK-051: due schermate, prima cosa disegnare (tessere delle
  forme, distanza con − e +) poi la mappa; provato sull'iPhone.
- **Tema dell'app** — TASK-045: i token Sgrava
  (`apps/mobile/src/theme/tokens.ts`) e uno stile MapLibre scuro che li usa
  (`src/map/mapStyle.ts`), con i test che lo dicono ben formato (ADR-0046,
  `UI.md`, «Il tema»). TASK-046: l'app li usa, mappa scura e percorso
  giallo; provato sull'iPhone.
- **Fase 4 finora** — TASK-040: il contorno accetta `path`, una linea
  chiusa percorsa così com'è (ADR-0042); «CIAO» a tratto singolo, dalla
  CLI, `quasi` a Trento, Levico e Milano a 15 km. TASK-041: un `path`
  aperto si corre a sola andata (ADR-0043); per l'utente «CIAO» aperto è
  peggio del chiuso. TASK-047: indicazioni di svolta agli incroci nel
  motore (`directions.py`, ADR-0045), solo la funzione: su cuori da 15 km
  nessuna in mezzo a una strada; 180 a Trento, 75 a Levico, 264 a Milano,
  dove i marciapiedi senza nome le rendono difficili da leggere. TASK-048:
  le richieste in due tempi le restituiscono, con la partenza e le vicine
  segnate (`joined`, ADR-0047); l'app non le mostra ancora. TASK-050:
  le parole si compongono da un alfabeto a tratto singolo (C, I, A, O),
  con lettere più distanziate, un punto di passaggio ogni 1/16
  dell'altezza, ogni lettera spostata dove ha più strade e la I andata e
  ritorno sulla stessa strada (ADR-0044); «CIAO» dalla CLI (`--word`) è
  `sì` a Trento, Levico e Milano a 15 km, molto meglio di TASK-040.
  TASK-056: l'API accetta `word` al posto di `shape` e risponde con
  `"word": "CIAO"` e `"shape": null`; lettere dell'alfabeto, al più 8, e
  almeno 3 km per lettera, se no un `invalid_request` che dice perché
  (ADR-0051); `shared-types` ha le costanti per l'app. TASK-059: tutte le
  lettere dalla A alla Z, la E e la L col tratto basso staccato dalla base
  (ADR-0056); a 15 km «MAX» `sì` nelle tre zone, «BELLO» e «KIWI» `sì` a
  Milano, `quasi` a Levico, `no` a Trento.
- **Fase 3** — TASK-032: forme da un contorno in JSON, dalla CLI
  (`--outline`, ADR-0035). Cancello superato: stella sì ovunque, cavallo
  quasi a Trento e sì a Levico e Milano; la casa no, anche con camino e
  porta. TASK-033: catalogo di quattro forme (cerchio, cuore, stella,
  cavallo) e riquadro della forma che legge la parola in italiano o in
  inglese (ADR-0036); provato sull'iPhone. TASK-034: sei forme candidate
  (luna, pesce, freccia, albero, corona, gatto) si riconoscono solo a
  Milano, nessuna entra nel catalogo. TASK-035: nessuna misura di
  somiglianza separa i «no» dell'utente, la somiglianza resta com'è; conta
  l'orientamento (ADR-0037). TASK-036: le forme restano dritte entro 15°,
  tranne il cerchio; 7 casi su 15 migliorano, nessuno peggiora (ADR-0038).
  TASK-037: tratti interni ripassati nei contorni, con tolleranze dimezzate
  per le forme che li hanno (ADR-0039); a 15 km 4 casi su 12 migliorano,
  uno peggiora; gatto e pesce `sì` a Trento e Milano, Levico `no`.
  TASK-039: luna, gatto e pesce nel catalogo, scelti dall'utente; provati
  sull'iPhone. TASK-038: se la forma non va vicino, un posto fino a 2 km
  e «Start here» nell'app (ADR-0040); a Levico gatto e pesce `sì` a 1 km;
  provato sull'iPhone. TASK-030: le parole che la tabella non conosce le
  legge qwen3:4b in Ollama sul PC (ADR-0012): 94% sulle parole nuove,
  circa 5 s a parola; sull'iPhone vanno le parole semplici, non «stemma
  della ferrari» né «spirit» (`AI.md`, «Limiti»). TASK-031: con
  «nessuna forma» l'app offre le forme del catalogo come pulsanti, provato
  sull'iPhone; se la forma non ci sta per la distanza, l'API suggerisce
  quella che ci sta e l'app mostra «Try N km» (ADR-0041), un caso raro:
  sull'iPhone non è mai uscito.
- **Fase 2 — App e API** (TASK-020–026): monorepo npm con app Expo e
  `shared-types` (ADR-0028); mappa MapLibre GL JS in WebView con posizione
  GPS e ricerca del luogo (ADR-0029); API FastAPI con grafi di zona in
  memoria (ADR-0030); app che chiede i percorsi, li disegna e spiega ogni
  errore (ADR-0031); richieste in due tempi con stati, per 15 km e zone
  nuove (ADR-0032); export GPX con attribuzione OSM, aperto in Garmin
  Connect (ADR-0033); distanza scritta in km, fino a 21 km, scelta con le
  misure di 21 e 30 km a Trento (ADR-0034). Tutto provato sull'iPhone.
- **Fase 1 — Route engine** (TASK-010–019): CLI e GPX; forme circle e
  heart; snapping su OSMnx con zone e corridoio (ADR-0022); ottimizzatore
  che ruota, scala e sposta la partenza fino a 500 m (ADR-0023, ADR-0025);
  validazione con ripercorso e percorribilità (ADR-0026); anteprima dei
  campioni su mappa (ADR-0024). Cancello superato con la valle sospesa
  (ADR-0027).
- **TASK-001** — Repository pubblico, `main` protetto da PR obbligatoria.

## Bloccato

Niente.

## Note per la prossima sessione

- Navigazione col GPS (TASK-049): da provare sull'iPhone camminando un
  percorso vero; dopo il merge serve `npm install` dalla radice
  (`expo-speech`).
- Ollama 0.34.4 è installato in `D:\Ollama` e parte con Windows; i
  modelli stanno in `D:\Ollama\models` (variabile `OLLAMA_MODELS`
  dell'account). C'è solo `qwen3:4b`: i due scartati e l'installer sono
  già tolti. L'ambiente dell'API ha anche `services\ai` installato.
- Precaricamento del modello (TASK-052): da misurare con il PC scarico,
  riga «AI model loaded in … s» nel log dell'API.
- In sospeso, dall'AI (`AI.md`): precaricare il modello all'avvio
  dell'API (prima parola da 40–49 s a circa 5 s, 3,2 GB di RAM da subito).
- Su questo PC il route-engine usa l'ambiente dell'API: non c'è
  `services/route-engine/.venv` (`SETUP.md`, passo 10.2).
- In cache ci sono i grafi `foot` di zona di trento, levico, valsugana e
  milano (ADR-0023), più le zone di Trento da 21 e 30 km (TASK-026) e
  quelle di Levico e Milano larghe 12,7 km (casa da 15 km, TASK-032), e
  una zona di Levico larga 15 km (TASK-038, per cercare il posto a 2 km):
  tutti i casi girano offline. Da questo PC un indirizzo di
  `overpass-api.de` non risponde: prima di scaricare, leggere `MAPS.md`,
  "Overpass: come si scarica".
- Per generare campioni senza salvare ritagli in `data/cache/`: uno script
  usa-e-getta che chiama `plan_shape` con `ZoneGraphs` dell'API, come in
  TASK-032. La CLI invece salva un ritaglio per ogni caso.
- Per giudicare le forme senza mappa basta un PNG scritto con la libreria
  standard (`zlib`, `struct`), come `out/TASK-037-before-after.png`: niente
  matplotlib né PIL.
- Il 50% di `STROKE_DETAIL` (ADR-0039) è un primo valore; l'albero con
  fusto e sei rami è troppo fitto per 15 km.
- Per misurare sui casi di riferimento (in `services/route-engine/`, con
  `..\api\.venv\Scripts\python.exe`): `tests/measure_optimizer.py`
  (ottimizzatore, `--no-optimize` per TASK-017) e
  `tests/measure_snapping.py` (solo snapping).
- Fuori scope di TASK-016, annotati: tag `surface`, `sac_scale` e
  `sidewalk` (serve riscaricare i grafi), ed evitare scale e strade
  principali nella ricerca (oggi si misurano e si avvisa soltanto).
- Dopo TASK-063, sopra i 30 s restano la seconda ricerca fino a 2 km
  (ADR-0040), che a Trento corre quasi sempre, e il ritaglio della zona
  nell'API (6–13 s a Milano): proposte in `tasks/TASK-063.md`, da decidere.
- Motore lento sulle distanze lunghe: 30–50 s da 15 a 30 km, più il
  download di una zona nuova (TASK-023, TASK-026; `API.md`, «Tempi»). Le
  richieste in due tempi lo rendono sopportabile, non veloce: `PRODUCT.md`
  chiede al massimo 30 s.
- In sospeso, piccolo: più avanti, far scegliere all'utente fra più
  percorsi alternativi (la ricerca li ha già).
- La Valsugana è sospesa su richiesta dell'utente: cuore e cerchio da 5 km
  lì non sono disponibili (ADR-0025, ADR-0027).
- matplotlib non è una dipendenza: per guardare le forme basta uno script
  usa-e-getta fuori dal repository.
- Con latitudine negativa serve la forma `--start=-33.9,18.4`: argparse
  scambia `-33.9,...` per un'opzione.
- App: dalla radice `npm install`, poi `npm run mobile` e il QR con la
  Fotocamera dell'iPhone (`SETUP.md`, passo 9). In PowerShell di questo PC
  si scrive `npm.cmd` al posto di `npm` (script bloccati). Sull'iPhone
  Expo Go vuole l'accesso con lo stesso account Expo sul PC e sul telefono
  (già fatto); il permesso di posizione è di Expo Go (`SETUP.md`, 9.4).
- API: dalla radice `services\api\.venv\Scripts\python.exe -m
  shaperoute_api --lan` (`SETUP.md`, passo 10); risponde anche su `/docs`.
- Il disco C: di questo PC ha poco spazio (5,5 GB liberi il 2026-09-23,
  dopo la pulizia: tolti MATLAB, i ritagli in `data/cache/` e la venv del
  route-engine). Ogni zona nuova scaricata vale circa 40 MB, più le
  risposte di Overpass in `data/cache/http/`; Expo si ferma con `ENOSPC`
  quando finisce lo spazio. La CLI salva un ritaglio per ogni partenza o
  distanza nuova dentro una zona in cache: si possono togliere a mano. Il
  disco D: ha più di 270 GB liberi.
- Le partenze delle tre zone sono in `docs/TESTING.md`.
- Nell'app la partenza è la posizione GPS o un luogo cercato (`UI.md`);
  le zone fisse servono solo a confrontare le prove.
- Il MVP non rispetta ancora il tempo di `PRODUCT.md` (≤ 30 s) sopra i
  10 km e con le zone nuove: è il motore lento annotato sopra.
- Il repository è pubblico: nessun segreto nei file, mai. Le chiavi stanno
  solo in `.env`, che non entra nel repository.
- Più sessioni lavorano insieme, ognuna nel suo worktree: l'app in
  `D:\shaperoute-app`, con i suoi `node_modules` (`npm ci --cache
  D:/npm-cache`: il 2026-09-24 C: aveva 2,8 GB liberi). Il primo `jest` a
  freddo può superare i 5 s di un test e fallire; al secondo giro è verde.

---

## Come si aggiorna

A fine task, in un solo commit dentro la stessa PR:

1. Sposta il task da **In lavorazione** a **Completato**, con una riga di
   esito: cosa funziona adesso che prima non funzionava.
2. Riscrivi **Prossimo passo** con un solo task.
3. Aggiorna **In una riga**.
4. Svuota o aggiorna **Note per la prossima sessione**.

Tenere breve questo file è parte del lavoro: è quello che si paga in ogni
sessione. Lo storico sta nei commit e nelle PR, non qui. Se **Completato**
supera una decina di righe, si condensa per fase.
