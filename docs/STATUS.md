# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.**
> Primo file da leggere in ogni sessione, ultimo da aggiornare a fine task.
> Se è disallineato dalla realtà, tutto il resto del sistema smette di
> funzionare: aggiornarlo non è burocrazia, è la parte che regge il metodo.

**Ultimo aggiornamento**: 2026-10-01 · **Fase corrente**: 4 — Estensione

---

## In una riga

Il MVP gira dall'iPhone in Expo Go, con l'API sul Mac raggiungibile anche
da fuori casa (Tailscale). Si sceglie una forma del catalogo (cerchio,
cuore, stella, cavallo, luna, gatto, pesce, farfalla, lumaca, testa di
cane, testa di coniglio), una parola dalla A alla Z, tonda o squadrata, o
una foto, e una distanza fino a 21 km. Il percorso compare sulla mappa,
fino a tre fra cui scegliere; si esporta in GPX (Garmin Connect lo apre),
si corre con la navigazione a voce o con Strava («Run with Strava»), e a
fine corsa ha un punteggio. Le parole che la tabella non conosce le legge
un modello aperto in Ollama; se la forma non va attorno alla partenza il
motore cerca un posto fino a 2 km («Start here»), se non ci sta per la
distanza l'app propone «Try N km». **«Explore»** propone percorsi in ogni
città: città in evidenza e suggerite mentre si scrive, 13 categorie,
percorsi a tema che passano dai luoghi veri. L'API registra le ricerche,
senza dati personali, e ne ricava sinonimi e correzioni da applicare a mano
(`INSIGHTS.md`). Tempi: 3–10 km nelle zone in cache in 5–25 s, da 15 a
21 km in 30–50 s. Una zona nuova si scarica da Overpass dal Mac
(ADR-0100), che dopo molti download smette di rispondere per qualche ora
(`MAPS.md`).

## Prossimo passo

**TASK-110 — Le scelte della parte social** (`ROADMAP.md`, «La parte
social»): account, dati, hosting e privacy. Non è codice, sono domande per
l'utente; branch `docs/TASK-110-social-decisions`, sessione «Decide
TASK-110», ancora senza commit. Il punteggio è fatto (TASK-111, 112, 113);
dopo TASK-110 vengono TASK-114 (database e account), poi 115 (iscriversi)
e 122 (API e database sempre accesi), poi 116–121. Tutti Todo.

In coda, dopo o accanto:

- **TASK-092 — Percorsi consigliati** (ADR-0086, scelta dell'utente del
  2026-10-01): tutti i percorsi generati si salvano, i migliori si
  consigliano agli utenti e si usano sui social. Todo, dopo il database
  (TASK-114) e l'API sempre accesa (TASK-122); intanto «Explore» legge il
  catalogo nei file (ADR-0098).
- **TASK-067 — Lettere unite dall'alto, scala per lettera** (ADR-0063),
  chiesto dall'utente: in coda, da rivedere, senza task file. Da TASK-071
  e TASK-077: lettere più piccole si leggono peggio.
- **Seguiti possibili, da approvare**, scritti nei task fatti: i segnali
  dell'app per le ricerche che insegnano (percorso scelto fra A·B·C, «Try
  N km») e le città e frasi desiderate lette da TASK-128 (TASK-130);
  l'import in Strava con un account vero (TASK-135); riparare un GraphML
  già rotto e la dimensione della cache, 36 GB sul Mac (TASK-133).
- **Da provare sull'iPhone**: la navigazione col GPS camminando un
  percorso vero (TASK-049), il punteggio a fine corsa (TASK-112 e 113),
  «Explore» (TASK-126 e 134).

Dal 2026-09-24 più sessioni lavorano insieme, con le regole di
`CLAUDE.md` («Autonomia», «Merge», «Lavoro in parallelo»).

## In lavorazione

Un task per riga, con branch e sessione: i suoi file sono suoi.

- **TASK-088 — Zucca e albero di Natale nel catalogo**
  (`feat/TASK-088-seasonal-catalog`, PR #112, sessione «Add pumpkin and
  Christmas tree to the shape catalogue»): task file Done, aspetta il
  merge.
