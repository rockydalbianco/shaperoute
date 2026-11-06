# TASK-314 — La strada per tornare sul percorso, sulle vie

**Stato**: Done — parte A in `main` (#588, `f381b7f5`), parte B chiusa
nella sua PR, entra col merge del Coordinatore
**Fase**: 4 · **Branch**: `feat/TASK-314-a-way-back` (A, mergiato), poi
`feat/TASK-314-b-way-back-run` (B)
**ADR**: ADR-0274 (seguito di ADR-0263) · A: motore, API, motore sul
telefono · B: schermo di corsa, testi nuovi da approvare dall'utente

## Obiettivo

Chi esce dal percorso riceve la strada per tornarci **sulle vie**, come il
ricalcolo di Google Maps: disegnata sulla mappa e detta svolta per svolta.
Oggi (TASK-303) ha solo una linea a puntini in linea d'aria, «120 m NE».
Quella linea resta, ma solo quando la strada non si può calcolare.

## Contesto

Richiesta dell'utente del 2026-10-27: «Se esci dal percorso ti deve dare
le indicazioni per tornare sul percorso, tipo il ricalcolo di Google
maps». ADR-0263, punto 3, l'aveva lasciata come seguito: «Nessun calcolo
di strade: sarebbe un seguito, col motore».

Numero, ADR e condizioni dal Coordinatore (2026-10-27):

- A e B sono parti dello stesso task, in contesti separati. A può partire
  subito; B entra dopo la #567 (TASK-304) e dopo A.
- `app.py` (la riga del router) la tocca anche la #581: chi entra dopo
  si riallinea. `engine.zip` si rigenera da `main` al merge.
- **Impronta del motore**: `way_back.py` non cambia la ricerca dei
  percorsi, quindi l'impronta che decide gli esempi tenuti (`route_store`,
  `draw_examples`) non deve cambiare.
- **Server vecchio**: l'app nuova con il server di oggi (404 su
  `/way-back`) e senza zona sul telefono mostra i puntini come adesso,
  senza errori, con un test. `main` resta pubblicabile su `preview`.
- **Frequenza**: dal telefono al massimo una richiesta ogni N secondi
  mentre si è fuori; sul server un limite per chi chiede e per IP. La
  strada calcolata si tiene finché ci si sta sopra.
- **Voce (B)**: le frasi delle svolte che esistono già, mai sopra le
  svolte del percorso (TASK-302, TASK-303); un ricalcolo con il suo
  limite. Testi nuovi con il sì dell'utente.
- Il motore resta puro, eseguibile senza rete. L'impronta iOS `83793e26`
  non cambia. Il server si aggiorna dopo Apple e con il sì dell'utente.

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0263 (rientro e punto di rientro), ADR-0052
  (navigazione), ADR-0117 (`/route-directions`), ADR-0177 (motore sul
  telefono), ADR-0167 (bici a mano, `step_cost`)
- `docs/API.md`, `POST /route-directions`
- `services/api/shaperoute_api/line_directions.py`, `on_phone.py`
- `apps/mobile/src/navigation/rejoin.ts`, `navigator.ts` (solo B)

## Parte A — motore, API, motore sul telefono

1. **`route_engine/way_back.py`** (nuovo), `way_back(graph, here, ahead)`:
   - `ahead` è il tratto del percorso dove si può rientrare, in ordine.
     L'app lo taglia con `rejoinAheadM` (ADR-0263, punto 2) e con un tetto.
   - **Partenza**: il punto della strada più vicina al runner, non il
     nodo più vicino. A metà isolato si va avanti, non indietro
     all'incrocio. Da lì valgono i due capi della strada, ognuno con il
     suo pezzo di strada; in bici solo quelli percorribili (sensi unici).
   - **Arrivo**: il nodo di `ahead` più vicino **per strada** (Dijkstra con
     `step_cost`: la bici a mano costa di più, come `pen_up`); a parità,
     il primo lungo il percorso. Per costruzione la strada non corre sul
     percorso: il primo nodo del percorso che tocca è già un arrivo.
     Oltre `MAX_WAY_M` non c'è strada per tornare, e nemmeno a più di
     `MAX_OFF_ROAD_M` da ogni strada; i metri fino alla strada contano
     nel tetto.
   - **Accanto al percorso**: se la via più vicina al runner è già un
     pezzo del tratto, la strada è fino a quella via, senza indicazioni.
   - **Fuori**: i punti dal runner lungo le geometrie delle vie, la
     lunghezza, il punto di rientro, dove cade lungo `ahead` (`rejoin_m`)
     e le indicazioni. `guidance` gira sui nodi della strada più quelli del
     percorso dopo il rientro, così l'ultima indicazione dice da che parte
     prendere il percorso. Le distanze si misurano dal runner.
   - Nessuna strada (il tratto non è su questa mappa, niente entro
     `MAX_WAY_M`): `NoWayBackError`, un `InvalidRequestError`.
