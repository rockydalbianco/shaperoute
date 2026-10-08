# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-08, 18:10 · `main` = `f3e584b`

## Come si usa

1. Trova la tua sessione qui sotto: **Adesso** è il task in corso,
   **Dopo** la coda, in ordine.
2. Un task della coda parte solo quando le sue **dipendenze** sono in `main`.
   Se non lo sono, avvisa il coordinatore e aspetta.
3. Il messaggio di partenza lo manda il coordinatore, completo (numero,
   ADR, file, confini). Se non arriva, chiedilo: non partire da solo.
4. Numeri di task e di ADR: solo dal coordinatore (`CLAUDE.md`). Se il
   coordinatore non risponde e l'utente ha fretta, prendi i primi liberi
   scritti qui sotto e **diglielo prima** di creare i file.
5. **Worktree in `.claude/worktrees/TASK-XXX`**, sul Mac. I controlli JS in
   un worktree usano i `node_modules` del checkout principale; prima del
   push anche `npm run format:check` (prettier non è in `expo lint`).
6. **La coda dei merge è una sola e la tiene il coordinatore.** Nessuna
   sessione mergia fuori coda senza dirlo prima al coordinatore, nemmeno
   su richiesta dell'utente: un merge fuori coda rimette in conflitto le
   PR che stanno facendo girare la CI. Quando la tua PR è pronta, scrivi
   «#NNN pronta» e aspetta. Al tuo turno aggiorni il branch da
   `origin/main`, risolvi i conflitti tenendo tutte le voci, rifai i test,
   fai push e scrivi «#NNN CI in corso».
7. **La CI non la aspetta nessuno da solo.** La guarda il coordinatore
   (la sessione «Agente di assistenza coordinamento» è chiusa dal
   2026-10-02 sera): scrivigli «#NNN pronta», e lui ti manda «merge NNN»
   quando la PR è 5/5 verde e MERGEABLE, o il job che fallisce. La
   sessione proprietaria mergia la sua PR.
8. **PR di soli documenti** (task file, STATUS, AGENTI) entrano appena
   sono verdi e CLEAN, senza aspettare la coda: non toccano codice.
9. **Pubblicare l'app** (`eas update`) e **toccare il server** si fanno
   solo con l'ok dell'utente, da `origin/main` pulito (memoria
   «publish-from-clean-main», `DEPLOY.md` F.12).
   **Una pubblicazione alla volta**: prima di `eas update` o di toccare il
   server chiedi al coordinatore e **aspetta la sua risposta** (arriva a
   fine turno). Il 2026-10-03 due sessioni hanno pubblicato lo stesso
   commit a pochi minuti l'una dall'altra.
10. **Migrazioni del database**: il numero è **il primo libero in `main`
   quando la PR entra** (non uno tenuto prima), così l'ordine è lo stesso
   su ogni database. Prima del merge guarda `services/api/migrations/`.
11. **Dopo un aggiornamento del server che cambia `route_engine`**, gli
   esempi tenuti non valgono più: va rilanciato `draw_examples` (circa 35
   minuti, dentro il container dell'API), mai mentre gira un altro
   aggiornamento.

## La coda dei merge

Alle 18:10 del 2026-10-08: aperte la **#438** (TASK-210 F, aspetta il
sì dell'utente sui testi), la **#440** (TASK-203 B, motore: entra solo
con l'ok dell'utente per il server) e la **#441** (TASK-261 A, aspetta il
sì sui testi del permesso). Il telefono ha tutto `main` (gruppo
`35156595`); il server è a `873de53` e **aspetta l'ok dell'utente** per
`/feed` (TASK-118) e, con la #440, per il motore nuovo (poi
`draw_examples`, ~40 min). L'app si chiama **MuW** dal 2026-10-06
(TASK-260, ADR-0224). **Dal 2026-10-07 c'è «Coordinatore 2 · merge e
archivio»** (`docs/COORDINATORE-2.md`): mergia al verde in automatico,
una PR per giro, salvo il veto del coordinatore («non mergiare NNN»), i
testi che aspettano l'utente, il motore e le migrazioni che aspettano
l'ok del server; archivia le sessioni chiuse e ferma i doppioni. Il
coordinatore tiene numeri, brief, questo file, il server e le
pubblicazioni.
Entra prima chi è pronto prima; la sessione proprietaria mergia da sola al
5/5 verde e CLEAN, ricontrollato subito prima, dopo il «merge NNN» del
coordinatore; quando il coordinatore scrive «al verde mergia senza
aspettarmi» vale come «merge» anticipato. Le PR di soli documenti di una
sessione chiusa le mergia (e le aggiorna) il coordinatore. Quando più PR
sono pronte insieme **non aggiornarti e non mergiare da solo**: ogni
merge rimette le altre in conflitto su STATUS e DECISIONS, il turno lo dà
il coordinatore (la sua risposta arriva a fine turno: leggila nel suo
transcript prima di mergiare).