- **TASK-128 — Il seme del catalogo in altre città**
  (`feat/TASK-128-seed-catalog-more`, sessione «Task progression senza
  blocchi»): il nuovo giro dei percorsi consigliati aspetta che Overpass
  risponda dal Mac. Senza PR né task file.
- **TASK-132 — Un annuncio prima del percorso** (`feat/TASK-132-route-ads`,
  PR #130, sessione «Sistema pubblicitario non invasivo»): un interstitial
  AdMob prima del percorso pronto. In corso.
- **TASK-136 — La CLI non salva più i ritagli dei grafi**
  (`fix/TASK-136-no-saved-crops`, PR #137, sessione «Miglioramento
  generale»): task file Done, aspetta il merge.
- **TASK-137 — Le zone delle città in evidenza, scaricate prima**
  (`docs/TASK-137-featured-zones`, PR #136 col task file, sessione
  «Potenziamento sezione Explore»): Todo; il lavoro andrà in
  `feat/TASK-137-featured-zones`.
- **TASK-138 — «Explore»: suggerimenti di città e luoghi mentre si
  scrive** (`feat/TASK-138-place-suggestions`, PR #139, sessione
  «Suggerimenti città in Explore»): task file Done, aspetta il merge.
- **TASK-140 — Anche le altre forme senza «baffi»**
  (`feat/TASK-140-whiskers-other-shapes`, sessione del worktree
  `goofy-ishizaka-82df04`): modifiche al motore non ancora committate;
  senza PR né task file.

## Completato

- **Documentazione** — TASK-141: `STATUS.md` allineato ai task file e
  alle PR del 2026-10-01 (prossimo passo, task in lavorazione, In una
  riga).
- **Motore** — TASK-139: anche cerchio e stella evitano i pezzi fatti
  avanti e indietro (ADR-0109), con lo stesso peso del cuore. Il cerchio
  non cambia sulle 7 prove; 3 stelle su 7 cambiano, 2 giudicate meglio.
  Provato sull'iPhone (2026-10-01): funziona.
- **API** — TASK-130: le ricerche che insegnano (ADR-0101,
  `docs/INSIGHTS.md`). L'API registra ogni ricerca e ogni segnale d'uso in
  `data/insights/` (acceso di default, senza dati personali); `python -m
  shaperoute_api.insights` propone sinonimi, correzioni dei refusi, città e
  frasi per il catalogo, con le prove e i controlli superati (`explain`).
  Si impara solo da giorni o luoghi diversi (il modello risponde sempre
  uguale) e mai se l'AI e l'ortografia non concordano. Si applica solo a
  mano, validato (`validate`, anche in CI), versionato, reversibile;
  `impact` dice se una versione ha aiutato, solo con eventi sufficienti.
  Provato dal vivo: «rmantico» a Bologna e Torino → correzione → a Milano
  letto dal vocabolario, senza AI (1,0 s → 0 ms). Seguiti possibili, da
  approvare: i segnali dell'app (percorso scelto fra A·B·C, «Try N km»),
  e TASK-128 che legge città e frasi desiderate.

- **Motore** — TASK-131: un cuore più bello a occhio, provato
  sull'iPhone (2026-10-01). Il cuore evita i pezzi fatti avanti e indietro
  (ADR-0107); la forma ideale resta quella di oggi, preferita dall'utente.
  Il seguito, lo stesso peso per cerchio e stella, è TASK-139.
- **App e API** — TASK-134: «Explore»: città → categoria → percorso
  (ADR-0105): città in evidenza e recenti, suggerimenti mentre si scrive,
  13 categorie da toccare. In `main` (PR #135), da provare sull'iPhone
  (task file «In revisione»). Delle 14 città in evidenza solo New York,
  Roma, Milano e Torino hanno la zona in cache sul Mac: è TASK-137.
- **App** — TASK-135: «Run with Strava» in ogni scheda di percorso, il
  flusso ufficiale (ADR-0106): salvare il GPX, importarlo nel route builder
  di Strava, seguirlo dall'app Strava. Strava non permette di creare
  percorsi via API. L'import va provato con un account vero.
- **Motore** — TASK-133 (miglioramento generale scelto dall'agente): i
  file della cache delle zone si scrivono interi o non si scrivono
  (ADR-0104). Un'API o uno script fermati a metà scrittura non lasciano più
  un GraphML, un pickle o un file di vie con nome rotti, che facevano
  fallire ogni percorso della zona finché non si cancellavano a mano; un
  pickle che non si legge cede al GraphML. Stessi percorsi, stessi tempi.
- **API e app** — TASK-129: «Explore» per ogni città e percorsi a tema
  (ADR-0099): «Search a city» e «Ask for a route», una forma che passa dai
  luoghi veri di un tema. Provato a Torino, Bologna, Milano, Roma e New
  York; Parigi e Tokyo quando Overpass riapre. In `main` (PR #126; task
  file «In revisione»).
- **Motore** — TASK-127: Overpass dall'indirizzo che risponde (ADR-0100);
  le zone nuove si scaricano dal Mac. Dopo una serie di download Overpass
  smette comunque di rispondere per qualche ora (MAPS.md).
- **Motore, API e app** — TASK-093: fino a tre percorsi fra cui scegliere
  (ADR-0087). Sotto la mappa le tessere «A · B · C» con km e somiglianza,
  gli altri percorsi grigi sulla mappa; GPX, «Start» e avvisi del percorso
  scelto. Anche per le immagini. Il percorso scelto dal motore resta lo
  stesso (le 8 richieste dall'iPhone del 2026-10-01 rifatte uguali); dopo
  un piano già buono le partenze vicine si aspettano al più 3 s. Provato
  sull'iPhone (2026-10-01): funziona. L'utente: «il cuore ad occhio
  saprei farlo un po' meglio» (da proporre come task sul motore).
- **API e app** — TASK-126: «Explore» (ADR-0098): `GET
  /recommended-routes` dai file del catalogo e la terza schermata
  dell'app. In `main` (PR #124), da provare sull'iPhone (task file «In
  corso»).
- **Catalogo** — TASK-125: il seme dei percorsi consigliati, 137 in 6
  città (Trento, Levico, Milano, Roma, Torino, Bologna), guardati a occhio
  (ADR-0097). Lo script ha già le frasi di ogni città e New York: si
  generano con un nuovo giro, insieme a Firenze, Napoli, Verona, Padova,
  Genova, Bari e Palermo, quando Overpass risponde da questo Mac.
- **API** — TASK-124: il log di accesso dell'API non scrive più le query
  string, quindi niente posizione né testo di `GET /places` (ADR-0096);
  provato sull'API del Mac, che gira con `--request-log`.
- **API e app** — TASK-123: i luoghi della partenza da Geoapify attraverso
  l'API (`GET /places`, ADR-0095), con cache; l'app torna a Photon senza
  API o senza chiave. Serve `GEOAPIFY_API_KEY` sull'API (`DEPLOY.md`, «La
  ricerca dei luoghi»), in `.env` sul Mac. Provato sull'iPhone (2026-10-01):
  0,4–1,2 s invece dei 2–4 s di Photon.
- **API e app** — TASK-113 (prova sull'iPhone non riportata, vale anche
  per TASK-112): a fine corsa l'app mostra
  la corsa sopra il percorso e il punteggio da 0 a 100, chiesto a `POST
  /track-scores` (ADR-0093). Senza rete la corsa resta sul telefono e il
  punteggio si richiede dopo. Il seguito della parte social è **TASK-110**,
  le scelte dell'utente su account e dati.
- **Motore** — TASK-091: il log dell'API non scrive più le coordinate
  della partenza né delle partenze vicine provate (ADR-0092); resta
  «start N: score…, approach … m». Il nome del file della zona in cache
  (un riquadro di chilometri) c'è ancora.
- **App** — TASK-112 (prova sull'iPhone da fare con TASK-113): durante la
  navigazione l'app registra la traccia della corsa e la tiene in un file
  sul telefono, anche se l'app si chiude (`trackRecorder.ts`,
  `trackStore.ts`, ADR-0091). Sullo schermo non cambia niente: la usa
  **TASK-113**, che deve anche salvare la somiglianza del percorso e
  chiedere «riprendi o scarta» alla riapertura.

- **Motore, API e app** — TASK-084: più soggetti in una foto, fino a 4,
  in una linea sola (ADR-0079). Il più grande è il contorno, gli altri
  sono appesi con un trattino nel punto più vicino, fatto andata e
  ritorno; con più di 4 la foto è rifiutata («more than 4 separate
  things»). I dettagli a mano passano da 50 punti a 200 punti percorsi
  (circa 100 andata e ritorno). Campioni a 12 km: Milano «sì», Levico
  «quasi». Provato sull'iPhone dall'utente (2026-09-30): funziona.
- **API** — TASK-090: il registro delle richieste (ADR-0085). Con
  `--request-log` l'API scrive ogni richiesta di percorso, partenza
  compresa, in `data/requests/requests.jsonl`; `python -m
  shaperoute_api.replay` la rifà e dice se il percorso è lo stesso punto
  per punto. **Spento per default**: accenderlo sempre sul Mac è una scelta
  dell'utente. Non si vede nell'app. Provato: cuore 10 km a Caldonazzo e
  «CIAO» a Levico, rifatti identici (467 e 626 punti).
- **Motore** — TASK-111: il punteggio di una traccia corsa, da 0 a 100
  (`track_score.py`, ADR-0090): la somiglianza del percorso per la fedeltà
  della corsa al percorso, entro 40 m. Dalla CLI con `--score-track
  corsa.gpx`. Il seguito è **TASK-112** (registrare la traccia nell'app),
  poi TASK-113.

- **API e motore** — TASK-087: il ritaglio della zona più veloce, a
  percorsi identici (ADR-0082, la proposta 2 di TASK-063). A Milano, con
  la zona in memoria, da 2–6 s a 0,3–1 s a richiesta su questo Mac; stessi
  percorsi punto per punto su 12 casi (Milano e Levico a 10, 15 e
  21 km; a Levico il ritaglio pesava già meno di mezzo secondo).
  L'API va riavviata dopo il merge per prenderlo.
- **App** — TASK-089: un suggerimento toccato riempie il campo, chiude la
  tastiera e non fa ripartire la ricerca; i suggerimenti arrivano anche
  mentre si continua a scrivere, pausa 300 ms (ADR-0083). Photon resta a
  2–3 s a risposta. Provato sull'iPhone (2026-09-30).
- **App** — TASK-086: pulsanti più visibili, bordo e fondo dei comandi
  schiariti nei token (ADR-0081). Provato sull'iPhone (2026-09-30).
- **App** — TASK-085: i luoghi della partenza suggeriti mentre si scrive,
  da 3 lettere, prima quelli vicini alla posizione (ADR-0080). Provato
  sull'iPhone (2026-09-30).
- **App e motore** — TASK-079: modificare il contorno di un'immagine
  (ADR-0074). «Edit the outline» apre una lavagna a tutto schermo con zoom:
  «Add a part» unisce una forma alla sagoma, «Add a detail» aggiunge un
  tratto fatto andata e ritorno, «Undo» toglie l'ultima modifica. Si
  disegna dove si vuole: ciò che non tocca la linea è collegato alla linea
  più vicina, e le linee possono incrociarsi. `POST /image-outline-edits`,
  `strokes` in `/image-route-jobs`. Provato sull'iPhone dall'utente
  (2026-09-30): funziona. Il seguito è **TASK-084**: più soggetti in una
  foto, fino a 4, collegati in una linea sola.
- **App** — TASK-083: l'app su Expo con EAS Update (ADR-0078). Si apre
  in Expo Go sull'iPhone senza `npm run mobile` acceso; l'API serve
  sempre (Mac + Tailscale). Si ripubblica dopo ogni modifica dell'app
  (`DEPLOY.md` A.6). Provata dall'utente (2026-09-28): funziona.
- **App** — TASK-080: le lettere di una parola «Round» o «Square»,
  scelte nell'app sotto il campo della parola; `style` in `RouteRequest`,
  API e `shared-types` (ADR-0075). Provato sull'iPhone (2026-09-28).
- **App** — TASK-070: modalità tasca (ADR-0066). «Pocket» durante la
  navigazione: schermo nero e acceso, luminosità al minimo, tocchi
  ignorati, si esce tenendo premuto 2 s; voce e GPS come prima. Provata
  sull'iPhone dall'utente (2026-09-28): funziona.
- **App** — TASK-074: «Off the route» solo dopo 3 posizioni di fila oltre
  40 m, per almeno 8 s; una posizione con errore oltre 40 m non conta;
  «Back on the route» dopo 2 posizioni sul percorso (ADR-0070). Il
  marciapiede opposto e il GPS che sbaglia per qualche secondo non danno
  più l'avviso; una via parallela sbagliata sì, 8–10 s dopo.
- **Riparatore** — TASK-082: le direzioni col trattino («north-east»,
  «south-west») nell'avviso della partenza spostata ora si traducono come
  «north»; test per le otto direzioni del motore. Un avviso che l'app non
  conosce arriva con la prima lettera maiuscola (ADR-0077).
- **Motore** — TASK-076 (PR aperta, merge del coordinatore): il motore
  prova il cuore anche da 3 nodi a 25–100 m, in parallelo, e tiene il
  migliore; il percorso parte comunque dall'utente, con l'avvicinamento nei
  km e nel GPX (`nearby_starts.py`, ADR-0071, CLI `--nearby 3`). Trento
  10 km 0,86 → 0,88; Caldonazzo, Trento 15 km e Milano uguali. Vince il
  cuore migliore anche se la ricerca sposta la partenza (scelta
  dell'utente). Più 3–15 s; niente vicine su grafi oltre 30 000 nodi o
  senza memoria libera. Nell'API per forme e parole (`plan_request`).
  Caldonazzo: stesso motore di ieri; il cuore cambia con la posizione del
  GPS (0,73–0,98 entro 100 m). Il testo inglese grezzo di uno screenshot è
  un bug dell'app: TASK-082.
- **Programmatore Lettere** — TASK-078: tre forme candidate come contorni,
  sagoma nel contorno e dettagli ripassati (ADR-0073): testa di coniglio
  (`rabbit_head`), zucca di Halloween (`pumpkin`), albero di Natale con la
  stella (`christmas_tree`); provate dalla CLI a 15 km: somiglianza
  0,97 · 0,88 · 0,97, 0,92 · 0,83 · 1,00 e 0,93 · 0,81 · 1,00 (Trento,
  Levico, Milano). Giudizio dell'utente: tutte e tre `sì` a Milano;
  coniglio `sì` a Trento e `quasi` a Levico, zucca `no` a Trento e `quasi`
  a Levico, albero `quasi` a Trento e `no` a Levico. Quali entrano nel catalogo lo decide l'utente, con
  TASK-065 o dopo.
- **Programmatore Lettere** — TASK-077: lettere squadrate, un secondo
  stile delle parole nel motore (`letters_block.json`, `style="block"`,
  ADR-0072): tratti dritti o a 45°, lettere larghe e vicine, la parola
  girata sulla griglia delle vie al più di 30°. Lo stile di oggi resta il
  predefinito, identico. Giudizio: CIAO sì · quasi · sì, MAX no · quasi ·
  sì, BELLO quasi · no · no, HURRY no (Trento · Levico · Milano): bene le
  parole corte con lettere grandi su una griglia regolare. L'utente vuole
  **tutti e due gli stili, da scegliere nell'app**: task da assegnare.
- **Interfaccia Grafica** — TASK-073: l'immagine nell'app e nell'API
  (ADR-0069). «Image» accanto a Shape e Word, foto dalla libreria o dalla
  fotocamera, anteprima del contorno prima del percorso, motivo del rifiuto
  in parole semplici. Provato sull'iPhone dall'utente (2026-09-26): «sì,
  funziona tutto».
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
- Far scegliere all'utente fra più percorsi alternativi: è TASK-093.
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