2. **L'impronta**: `route_store.engine_fingerprint` lascia fuori
   `way_back.py`. Un test controlla che nessun modulo del motore lo
   importi: se un giorno la ricerca dei percorsi lo usasse, il test cade e
   l'eccezione va tolta. Quella di `paddle_examples` già non lo vede.
3. **`POST /way-back`** (`shaperoute_api/way_back.py` per corpi e calcolo,
   senza FastAPI, perché gira anche sul telefono; `way_back_api.py` per il
   router e i limiti; una riga in `app.py`). Il corpo è
   `{activity, here, ahead}`. La risposta è
   `{points, distance_m, rejoin, rejoin_m, directions}`, con le vie a cui
   corre accanto una strada senza nome (`with_alongs`), come
   `/route-directions`. Solo le reti di strada: sull'acqua 422.
   - **Limiti**: per chi chiede (`X-Phone-Id`, l'id anonimo del telefono
     di TASK-214 A2, altrimenti l'IP) e per IP, più larghi, perché gli
     operatori mobili mettono molti telefoni dietro un IP. Oltre, 429 con
     `Retry-After`. Non per account: la corsa e la sua guida funzionano
     senza account, e il token costerebbe una query a ogni richiesta.
   - **I valori** (`way_back_api.py`):
     - `PER_PHONE_A_MINUTE` = 6 per telefono, una richiesta ogni 10 s. È
       il doppio di quello che chiederà l'app con `WAY_BACK_EVERY_S`
       (parte B, circa 15–20 s), così un ricalcolo subito dopo aver
       lasciato la strada non viene rifiutato.
     - `PER_ADDRESS_A_MINUTE` = 60 per IP: dieci telefoni che chiedono
       di continuo dallo stesso indirizzo, come dietro il NAT di un
       operatore mobile.
     - Sopra c'è il limite di ogni POST di `access.py` (30 al minuto per
       client).
     - Una 429 costa poco: l'app tiene la strada che ha, o i puntini.
   - **Dopo l'aggiornamento del server** (con il sì dell'utente), nei log
     di `api`:
     - quante `"POST /way-back HTTP/1.1" 429` (log degli accessi) e quante
       righe `way back refused` (le 429 di questo limite, non quelle di
       `access.py`): poche, rispetto alle 200;
     - i tempi delle righe `way back of … m, … directions, in … s`: sul
       Mac 0,05–0,15 s con il ritaglio; sul server ci si aspetta 3–5
       volte tanto, e oltre 1 s va guardato;
     - le `503` (`map_data_unavailable`), che sono zone non in cache, e le
       `422`, cioè nessuna strada per tornare. Sono normali solo se
       rare: tante 503 vogliono dire runner fuori dalle zone del server.
     Le righe non hanno posizioni (ADR-0092).
4. **Sul telefono**: `on_phone.way_back_json`, la stessa risposta dello
   stesso calcolo; `page.ts` e `phoneEngine.ts` con la chiamata
   `wayBack`; `engine.zip` ricostruito.
5. **Nell'app** (nessuno la usa fino a B): `api/wayBack.ts` (POST
   `/way-back`, non lancia mai) e `engine/wayBackOnPhone.ts`. Prima il
   telefono, se ha la zona e il motore va. Poi il server. Altrimenti
   `{kind: "none"}`, cioè i puntini come oggi: server vecchio (404),
   offline, 429, 422, tempo scaduto.
6. **Contratto**: tipi in `shared-types`, fixture `way-back-request.json`
   e `way-back.json` controllate da TypeScript e da Python; `API.md`.