## L'albero

```
Translate shape names, map and Help (TASK-210 F)
  └─ Adesso  TASK-210 F  I nomi delle forme in «Explore» e «Draw»
                         (de/es/fr), la mappa nella lingua dell'app con
                         `name:en` in inglese, «Help», «Terms» e «Privacy»
                         in de/es/fr: #438, aspetta il sì dell'utente sui
                         testi (`out/task-210-f-testi.md`)

Faster routes with different results (TASK-203 B)
  └─ Adesso  TASK-203 B  La ricerca lontana parte solo dove vicino non si
                         disegna niente (−1,3…−1,9 s sui casi lunghi, 14
                         percorsi su 15 uguali): #440, motore; entra con
                         l'ok dell'utente per il server     ADR-0230

Record runs with the app in background (TASK-261)
  └─ Adesso  TASK-261 A  La corsa registra con l'app in secondo piano:
                         `expo-task-manager`, permesso «Mentre usi l'app»
                         + `UIBackgroundModes` location (scelta
                         dell'utente del 2026-10-07: niente «Sempre»); la
                         prova solo in build nativa: #441, aspetta il sì
                         sui testi del permesso. Parte B: la voce a
                         schermo bloccato, dopo la prova sull'iPhone
                                                              ADR-0225

Scelte prodotto prioritarie (schede pronte, da cliccare)
  ├─ TASK-121    Segnalare e bloccare (API: tabelle nuove, migrazione al
  │              primo numero libero al merge, oggi 0020; filtro in feed,
  │              commenti, reazioni, ricerca, follow, profilo; app: menu
  │              «…» sul post e sul profilo, «Blocked people»)  ADR-0228
  ├─ TASK-092    I disegni consigliati (somiglianza, poi reazioni, poi
  │              corse fatte; riga «Recommended» in «Explore»): parte
  │              dopo la #438 (stessi `src/explore/*`)         ADR-0229
  └─ TASK-262 A  Le notifiche push vere (`expo-notifications`, invio a
                 exp.host dall'API, token in tabella): parte dopo
                 TASK-121; B email con Resend (chiave messa dall'utente
                 in `/root/shaperoute/.env`), C rubrica con un sì
                 esplicito dell'utente prima                   ADR-0226

Mappe offline: parte B pubblicata
  └─ Dopo    TASK-214 D  La prova sull'iPhone: le zone del telefono
                         sono sul server e B2/B2b sono pubblicate; i
                         limiti di distanza si fissano con la prova
                                                               ADR-0177

SITO WEB (già «Sezione merchandising magliette»)
  └─ Adesso  TASK-237  Il sito è la guida dell'app (A2 in `main`, #335;
                       il merch è spento). Aspettano l'utente: i testi
                       in inglese, il link dell'App Store, il dominio,
                       la pubblicazione                        ADR-0201

Chiuse il 2026-10-05/08: TASK-226, 228, 233, 211 B, 235, 236, 234, 214
(A2, B2, B2b), 238, 239, 240, 241 (A–G), 242, 243, 244, 245 (A, B), 246,
247, 248 (A, B), 249, 251 (A, B), 252, 253, 183, 184, 185, 182 (A–E:
la E #436 tiene la distanza di «Draw» in metri), 232 (A, B, B2, C), 254
(#407), 255 (#403), 256 (#408), 257 (#400), 250 (#406), 258 (#412,
migrazione 0019), 259 (A #413, B #419), 210 B la corsa (#414), C
«Explore» (#420), D «Draw» (#421), E la fine corsa, «Sport» e la voce
(#433), G i titoli delle pagine (#437), 208 B la fine corsa stile Strava
(#425), 260 il nome «MuW» (A #426, B il logo #428; icona e splash solo
con una build nativa), 118 il feed vero (#439, `/feed` nell'API senza
migrazione, gli esempi come riempitivo), 173 seconda parte (chiusa:
«c'è già il pulsante»), 119, 223, 191 (documenti, #431 e #432). La #435
era un doppione della parte E: chiusa senza merge. Sessioni chiuse o
libere: tutte quelle dei task sopra, più «Continuazione lavoro
precedente» (non coordina: aspetta l'utente).

Da assegnare (task file in `main`)
  ├─ TASK-210    L'ultimo pezzo: «Paddle ·» e il nome della forma nei
  │              post d'esempio del Feed (`feed/FeedPost.tsx`), un
  │              seguito nel task file; poi TASK-210 è chiuso
  └─ Seguiti: il server non tiene le figure dei laghi e delle spiagge
     (TASK-246); altre spiagge (TASK-245); in bici senza percorso la
     schermata mostra il passo al km (TASK-251); la velocità (scelte
     dell'utente del 2026-10-06); un segnale per i tocchi su «Try»
     (TASK-234); togliere l'effetto di cambio unità di `RouteChoice`
     quando `src/route/` è libero (TASK-182 E); l'indice su
     `published_at`, la foto dell'autore sulla scheda e il nome che apre
     il profilo (TASK-118, ADR-0227); «near your start» fr «près de
     vous» e «Discard» nella bozza italiana di Privacy (TASK-210 F)

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ **L'ok per il server**: `/feed` (TASK-118, già in `main`) e la #440
  │  (TASK-203 B, motore: merge, server, `draw_examples` ~40 min)
  ├─ I sì sui testi: #438 (TASK-210 F) e #441 (TASK-261 A, il permesso)
  ├─ Le schede di TASK-121, TASK-092 e TASK-262 A in «Scelte prodotto
  │  prioritarie», da cliccare (092 dopo la #438, 262 A dopo 121)
  ├─ TASK-262 B: creare l'account Resend e mettere la chiave in
  │  `/root/shaperoute/.env` quando la B parte; C: il sì alla rubrica
  ├─ Una build nativa per vedere icona e splash «MuW» (TASK-260 B) e per
  │  provare il GPS in secondo piano (TASK-261 A)
  ├─ TASK-251: i testi delle cinque lingue (già pubblicati) · TASK-184:
  │  i segnaposto di «Terms» e «Privacy» · TASK-237: i testi in inglese
  ├─ La prova sull'iPhone di `35156595`: il Feed vero con due account
  │  (TASK-118, dopo il server), i titoli delle pagine (TASK-210 G), la
  │  distanza di «Draw» in miglia (TASK-182 E), la fine corsa, «Sport» e
  │  la voce in italiano (TASK-210 E), il nome e la scritta «MuW»
  │  (TASK-260), la fine corsa con foto, titolo, tag e «chi può vederla»
  │  (TASK-208 B), «Draw» ed «Explore» in italiano (TASK-210 C, D),
  │  «Location is off» in corsa con la posizione negata (TASK-259 B), la
  │  corsa in italiano (TASK-210 B), il post che resta sul server e si
  │  rivede da «Share» (TASK-258), «Open Settings» e «Retry» (TASK-259
  │  A), gli errori che parlano a chi corre (TASK-256), la corsa
  │  rifiutata con il motivo (TASK-257), lo schermo acceso e la pausa in
  │  secondo piano (TASK-255), le dodici correzioni piccole (TASK-254),
  │  Ledro in «Paddle» (TASK-250), più tutto il 2026-10-05
  ├─ Strava: spento per scelta dell'utente del 2026-10-05 («teniamo solo
  │  Instagram per ora»); per riaccenderlo, `DEPLOY.md` «Strava»
  ├─ TASK-236: la regola dei quattro paesi e i tre testi · TASK-237: il
  │  servizio di stampa · TASK-234: le misure e i testi · TASK-228: i
  │  quattro titoli dei post · TASK-211 B: i testi nuovi, la prova con
  │  due account
  ├─ La prova sull'iPhone di `1fc82a12` (forme nuove, anche a pezzi
  │  sull'acqua; canoa in «Explore»; reazioni con due account; «Share»;
  │  confronto dei km; «Offline maps»)
  ├─ TASK-223: le traduzioni de/es/fr dei testi nuovi; le «quasi»
  │  (palloncino, cono, fulmine, nuvola)
  ├─ TASK-211 B / TASK-208 B: dove sta «Requests», i testi, «Only me» di
  │  partenza; il filtro dei negativi anche sulla descrizione; il tipo
  │  Strava della canoa; la ricerca mostra il nome di ogni iscritto
  ├─ TASK-214: Pyodide (dipendenza nuova), App Store, memoria, dimensione
  ├─ TASK-116: «drawings» conta le corse private?; i testi del profilo
  │  (il profilo di un altro si apre dalla ricerca: TASK-211, 215)
  ├─ TASK-190: le due domande della parte C, «Start» in bici (le
  │  indicazioni sono solo a piedi, TASK-200), l'avviso dello sterrato,
  │  «km walking» in bici, i testi, la zona bici di Trento
  ├─ TASK-191 (chiuso nei documenti): il giudizio dei campioni v2
  │  (`out/task225-paddle-samples-v2.html`), i testi di «Sull'acqua», se
  │  schiarire l'acqua sulla mappa scura, la prova sull'iPhone pagaiando
  ├─ TASK-117 B: «Saved on the phone. It is sent when you are back
  │  online.», «This drawing is no longer public.», «Back to the
  │  profile», «Score 87»
  ├─ TASK-205: i testi di VoiceOver «Sport, Run», «Changes the sport»,
  │  «Close»
  ├─ TASK-198/199: «Paused» nella pausa «penna», la riga dei km su un
  │  preferito riaperto; gli `insights` senza l'attività
  ├─ TASK-122 lo Storage Box · TASK-150 i pagamenti AdMob · TASK-187 la
  │  sua app Strava e il secret sul server, poi la prova dal vero
  ├─ Il metodo nuovo «una voce per task» (`out/voci-per-task-bozza.md`)
  └─ TASK-184, TASK-185, e a cosa serve il telefono (TASK-183)

Da assegnare
  ├─ TASK-152 App Store; TASK-153 AdMob vero
  ├─ Le altre idee (A) di TASK-203 non provate (`tasks/TASK-203.md`)
  └─ Seguiti: il passo `draw_examples` in `DEPLOY.md` F.12 (TASK-122);
     cuore e «Start» sulla scheda del Feed (domanda in TASK-188); gli
     stessi percorsi Mac/server fra versioni di NetworkX/NumPy (TASK-203)
```

## File occupati adesso

| File | Di chi |
|---|---|
| `src/explore/*`, `route/shapeWords.ts`, `route/RoutePanel.tsx`, `map/mapStyle.ts`, `map/mapPage.ts`, `map/MapView.tsx`, `about/*`, `i18n/shapeNames.ts`, righe in fondo a `i18n/*` | TASK-210 F (#438) |
| `services/route-engine/route_engine/optimizer.py`, `nearby_starts.py`, i loro test, `assets/engine/engine.zip` | TASK-203 B (#440) |
| `navigation/trackRecorder.ts`, `useNavigation.ts`, `useFreeRun.ts`, `NavigateScreen`/`FreeRunScreen` (la posizione), `app.json`, `package.json` | TASK-261 A (#441) |
| `site/`, `docs/SITO.md`, `.github/workflows/site.yml` | TASK-237 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |
| `docs/COORDINATORE-2.md` | Coordinatore 2 |

## Numeri

- Task: presi fino a **TASK-262** (261 il GPS in secondo piano, 262 le notifiche vere). Il prossimo libero è **TASK-263**.
- ADR: presi fino a **ADR-0230** (0183 TASK-220, 0184 TASK-221, 0185
  TASK-223, 0186 TASK-224, 0187 TASK-225, 0188 TASK-226, 0189 TASK-227,
  0190 TASK-228, 0191 TASK-229, 0192 TASK-230, 0193 TASK-119, 0194
  TASK-231, 0195 TASK-232, 0196 TASK-233, 0197 TASK-234, 0198 TASK-235, 0199
  TASK-211 B, 0200 TASK-236, 0201 TASK-237, 0202 TASK-238, 0203
  TASK-239, 0204 TASK-240, 0205 TASK-184, 0206 TASK-185, 0207 TASK-241,
  0208 TASK-242, 0209 TASK-243, 0210 TASK-245, 0211 TASK-246, 0212
  TASK-248, 0213 TASK-249, 0214 TASK-250, 0215 TASK-251, 0216 TASK-252,
  0217 TASK-253, 0218 TASK-254, 0219 TASK-255, 0220 TASK-256, 0221
  TASK-257, 0222 TASK-258, 0223 TASK-259, 0224 TASK-260, 0225 TASK-261,
  0226 TASK-262, 0227 TASK-118, 0228 TASK-121, 0229 TASK-092, 0230
  TASK-203 B; TASK-244 e TASK-247 sono aggiunte ad ADR-0202 e ADR-0207,
  TASK-208 B ad ADR-0170, TASK-182 E ad ADR-0149, le parti di TASK-210 ad
  ADR-0172; 0149 TASK-182 e 0150 TASK-183 tenuti da prima). Il prossimo
  libero è **ADR-0231**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili, 0008 attività nei
  preferiti, 0009 corse pubblicate, 0010 canoa nei preferiti, 0011
  seguire, 0012 bici a mano nei preferiti, 0013 commenti, 0014 dettagli
  dei disegni, 0015 reazioni, 0016 email e telefono, 0017 notifiche, 0018 la
  rotazione dei percorsi salvati, 0019 il post della corsa. La prossima:
  il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `873de53` dal 2026-10-06
  ~20:00Z (migrazioni 0001–0019; immagine di prima
  `shaperoute-api:before-task260`, copia del database
  `shaperoute-2026-10-06T1957Z.dump`): «MuW» nei testi di Strava, nel
  creatore del GPX e nel messaggio dei tag (TASK-260 A), il post della
  corsa sul server
  (`PUT /me/activities/{key}/post`, TASK-258) e tutto il precedente (il
  punto del luogo in `/cities`, `run_scored` al salvataggio, le partenze
  vicine senza `Pool`, `activity` in `/me/activities`, la rotazione nei
  percorsi salvati e nel catalogo). `draw_examples` finito il mattino («70 of 72»: a Tenna il cuore e a Calceranica il
  cerchio non si disegnano su quelle strade). Zone del telefono: 528
  file. Acqua della canoa: 248 file (il Lago di Ledro dal 2026-10-06,
  TASK-250, con il Garda riscritto; quello di prima in
  `data/cache/water/before-task250/`); l'elenco dei laghi vive
  nell'app (`lakes.json`), `lake_catalog.py` è un comando offline. Strava
  spento per scelta dell'utente. **Manca sul server**: `/feed` (TASK-118,
  #439, senza migrazione) e, dopo il merge della #440, il motore nuovo
  (TASK-203 B, poi `draw_examples` ~40 min): aspettano l'ok dell'utente.
- **App**: su `preview` da `main` `f3e584b` (gruppo `35156595`,
  2026-10-08 ~15:45Z): tutto `main`; il Feed vero mostra gli esempi finché
  il server non ha `/feed`. **Dal 2026-10-05 il coordinatore pubblica da
  solo le cose di sola app** appena sono in `main` e il job `mobile` è
  verde (ok dell'utente: «sì, pubblica sempre le cose di sola app»); per
  il server l'ok si chiede ogni volta. Una PR la cui app vuole qualcosa
  sul server lo dice nel «pronta» e non entra prima.
- **Server e pubblicazione li fa una sessione sola per volta**, anche
  quando l'utente dà l'ok in più sessioni: chi lo riceve lo scrive al
  coordinatore e aspetta il suo via.
- **Chi cambia il motore** rifà `apps/mobile/assets/engine/engine.zip`
  (`python tools/phone_engine/phone_engine.py engine`) e, se tocca i file
  dell'acqua o le sagome, `src/paddle/paddleExamples.json`
  (`python -m shaperoute_api.paddle_examples`): due test della CI lo
  chiedono.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164), e poi fino alla #214:
#177–#402, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1 e A2, 197, 198, 199, 116, 201 (misurato, non conviene), 200,
202, 203, 187 (app), 204, 117 (A e B), 191 B, 205, 206 (A e B), 207,
210 A, 211 A, 212, 213, 215, 120, 208 A, 209, 214 (A, B, C), 216, 218,
219, 220, 221, 222, 223, 224, 225, 226 (A, B), 227, 228, 233, 234, 235, 236, 237 (A, A2), 211 B, 214 (A2, B2), 229, 230, 231 (A, B),
119 (A, B), 217 e 191 C.
