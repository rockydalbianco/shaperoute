# TASK-481 — Il «+» del Feed: tutte le voci

**Stato**: In lavorazione · parte 0 (documenti) fatta il 2026-11-21; parte A
in `main` il 2026-11-23 (#1421, `3f124ce7`; schermate e traduzioni approvate
dall'utente il 2026-11-23, ADR-0390 precisazione A); privacy (punto 7) in
`main` il 2026-11-23 (#1444, `9b946507`, traduzioni approvate dall'utente),
copia del sito col sì dell'utente; restano le righe di 467 E2, 484 B e
485 B, al via del Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-481-feed-plus-all-entries` (parte 0),
`feat/TASK-481-a-feed-plus-list` (parte A)
**Dipende da**: TASK-476 (il «+» e il foglio, ADR-0387), TASK-312 C2 (che
tocca lo stesso foglio)
**ADR**: ADR-0390 (numero dal Coordinatore) · estende ADR-0387

## Obiettivo

Il «+» del Feed diventa l'unico posto da cui si pubblica tutto. Le parole
dell'utente, il 2026-11-21 nella sessione del sonno: un «+» per pubblicare
il sonno, una corsa, un'immagine, un'attività, da Strava, un post di
Instagram, un allenamento in palestra, una scheda di allenamento.

Questo task tiene **la lista** (le voci, l'ordine, i testi, chi vede che
cosa) e la **mappa voce → task**: ogni voce la costruisce il task che la
possiede, e compare nel foglio quando è pronta.

## Contesto da leggere

- `docs/tasks/TASK-476.md`, ADR-0387 (il «+» com'è oggi);
- `docs/IMPORTAZIONI.md` §1–4 e §7–8, ADR-0272 (da file, foto, Strava,
  Instagram);
- `docs/tasks/TASK-312.md` parti C, D, E;
- `apps/mobile/src/feed/AddToFeed.tsx`, `apps/mobile/src/imports/AddPastActivity.tsx`.

## Parte 0 — Le scelte dell'utente (2026-11-21)

Una domanda per volta, ognuna con la proposta dell'agente.

1. **Le voci e l'ordine.** Proposta: il foglio diventa prima una lista di
   scelte, ogni scelta apre il suo flusso; cinque voci («Photos», «From a
   file», «Sleep», «Gym workout», «Workout plan»). **Risposta: «Anche
   «Record now»»** — sei voci, «Record now» in cima. Le otto cose della
   richiesta stanno così: una corsa adesso → «Record now»; un'immagine, un
   post di Instagram → «Photos only»; una corsa o un'attività fatta prima,
   da Strava → «From a file»; il sonno → «Sleep»; un allenamento in palestra
   → «Gym workout»; una scheda di allenamento → «Workout plan».
2. **«Record now» e «Gym workout».** Proposta, **accettata («Sì, già fatto
   a mano»)**: «Record now» apre la registrazione con lo sport di sempre (lo
   si cambia lì, palestra compresa); «Gym workout» aggiunge un allenamento
   in palestra **già fatto, scritto a mano** (esercizi, serie, pesi, giorno e
   durata), che diventa il post della palestra con «Imported». Scartati:
   «Gym workout» che avvia la palestra adesso; togliere la voce.
3. **«Workout plan».** Proposta, **accettata («Sì, con «Use this
   plan»»)**: si sceglie una delle proprie schede della palestra e la si
   pubblica nel Feed (nome, obiettivo, giorni a settimana, settimane,
   esercizi di ogni giorno); chi la vede la copia fra le sue schede con «Use
   this plan», come la routine di stretching di TASK-466 E. Scartati: solo
   da vedere; unire anche la routine di stretching qui.
4. **Le voci non ancora pronte.** Proposta, **accettata («Sì, niente
   «Soon»»)**: una voce compare solo quando è pronta, come scelto il 12
   novembre. La lista cresce a ogni uscita. Scartato: «Soon» in grigio.
5. **Chi lo vede.** Proposta, **accettata («Sì, così»)**:

   | Voce | Parte con | Da dove viene |
   |---|---|---|
   | «Record now» | le regole di ogni corsa registrata (ADR-0304), nessuna eccezione | questa scelta |
   | «Photos only» | l'ultima scelta salvata, la prima volta «Everyone» | TASK-312 C, scelta del 2026-11-21 |
   | «From a file» | «Everyone», visibile e cambiabile sopra «Save» | ADR-0387 |
   | «Sleep» | la visibilità degli altri post di chi pubblica | TASK-467, parte 0 risposta 3 |
   | «Gym workout» | «Everyone», visibile e cambiabile prima di «Save» | questa scelta |
   | «Workout plan» | «Everyone», visibile e cambiabile prima di «Post» | questa scelta |

   Ogni tipo nuovo (sonno da solo, palestra a mano, scheda) ha **la sua riga
   di privacy**, approvata dall'utente nel task che lo costruisce.
6. **I testi del foglio.** **Risposta: «Approvo»**, in inglese; italiano,
   tedesco, francese e spagnolo li prepara l'agente e vanno all'utente con
   le schermate della parte A.

   | Dove | Testo |
   |---|---|
   | Titolo del foglio (era «Add activity») | «Add to Feed» |
   | Il «+» per VoiceOver (era «Add activity») | «Add to Feed» |
   | «Record now» | «Start an activity now» |
   | «Photos only» (approvato in TASK-312 C) | «Up to 10 photos, also from Instagram» |
   | «From a file» (approvato in TASK-312 B) | «GPX, TCX or FIT from Strava, Garmin, Komoot…» |
   | «Sleep» | «Last night's sleep score» |
   | «Gym workout» | «A workout you already did, written by hand» |
   | «Workout plan» | «Share one of your gym plans» |

   Scartati: tenere «Add activity»; «New post».
7. **La privacy di oggi.** La frase del 12 novembre dice «An activity you
   add with the «+» of the Feed is the exception…»: con «Record now» nel
   «+» non sarebbe più esatta. Proposta, **approvata («Approvo»)**:
   «from a file» in più, nelle cinque lingue e sul sito, con la parte A:
   - «An activity you add **from a file** with the «+» of the Feed is the
     exception: it starts on «Everyone», which you see before «Save» and
     can change.»;
   - l'ultima frase, nella privacy e nell'aiuto: «An activity added from a
     file in «My activities» starts on «Only me»; one added **from a file**
     with the «+» of the Feed starts on «Everyone», and you can change it
     before «Save».»

   Le altre quattro lingue sullo stesso modello; la data della privacy è
   quella del merge della parte A.

## La mappa: voce → task

| Voce | Chi la costruisce | Stato oggi |
|---|---|---|
| «Record now» | **TASK-481 parte A** (questo task) | da fare: solo app, apre la registrazione che c'è già |
| «Already recorded» | **TASK-481 parte F** (questo task) | aggiunta il 2026-11-23: pubblica un'attività di «My activities» non ancora nel Feed; #1478 |
| «Photos only» | **TASK-312 C2** (sessione `local_3444e01e-ccb0-4cb7-bd05-8c1c26f2cd0d`) | in corso; API in `main` (C1, #1347) |
| «From a file» | TASK-476 | c'è già |
| «Sleep» | **TASK-467 parte E** (sessione `local_434d1949`) | da scrivere: oggi il sonno sta sul profilo e dentro il post dell'attività, non è un post da solo; che cosa mostra lo decide l'utente lì |
| «Gym workout» | **TASK-484** «Allenamento in palestra scritto a mano, nel Feed» | da scrivere; la sessione parte quando l'utente la apre |
| «Workout plan» | **TASK-485** «La scheda della palestra come post» (con «Use this plan»), parente di TASK-466 E | da scrivere; la sessione parte quando l'utente la apre |

**Non sono voci, e perché:**

- **Strava diretto**: l'accordo API di Strava lascia mostrare i dati di un
  utente solo a lui (ADR-0272, studio di TASK-312 E): niente Feed da lì.
  Resta il file esportato («From a file») e, dopo la 1.1, «Open in MuW» dal
  menu Condividi di Strava (build nativa, `IMPORTAZIONI.md` §9).
- **Instagram**: non si collega (solo account Business o Creator, la
  revisione di Meta, nessuna traccia). La foto la si prende dalla galleria
  con «Photos only».

## Parti

### A — La lista e «Record now» (TASK-481, solo app, esce con un OTA)

- Il foglio si apre su una **lista di voci**: ognuna una riga con nome e
  riga sotto (i testi del punto 6), nell'ordine del punto 1, solo quelle
  pronte. Una voce toccata apre il suo flusso nello stesso foglio, con
  «‹» per tornare alla lista e «✕» per chiudere. Le voci stanno in un file
  a sé (`addToFeedEntries.ts`): un task che porta la sua voce aggiunge lì
  una riga e il suo flusso, senza riscrivere il foglio.
- **«From a file»** apre il flusso di oggi (`AddPastActivity` con `opened`
  e `onDone`), con «Everyone» come in ADR-0387; c'è solo con il selettore di
  file (`filePickerAvailable()`).
- **«Record now»** chiude il foglio e apre la registrazione
  (`setScreen("run")` in `App.tsx`, come «Record» della scheda dello sci),
  con lo sport di sempre. Nessuna regola nuova sulla visibilità.
- Il «+» c'è **con un account**, anche senza il selettore di file (c'è
  sempre «Record now»); senza account non c'è, come oggi.
- Titolo e etichetta «Add to Feed»; i testi nuovi nelle cinque lingue; la
  privacy del punto 7 a turno, col sì dell'utente sulle quattro traduzioni.
- Se TASK-312 C2 è già in `main`, «Photos only» passa dalla sua posizione nel
  foglio alla seconda riga della lista, con il suo flusso invariato.
- Niente server, niente impronta nativa.

*Deciso dall'agente su delega dell'utente*: la lista prima del flusso, il
file delle voci, «‹» per tornare, il «+» anche senza selettore.

**Ordine con TASK-312 C2**: C2 tocca adesso `AddToFeed.tsx`,
`AddToFeed.test.tsx`, `FeedScreen.tsx`, `FeedScreenAdd.test.tsx` e le
`i18n`. **A parte dopo il merge di C2** (approvato dal Coordinatore il
2026-11-21), dal `main` che ha già «Photos only» nel foglio. Ordine sui
file del Feed: 355 B2, 312 C2, 481 A, 309 B2. `App.tsx`: una riga, merge
di `main` prima del push. Privacy a turno, in coda dopo 309 B1, 417 D2 e
312 C2: il Coordinatore dice quando tocca.

**Com'è venuta (2026-11-22).** C2 ha messo «Photos only» dentro le scelte di
`AddPastActivity`: aperto da «From a file» della lista, avrebbe mostrato di
nuovo «Photos only», e l'ordine scelto non avrebbe tenuto. Quindi:

- «Photos only» della lista apre direttamente `PhotoPostForm` (il flusso di
  C2, invariato); «Cancel» e «‹» tornano alla lista;
- `AddPastActivity` prende una prop facoltativa `fileAtOnce`: con `opened`,
  solo «From a file», e «Files» si apre subito al tocco della riga; dopo un
  annullamento o un problema resta la scelta «From a file» con il suo aiuto.
  In «My activities» non cambia niente (`AddPastActivity.test.tsx` verde
  senza ritocchi). File in più approvato dal Coordinatore il 2026-11-22;
- «Record now» fa quello che fa l'avvio senza percorso di «Draw» per lo
  sport scelto (palestra, stretching, ciaspole con il loro avviso, altrimenti
  `setScreen("run")`): con la palestra `setScreen("run")` da solo avrebbe
  aperto la corsa;
- il titolo del foglio è quello della voce aperta («Photos only», «From a
  file»); sulla lista «Add to Feed». «Add activity» esce dalle `i18n`;
- il «+» senza selettore c'era già (C2).

*Deciso dall'agente su delega dell'utente*: `fileAtOnce`, il titolo della
voce aperta, «Record now» come l'avvio di «Draw».

**File toccati (approvati dal Coordinatore il 2026-11-21):**

```
apps/mobile/src/feed/AddToFeed.tsx                (la lista, poi il flusso scelto)
apps/mobile/src/feed/AddToFeed.test.tsx
apps/mobile/src/feed/addToFeedEntries.ts          (nuovo: le voci in ordine, ognuna con «pronta»)
apps/mobile/src/feed/addToFeedEntries.test.ts     (nuovo)
apps/mobile/src/screens/FeedScreen.tsx            (onRecord al «+»; il «+» anche senza selettore)
apps/mobile/src/screens/FeedScreenAdd.test.tsx
apps/mobile/App.tsx                               (una prop: onRecord del Feed → setScreen("run"))
apps/mobile/src/i18n/{it,de,fr,es}.ts
docs/IMPORTAZIONI.md                              (§2: il «+» con la lista)
docs/tasks/TASK-481.md
apps/mobile/src/imports/AddPastActivity.tsx       (in più, approvato il 2026-11-22: `fileAtOnce`)
```

A turno (privacy, punto 7):

```
apps/mobile/src/about/content/{en,it,de,fr,es}.ts
apps/mobile/src/about/documents.test.ts           (+ AboutPage.test.tsx, site/tests/privacy.test.mjs: la data)
site/privacy/**/index.html                        (rigenerate con make_privacy.mjs)
```

### B — «Photos only» (TASK-312 C2)

Già in corso, con i suoi file. Testi, «Chi lo vede» e riga di privacy già
approvati dall'utente il 2026-11-21 (`TASK-312.md`).

### C — «Sleep» (TASK-467 parte E)

Un post del sonno da solo, pubblicato dal «+»: che cosa mostra, da quale
notte, e la riga di privacy si decidono con l'utente in TASK-467. Entra
dopo la parte C del sonno (la build nativa con il permesso nuovo). Aggiunge
la sua riga in `addToFeedEntries.ts`.

### D — «Gym workout» scritto a mano (TASK-484)

Un allenamento in palestra già fatto: esercizi, serie, pesi (l'editor della
palestra di oggi), giorno e durata; poi il modulo del post della palestra
(`GymPostForm`) con «Imported» e «Everyone». *Proposta tecnica di partenza,
da verificare nel suo task*: una corsa di `activity` palestra senza traccia,
con un valore nuovo di `runs.source` (oggi `muw` e `file`), fuori dal gioco,
dal concorso, dai livelli e dalla classifica della palestra come le
attività importate (ADR-0272). Server prima dell'app, migrazione se serve,
riga di privacy, testi all'utente.

### E — «Workout plan» pubblicata (TASK-485)

Una scheda della palestra (`gym_plans`, ADR-0360) diventa un post; chi la
vede la copia con «Use this plan» fra le sue schede. *Proposta tecnica di
partenza*: un disegno senza corsa come il post di sole foto (ADR-0272
precisazione C) con il riferimento alla scheda, così reazioni, commenti,
segnalazioni, blocchi e nascosti valgono senza tabelle nuove; un tipo nuovo
in `X-MuW-Reads`. Da tenere vicino a TASK-466 E (la routine di stretching
pubblicata), che ha la stessa forma; il Coordinatore ha scelto due task
separati (2026-11-21). Server prima dell'app, riga di privacy, testi all'utente.

### F — «Already recorded»: pubblicare un'attività già fatta (TASK-481, solo app, esce con un OTA)

**Da dove viene.** Provando la build di prova il 2026-11-23 l'utente ha
chiesto di aggiungere al «+» «un'attività già registrata». Al Coordinatore
ha chiarito: **«Pubblicarne una già fatta»**, cioè mettere nel Feed
un'attività che è in «My activities» ma non è ancora un post (per esempio
la corsa di ieri non condivisa). Non è l'inserimento a mano di un'attività
passata: «Add past activity» esiste già.

**Come un'attività diventa post, oggi.** Quando la sua visibilità passa da
«Only me» a «Everyone» o «Followers»: è quello che fa la scheda «Edit post»
della card di «My activities» (`PublicRow`, `DrawingsDoor.choose`).
`publicKeys` dice quali attività gli altri vedono già. **Nessuna API
nuova**, niente server, niente impronta nativa.

**Scelte dell'utente (2026-11-23):**

1. **Il modulo.** Proposta, **accettata («Quello di «Edit post»»)**: scelta
   l'attività, si apre il modulo di «Edit post» così com'è (titolo,
   descrizione, foto, tag, attività, «Who can see it»). Parte da dov'è
   l'attività («Only me»); un tocco su «Everyone» o «Followers» la mette nel
   Feed, salvata subito o con la prossima rete. Scartato: un modulo nuovo
   che parte da «Everyone» con un bottone «Post», senza foto.
2. **I testi.** Inglese approvato dal Coordinatore, italiano **approvato
   dall'utente («Approvo»)**; tedesco, francese e spagnolo dell'agente:

   | Dove | Inglese | Italiano |
   |---|---|---|
   | La voce | «Already recorded» | «Già registrata» |
   | Riga sotto | «Post an activity from My activities» | «Pubblica un'attività da Le mie attività» |
   | Sopra la lista | «Your activities not in the Feed yet, the latest first.» | «Le tue attività non ancora nel Feed, dalla più recente.» |
   | Lista vuota | «All your activities are in the Feed already.» | «Tutte le tue attività sono già nel Feed.» |
   | Sopra il modulo | «Choose «Everyone» or «Followers» and it goes in the Feed.» | «Scegli «Tutti» o «Follower» e va nel Feed.» |

3. **Le schermate** dal simulatore (il «+», la lista, il modulo con
   «Everyone», il post nel Feed): **approvate dall'utente («Approvo»)**,
   2026-11-23.

**Com'è fatta (#1478, `b762a847`).**

- `addToFeedEntries.ts`: la voce `done`, **seconda dopo «Record now»**
  (le due voci delle attività vicine: adesso, già fatta), sempre pronta
  (il «+» c'è solo con un account).
- `PastActivityPost.tsx` (nuovo): le attività di `useActivitiesDoor().list`
  senza quelle in `publicKeys`, dalla più recente, con «Show more»; ogni
  riga come in «My activities» ma senza «…»; l'attività scelta apre
  `PublicRow` con «Done». Alla lista chiede di nuovo le attività e quali
  sono pubbliche, così tornando dal modulo quella appena pubblicata sparisce.
- `AddToFeed.tsx`: il flusso nel foglio; «‹» dal modulo torna alla lista,
  poi alle voci; `onActivityPosted` quando il foglio si chiude dopo che
  un'attività è stata aperta. `FeedScreen.tsx`: `onActivityPosted` rilegge il
  Feed, come `onSleepPost`.
- Testi nelle quattro lingue; `addToFeedEntriesSleep.test.ts` (TASK-467 E)
  adeguato alla voce nuova, file in più approvato dal Coordinatore.
- Nessuna riga di privacy nuova: è la stessa scelta «Who can see it» di
  «Edit post», e la frase del «+» parla solo di «from a file».

*Deciso dall'agente su delega dell'utente*: la posizione dopo «Record
now», il riuso di `PublicRow` senza ritocchi, `PastActivityPost.tsx` come
file nuovo, la rilettura del Feed alla chiusura del foglio.

**File toccati (approvati dal Coordinatore il 2026-11-23):**

```
apps/mobile/src/feed/addToFeedEntries.ts
apps/mobile/src/feed/addToFeedEntries.test.ts
apps/mobile/src/feed/AddToFeed.tsx
apps/mobile/src/feed/AddToFeed.test.tsx
apps/mobile/src/feed/PastActivityPost.tsx         (nuovo)
apps/mobile/src/feed/PastActivityPost.test.tsx    (nuovo)
apps/mobile/src/screens/FeedScreen.tsx            (una prop: onActivityPosted)
apps/mobile/src/i18n/{it,de,fr,es}.ts
apps/mobile/src/feed/addToFeedEntriesSleep.test.ts (in più, approvato il 2026-11-23)
docs/tasks/TASK-481.md                            (questa PR docs, a parte)
```

**Resta**: merge di #1478 e OTA (Coordinatore), prova sul telefono.

## Criteri di accettazione

- [x] **0**: scelte dell'utente scritte qui e in ADR-0390; mappa voce → task;
      lista dei file della parte A al Coordinatore.
- [ ] **A**: il foglio apre la lista; «From a file» come prima (i test di
      `AddPastActivity.test.tsx` verdi senza ritocchi); «Record now» apre la
      registrazione; il «+» senza selettore ha «Record now»; nessuna voce
      non pronta (test).
- [ ] **A**: schermate dal simulatore e quattro traduzioni approvate
      dall'utente; privacy del punto 7 nelle cinque lingue e sul sito.
- [ ] **A**: `tsc` e jest dei file toccati verdi, CI verde.
- [ ] Ogni voce delle parti B–E nel foglio, col suo task chiuso.
- [ ] **F**: «Already recorded» elenca le attività non ancora nel Feed e
      apre il modulo di «Edit post»; testi e schermate approvati dall'utente
      (2026-11-23); jest dei file toccati, `tsc`, CI verdi (#1478); merge e
      OTA.

## Fuori scope

- Strava via API, Instagram collegato (sopra).
- Apple Salute come voce («From Apple Health»): studio di TASK-312 D, build
  nativa; si aggiunge con quella parte, se l'utente la vuole nel «+».
- «Open in MuW» da altre app (build nativa dopo la 1.1).
- Un'attività qualsiasi scritta a mano senza GPS (idea 4 di TASK-476):
  oggi solo la palestra (parte D).

## Esito

*(si compila a fine task)*