## Parte B — lo schermo di corsa

In un contesto suo, dopo la #567 e dopo A. I «File toccati» di B li
manda al Coordinatore chi la fa, prima del codice.

- Fuori percorso (ADR-0070) l'app chiede la strada per tornare con
  `wayBackOnPhone`, al massimo una volta ogni `WAY_BACK_EVERY_S`. La
  tiene finché il runner ci sta sopra. La chiede di nuovo quando la lascia
  o quando il punto di rientro esce dalla finestra di ADR-0263.
- **Mappa**: la strada sulle vie a puntini, al posto della linea dritta.
  **Banner**: la prossima svolta della strada per tornare. **Voce**: le
  frasi delle svolte che ci sono già, mai sopra le svolte del percorso;
  una frase al ricalcolo, con il suo limite.
- Senza strada si vedono i puntini dritti di TASK-303, senza errori.
- Il rientro resta quello di ADR-0263: lo decide il navigatore con le
  posizioni, non la strada calcolata.
- I testi nuovi in 5 lingue vanno proposti all'utente: senza il suo sì la
  PR non entra.

## Criteri di accettazione — parte A

- [x] Su una griglia di prova: un runner a metà isolato va avanti verso
      il percorso, non torna all'incrocio dietro; il rientro è il nodo più
      vicino per strada, non in linea d'aria (un isolato lungo in mezzo).
- [x] Il percorso chiuso più avanti (la strada che il runner ha lasciato)
      non si riprende all'indietro: si rientra al primo nodo raggiunto.
- [x] In bici un senso unico contrario non si prende; un tratto a mano
      costa di più.
- [x] Le indicazioni partono dal runner e finiscono al rientro, con il
      verso da prendere sul percorso; le distanze sono dal runner.
- [x] Niente strada entro `MAX_WAY_M`, o tratto non sulla mappa:
      `NoWayBackError` → 422.
- [x] `engine_fingerprint` di `route_store` è uguale a quello di `main`;
      il test che nessun modulo importi `way_back` c'è.
- [x] `POST /way-back` risponde con le fixture; 429 oltre i limiti, per
      telefono e per IP; 422 sull'acqua.
- [x] Sul telefono `way_back_json` dà la stessa risposta dell'API
      (test in CPython; `engine.zip` ricostruito, il test di
      `tools/phone_engine` è verde).
- [x] `wayBackOnPhone`: zona salvata → telefono; senza zona → server;
      server 404 / offline / 429 / 422 → `none`, senza eccezioni.
- [x] Suite del motore, dell'API, dell'app e di `shared-types` verdi;
      lint, typecheck, prettier, ruff, black; impronta iOS `83793e26`
      su una copia pulita.

## Esito — parte A

In `main` con la #588 (`f381b7f5`, 2026-10-28), mergiata dal
Coordinatore dopo la CI verde. Diff uguale ai 25 file qui sotto; impronta
iOS `83793e26` rimisurata da lui su una copia pulita.

- **Cosa c'è**: il motore calcola la strada per tornare sulle vie (sul
  telefono e con `POST /way-back`). L'app ha il client, ma nessuno lo
  chiama: la corsa mostra ancora i puntini di TASK-303, finché non entra
  la parte B.
- **Una regola in più del piano**: accanto al percorso più avanti, la
  strada è solo fino a quella via, senza indicazioni. La prova sulla zona
  vera di Trento l'ha mostrata: senza, chi era a 60 m dal percorso veniva
  mandato all'incrocio e poi indietro con un'inversione a U. Scritta in
  ADR-0274 e in `API.md`.
- **Impronta degli esempi tenuti** (`route_store`): `6072aa1ea3a3`, come
  prima; senza `NOT_ROUTES` sarebbe diventata `74dc36d25b48`.
- **Misure** sulla zona di Trento sul Mac, in CPython, sul percorso della
  prova a Trento Fiere (fixture di TASK-302) con il runner a 60–150 m:
  - ritaglio 0,01–0,11 s, ricerca 0,03–0,06 s;
  - strade di 59–293 m, contro 47–280 m in linea d'aria;
  - nomi veri delle vie (Via Palermo, Corso Tre Novembre, Viale Verona).

  Pyodide è circa 1,8 volte più lento (TASK-214 D).
- **Test**:
  - motore: 20 test in `test_way_back.py`, suite intera 1631 verde;
  - API: 16 in `test_way_back_api.py` e 4 in
    `test_way_back_fingerprint.py`, suite intera 1855 verde in locale;
  - app: 21 test nuovi, suite intera 4016 verde;
  - `shared-types`: 3 test nuovi.
- **Non provato**: dentro Pyodide e sull'iPhone. Il codice è lo stesso di
  CPython e non importa niente che il motore del telefono non abbia già.
  La prova vera è con la parte B, nel simulatore.

### Cosa resta per il server

Dopo l'approvazione di Apple e con il sì dell'utente: un aggiornamento
dell'API (`/way-back` nuovo). Niente migrazione, niente `draw_examples`,
nessun esempio da ridisegnare. Poi i log come scritto sopra (le 429, le
righe `way back refused`, i tempi di `way back of …`, le 503 e le 422).

### Prossimo: parte B

In una sessione sua, da `origin/main`, con i «File toccati» al
Coordinatore prima del codice. Il punto di partenza è
`engine/wayBackOnPhone.ts` → `wayBackOnPhoneFirst(apiUrl(), {activity,
here, ahead})`. `ahead` sono i punti del percorso dentro la finestra di
`rejoinAheadM` (`navigation/rejoin.ts`), con un tetto di qualche km dopo
un buco del GPS, quando la finestra è infinita.

## File toccati — parte A

```
docs/tasks/TASK-314.md                                 (nuovo)
docs/DECISIONS.md                                      (ADR-0274, in fondo)
docs/STATUS.md                                         (righe nuove)
docs/API.md                                            (POST /way-back)
services/route-engine/route_engine/way_back.py         (nuovo)
services/route-engine/tests/test_way_back.py           (nuovo)
services/api/shaperoute_api/way_back.py                (nuovo)
services/api/shaperoute_api/way_back_api.py            (nuovo)
services/api/shaperoute_api/app.py                     (una riga: install_way_back)
services/api/shaperoute_api/on_phone.py                (way_back_json)
services/api/shaperoute_api/route_store.py             (l'impronta lascia fuori way_back.py)
services/api/tests/test_way_back_api.py                (nuovo: API e telefono)
services/api/tests/test_way_back_fingerprint.py        (nuovo)
packages/shared-types/src/index.ts                     (WayBackRequest, WayBack, in fondo)
packages/shared-types/fixtures/way-back-request.json   (nuovo)
packages/shared-types/fixtures/way-back.json           (nuovo)
packages/shared-types/test/wayBack.test.ts             (nuovo)
apps/mobile/assets/engine/engine.zip                   (ricostruito)
apps/mobile/src/engine/page.ts                         (wayBack)
apps/mobile/src/engine/phoneEngine.ts                  (wayBack)
apps/mobile/src/engine/phoneEngineWayBack.test.ts      (nuovo)
apps/mobile/src/engine/wayBackOnPhone.ts               (nuovo)
apps/mobile/src/engine/wayBackOnPhone.test.ts          (nuovo)
apps/mobile/src/api/wayBack.ts                         (nuovo)
apps/mobile/src/api/wayBack.test.ts                    (nuovo)
```

## Parte B — com'è fatta

Lista dei file approvata dal Coordinatore il 2026-11-06; i dieci file della
Privacy aggiunti dopo il sì dell'utente alla frase.

- **Dove gira**: `navigation/wayBackRun.ts`, un oggetto della corsa come
  `lockNotice`, nel ciclo delle posizioni di `useNavigation.ts`. Dopo ogni
  passo del navigatore chiede, tiene o toglie la strada e aggiunge le sue
  frasi dopo quelle del navigatore. Una strada che arriva fra due posizioni
  passa da `onWay`: si vede e si dice subito, e va anche nella notifica a
  schermo bloccato (TASK-401 A, `lockNotice.ts` invariato).
- **Dove sta**: in `Navigation.wayBack` (`navigation/wayBackShown.ts`: la
  strada, dove è il runner, quali svolte sono dette). Il navigatore la
  porta da una posizione all'altra e non la legge: il rientro resta il suo
  (ADR-0263). Banner e mappa la leggono da lì; `App.tsx` è invariato.
- **Quando chiede**: alla prima posizione fuori percorso; poi solo se manca
  una strada (nessuna, lasciata dopo `OFF_FIXES` posizioni a più di
  `OFF_ROUTE_M`, o con il rientro fuori dalla finestra). Al massimo ogni
  `WAY_BACK_EVERY_S` = 15 s, una richiesta alla volta, data per persa dopo
  `WAY_BACK_WAIT_MS` = 25 s. Mai con una posizione scarsa. Al rientro la
  richiesta in corso si annulla.
- **Con il telefono bloccato** (l'app non in primo piano) si chiede subito
  al server: la pagina del motore dorme, e aspetterebbe 20 s.
- **Il tratto mandato** (`ahead`): la finestra di ADR-0263
  (`rejoinWindow`, esportata dal navigatore, la stessa di `rejoinFor`), al
  più `AHEAD_CAP_M` = 3 km, come `MAX_WAY_M`. Su una forma chiusa non
  ancora agganciata: 3 km intorno al punto dei puntini.
- **Mappa**: i puntini dal runner al punto dove sta sulla strada, poi
  lungo quello che resta della strada (`showRejoinLine`). Il livello
  `rejoin` di `mapPage.ts` disegnava già una linea di più punti.
- **Banner**: «Off the route» e sotto la prossima svolta della strada, come
  quella del percorso: freccia, metri, via, «Then …». Senza svolte rimaste,
  la distanza e il punto cardinale di TASK-303.
- **Voce**: le frasi delle svolte che esistono già, a `ANNOUNCE_M`, come
  sul percorso. Al ricalcolo, la prossima svolta con i metri, al più una
  volta ogni `NEW_WAY_SAID_EVERY_S` = 60 s (si riparte a ogni uscita). Se
  era più lontana di `ANNOUNCE_M`, la si ridice vicino. Le svolte passano
  da `simplifyDirections` come quelle del percorso. Fuori percorso il
  navigatore non dice svolte, quindi la strada non parla mai sopra una
  svolta del percorso.
- **Nessun testo nuovo** nell'app (né `i18n/` né `voice/`).
- **Privacy**: una frase in «Your position», nelle cinque lingue, approvata
  dall'utente il 2026-11-06 («Sì, aggiungi la frase»). Le pagine di
  `site/privacy` sono rifatte con `site/tools/make_privacy.mjs`.
- **Solo sport con le strade sul telefono** (`NETWORKS`: corsa, camminata,
  bici): gli altri hanno i puntini come prima. È la regola della parte A,
  che per loro dà `none` senza chiedere al server.

### Per TASK-401 B (Live Activity)

`liveStateOf` (`navigation/liveActivity.ts`, #862), fuori percorso, legge
`navigation.rejoin`, cioè i metri in linea d'aria e il punto cardinale.
Dopo questa parte la Live Activity direbbe «120 m NE» mentre voce, banner
e notifica danno la svolta della strada. Quando 401 B unisce `main` (lo
avvisa il Coordinatore), legga `navigation.wayBack` con `upcomingOnWay`
(`navigation/wayBackShown.ts`), come fa il banner. `useNavigation.ts`
cambia negli stessi punti in cui lo cambia 401 B: conflitto di testo in
3–4 righe.

## Criteri di accettazione — parte B

- [x] Una corsa finta intorno a un isolato: fuori percorso la voce dice
      «You are off the route…», «The route is … to the south.», la prima
      svolta della strada appena trovata, le svolte successive a 50 m e
      «Back on the route.»; niente di più (`wayBackRun.test.ts`, e
      `wayBackDetour.test.ts` attraverso `useNavigation`).
- [x] La strada si chiede una volta mentre il runner ci sta sopra, dal
      punto dove è uscito, con il percorso davanti a dove l'ha lasciato.
- [x] Senza strada (404, `none`) restano i puntini e le parole di TASK-303,
      senza errori. Si richiede al più ogni 15 s.
- [x] Una richiesta senza risposta si annulla al rientro; una risposta
      arrivata dopo il rientro non si mostra.
- [x] Lasciata la strada, la si richiede da dove è il runner. Una strada
      nuova entro 60 s non si dice subito; dopo 60 s sì.
- [x] Con il telefono bloccato si chiede lo stesso, al server; la
      notifica scrive le svolte della strada.
- [x] Sull'acqua (nuoto, paddle) non si chiede niente.
- [x] Banner: «Off the route» e la svolta della strada, anche su «Data»,
      in italiano e in piedi; senza svolte rimaste, quello di TASK-303.
- [x] Mappa: puntini lungo la strada; senza strada di nuovo dritti; al
      rientro nessuno.
- [x] Il rientro resta del navigatore: `navigator.test.ts`,
      `detourRun.test.ts` e gli altri test della corsa verdi senza
      modifiche.
- [x] La frase della Privacy approvata dall'utente, nelle 5 lingue e nelle
      pagine del sito (`privacy.test.mjs` verde).
- [x] Test toccati verdi in locale; tsc, eslint e prettier puliti. Solo JS:
      l'impronta iOS `6f8bba4c` la misura il Coordinatore.

## Esito — parte B

Fatta il 2026-11-06 nel branch `feat/TASK-314-b-way-back-run`. Test:
26 nuovi (20 in `wayBackRun.test.ts`, 2 in `wayBackDetour.test.ts`, 4 in
`NavigateWayBack.test.tsx`) più 2 in `MapViewWayBack.test.tsx`. Verdi
anche i test già esistenti dei file toccati: navigazione, corsa, mappa,
Privacy (425).

**Non provato**: nel simulatore e su una corsa vera. Restano da vedere
con gli occhi il motore del telefono dentro Pyodide, i tempi e il server
con il telefono bloccato. Il percorso del codice è quello della parte A,
che ha i suoi test.

**Privacy**: la data della Privacy resta «6 November 2026», già quella
di `main`, quindi i tre test con la data (`documents.test.ts`,
`AboutPage.test.tsx`, `site/tests/privacy.test.mjs`) non cambiano.
**App Privacy** su App Store Connect non cambia, d'accordo il
Coordinatore: la posizione esatta è già dichiarata, legata all'uso
dell'app, come partenza di un percorso.

**Cosa resta**:
- l'OTA, solo dopo la prova nel simulatore e l'ok dell'utente al video;
- la pubblicazione del sito per la frase della Privacy, con il sì
  dell'utente; il comando lo dà il Coordinatore dopo il merge;
- dopo l'OTA, i log di `/way-back` come scritto nella parte A.

## File toccati — parte B

```
apps/mobile/src/navigation/wayBackRun.ts           (nuovo)
apps/mobile/src/navigation/wayBackShown.ts         (nuovo)
apps/mobile/src/navigation/wayBackRun.test.ts      (nuovo)
apps/mobile/src/navigation/wayBackDetour.test.ts   (nuovo)
apps/mobile/src/navigation/navigator.ts            (campo wayBack, rejoinWindow)
apps/mobile/src/navigation/useNavigation.ts        (startWayBack nel ciclo delle posizioni)
apps/mobile/src/screens/NavigateScreen.tsx         (banner: la svolta della strada)
apps/mobile/src/screens/NavigateWayBack.test.tsx   (nuovo)
apps/mobile/src/map/MapView.tsx                    (puntini lungo la strada)
apps/mobile/src/map/messages.ts                    (showRejoinLine)
apps/mobile/src/map/MapViewWayBack.test.tsx        (nuovo)
apps/mobile/src/about/content/en.ts                (una frase in «Your position»)
apps/mobile/src/about/content/it.ts                (una frase in «La tua posizione»)
apps/mobile/src/about/content/es.ts                (una frase in «Tu posición»)
apps/mobile/src/about/content/fr.ts                (una frase in «Ta position»)
apps/mobile/src/about/content/de.ts                (una frase in «Dein Standort»)
site/privacy/index.html                            (rifatta da make_privacy.mjs)
site/privacy/it/index.html                         (rifatta)
site/privacy/es/index.html                         (rifatta)
site/privacy/fr/index.html                         (rifatta)
site/privacy/de/index.html                         (rifatta)
docs/tasks/TASK-314.md
docs/STATUS.md                                     (righe nuove)
docs/DECISIONS.md                                  (ADR-0274, precisazione B, in fondo)
docs/UI.md                                         (fuori percorso, la strada per tornare)
```
