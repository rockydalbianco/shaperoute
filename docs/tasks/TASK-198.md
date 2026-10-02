# TASK-198 — La penna alzata nella corsa: pausa automatica e avviso a voce

**Stato**: Done (2026-10-02; il merge è del coordinatore)
**Fase**: 4 · **Branch**: `feat/TASK-198-pen-up-run`
**ADR**: ADR-0157 per il contratto (scritto da TASK-197); un ADR nuovo
dal coordinatore solo se serve una scelta dell'app
**Dipende da**: TASK-197 in `main` e sul server (l'aggiornamento del server
solo con l'ok dell'utente)

## Obiettivo

Correndo una parola chiesta con la penna alzata, l'app mette in pausa la
registrazione da sola alla fine di ogni lettera e la fa ripartire
all'inizio della successiva, dicendolo a voce. Sulla mappa i tratti a piedi
si vedono tratteggiati. Il punteggio di fine corsa guarda solo le lettere.

Chiesto e confermato dall'utente il 2026-10-02: «pausa automatica con
avviso a voce».

## Contesto da leggere

- `docs/tasks/TASK-197.md`: `pen_up` nella richiesta, `walks` nel
  risultato
- `docs/API.md` «`POST /routes`», «`POST /track-scores`»
- `docs/UI.md`: la corsa, la mappa, la voce
- `apps/mobile/src/navigation/trackRecorder.ts`: le pause (TASK-169,
  ADR-0137), con quella automatica di chi sta fermo
- `apps/mobile/src/navigation/runControl.ts`, `navigator.ts`,
  `progress.ts`, `phrases.ts`

## Cosa fare

1. **La richiesta**: in «Draw», con una parola, l'interruttore «Lift the
   pen between letters». **Acceso di default: da confermare con
   l'utente** (proposta della sessione social del 2026-10-02). Acceso,
   la richiesta manda `pen_up: true`.
2. **La mappa**, nella scelta del percorso e nella corsa: le lettere come
   oggi, i tratti a piedi tratteggiati, con un colore da
   `src/theme/tokens.ts` (aggiungerlo lì se manca). Un risultato senza
   `walks` si disegna come oggi.
3. **La pausa automatica**: quando chi corre arriva all'inizio di un tratto
   a piedi, l'app mette in pausa la registrazione, una pausa di tipo nuovo
   («penna»), che non si confonde con quella di chi sta fermo né con quella
   chiesta a mano. Quando arriva entro pochi metri dall'inizio della
   lettera successiva, la registrazione riparte. La soglia si sceglie con
   la precisione del GPS (`POOR_FIX_M`) e si scrive in `UI.md`.
4. **L'avviso a voce**, in inglese come il resto dell'interfaccia: alla
   fine di una lettera, per esempio «Letter done. Walk to the A: the
   drawing is paused.»; all'inizio della successiva, «Pen down: draw the
   A.». Le indicazioni di svolta continuano anche a piedi.
5. **I numeri della corsa**: tempo e distanza non contano i tratti a piedi.
   Viene già dalle pause; un test lo controlla.
6. **Il punteggio**: `POST /track-scores` riceve anche i `walks`.
7. **La corsa salvata e Strava**: le pause «penna» vanno con le altre. Il
   GPX per Strava apre già un segmento nuovo a ogni pausa: Strava mostra
   le lettere unite da linee dritte sulla base. Se l'API vuole sapere che
   una pausa è «penna», è un campo in più, da concordare con il
   coordinatore.
8. **Chi mette in pausa a mano** durante un tratto a piedi: la pausa resta
   sua, e la ripartenza all'inizio della lettera non la toglie.

## Criteri di accettazione

- [x] Con l'interruttore acceso la richiesta ha `pen_up: true`; spento, o
      con una forma, il campo non c'è.
- [x] Un risultato con `walks` disegna i tratti a piedi tratteggiati, nel
      colore preso da `tokens.ts`; uno senza `walks` resta com'è.
- [x] Test con posizioni simulate lungo una parola di 3 lettere: due pause
      «penna», ognuna dall'inizio di un tratto a piedi a pochi metri
      dall'inizio della lettera successiva; i due avvisi a voce, una volta
      sola ciascuno.
- [x] La distanza e il tempo della corsa non contano i tratti a piedi:
      test.
- [x] Una pausa chiesta a mano durante un tratto a piedi non viene tolta
      dalla ripartenza automatica: test.
- [x] Il punteggio manda i `walks`: test.
- [x] Test, lint, `tsc` e `npm run format:check` verdi.

## File toccati

Elenco previsto; la PR dichiara i suoi.

```
apps/mobile/src/navigation/trackRecorder.ts
apps/mobile/src/navigation/runControl.ts
apps/mobile/src/navigation/navigator.ts
apps/mobile/src/navigation/progress.ts
apps/mobile/src/navigation/phrases.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/useRouteRequest.ts
apps/mobile/src/api/trackScores.ts
apps/mobile/src/theme/tokens.ts
apps/mobile/src/**/*.test.ts(x)
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-198.md
```

Quelli della PR, file per file (i nuovi segnati):

```
apps/mobile/App.tsx
apps/mobile/__tests__/AppPenUp.test.tsx                 (nuovo)
apps/mobile/src/api/trackScores.ts
apps/mobile/src/api/trackScores.test.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/MapView.test.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPage.test.ts
apps/mobile/src/map/messages.ts
apps/mobile/src/map/messages.test.ts
apps/mobile/src/navigation/penUp.ts                     (nuovo)
apps/mobile/src/navigation/penUp.test.ts                (nuovo)
apps/mobile/src/navigation/penUpRun.test.ts             (nuovo)
apps/mobile/src/navigation/phrases.ts
apps/mobile/src/navigation/runControl.ts
apps/mobile/src/navigation/trackRecorder.ts
apps/mobile/src/navigation/trackStore.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx
apps/mobile/src/route/useRouteRequest.ts
apps/mobile/src/route/useRouteRequest.test.ts
apps/mobile/src/route/walks.ts                          (nuovo)
apps/mobile/src/route/walks.test.ts                     (nuovo)
apps/mobile/src/theme/tokens.ts
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-198.md
```

Fuori dall'elenco previsto, e perché (nessuna PR aperta li toccava il
2026-10-02; nessun task in lavorazione li elenca):

- `App.tsx`: tiene lo stato dell'interruttore e compone la richiesta (come
  per `style`); passa i `walks` e la parola del percorso alla navigazione e
  alla mappa, e nessun `walks` a una corsa di «My activities».
- `map/messages.ts` e `map/mapPage.ts`: la mappa è una pagina web; il
  messaggio `showRoute` porta lettere e tratti a piedi separati, e la
  pagina ha lo strato tratteggiato `walks`. Senza `walks` il messaggio è
  identico a prima.
- `navigation/trackStore.ts`: il file della corsa tiene i `walks` per il
  punteggio e deve rileggere una pausa con `pen: true` (prima l'avrebbe
  scartata come file rotto); il registratore ha `liftPen` e `lowerPen`.
- `__tests__/AppPenUp.test.tsx`: la richiesta e il GPX si vedono solo
  dall'app intera, come negli altri test di `__tests__/`.
- File nuovi (`penUp.ts`, `walks.ts` e i loro test): non hanno padroni.

Previsti e non toccati: `navigator.ts` e `progress.ts`. La penna legge i
metri lungo il percorso che il navigatore calcola già (`alongM`), e le
svolte vanno avanti sui tratti a piedi senza cambiare niente.
`src/theme/tokens.ts` è anche fra i file della parte app di TASK-187: il
token `walk` è aggiunto in fondo, senza toccare il resto.

## Fuori scope

- **Il motore e l'API**: TASK-197.
- **Le cifre** nelle parole e **le forme di più pezzi**: task a parte
  (TASK-197, «Fuori scope»).
- **L'orologio**: la pausa automatica è solo nell'app. Con il GPX
  sull'orologio si mette in pausa a mano, ai waypoint «Pause» e «Resume»
  di TASK-197.
- **Mostrare in «My activities» la corsa con i tratti a piedi spezzati**:
  oggi la linea registrata unisce le pause con una linea dritta, come fa
  Strava. Se l'utente la vuole spezzata, è un seguito.
- **Pubblicare l'app**: solo con l'ok dell'utente, da `origin/main` pulito.

## Esito

**Fatto**, l'app, dal branch `feat/TASK-198-pen-up-run`. Come funziona:
`UI.md`, «Forma e distanza», «Il risultato», «La navigazione», «La fine
della corsa», «Export del GPX».

- **La richiesta**: in «Draw», con una parola, l'interruttore «Lift the
  pen between letters» («On»/«Off» come quelli della corsa). Acceso,
  `pen_up: true` nella richiesta; spento, con una forma o un'immagine, il
  campo non c'è e la richiesta è quella di prima (test dell'app intera).
  `sameRequest` distingue la penna alzata.
- **La mappa**, nella scelta e nella corsa e a fine corsa: con i `walks` il
  messaggio `showRoute` porta le lettere (gialle, come il percorso) e i
  tratti a piedi (tratteggiati, sotto). Token nuovo `walk`: `textMuted`,
  largo 3, opacità 0,9, `line-dasharray` [2, 1,5]. Grigio e non giallo
  perché il giallo è il disegno. Senza `walks`, o con `walks` che non
  stanno nei `points` (`walksOf` in `src/route/walks.ts`), il messaggio è
  identico a prima. Sotto il risultato la riga «15.4 km of letters + 4.2 km
  walking between them»; la distanza grande resta `distance_m`.
- **La pausa «penna»**: `pen: true` nella pausa del file e `pen` nei
  controlli della corsa. `src/navigation/penUp.ts` decide su ogni posizione,
  dai metri lungo il percorso del navigatore: su alla fine di una lettera
  (primo punto del tratto), giù **20 m** prima della successiva
  (`PEN_DOWN_M` = `POOR_FIX_M` / 2), una mossa per posizione, nessuna con
  una posizione oltre `POOR_FIX_M`. La posizione che chiude una lettera è
  l'ultima della lettera, quella che la apre la prima della successiva
  (senza metri dal tratto a piedi). Una pausa da fermi alla fine di una
  lettera diventa «penna»; una del corridore resta sua e la ripartenza da
  sola non la toglie; «Resume» toglie anche la «penna».
- **La voce**: «Letter done. Walk to the U: the drawing is paused.» e «Pen
  down: draw the U.», con una vibrazione, una volta sola ciascuno, prima
  delle svolte; «the next letter» se la parola non ha una lettera più dei
  tratti. Le svolte continuano a piedi.
- **I numeri**: tempo e distanza non contano i tratti a piedi (sono
  pause); al più 20 m in più per lettera, quelli prima della lettera.
- **Il punteggio e il GPX**: il file della corsa tiene i `walks`;
  `toScoreRequest` li manda a `POST /track-scores` (uguale alla fixture
  `track-score-request-walks.json`), e «Export GPX» manda richiesta e
  risultato come sono arrivati, con `pen_up` e `walks`.

**Perché 20 m e i metri lungo il percorso**: una posizione tenuta sbaglia
fino a 40 m, in città 10–20 m; ripartendo 20 m prima una posizione in
ritardo prende lo stesso l'inizio della lettera, e i metri di tratto a piedi
che entrano il punteggio non li guarda. La distanza in linea d'aria
dall'inizio della lettera è stata scartata: la strada più breve può
passarle accanto dall'altra parte di un fiume e arrivarci dopo un ponte,
e la registrazione ripartirebbe lì, col navigatore perso.

**Test** (deterministici, timer finti dove si legge l'orologio):
`penUpRun.test.ts` cammina «SUN» (tre lettere in fila, posizioni ogni
20 m): due pause «penna», da 300 a 480 m e da 800 a 980 m; i quattro
avvisi una volta ciascuno, in ordine; distanza 920 m contro 1.280 corsi e
durata senza le due pause; la pausa a mano sul tratto a piedi che resta;
il file con i `walks` e la richiesta del punteggio con i `walks`; lo stesso
percorso senza `walks` come prima. Poi `penUp.test.ts` (la penna, la pausa
nel file, i controlli), `walks.test.ts`, e i test aggiunti in
`trackScores`, `messages`, `mapPage`, `MapView`, `useRouteRequest`,
`RoutePanel` e `AppPenUp`. Mutazioni provate a mano: senza `lowerPen`
cadono due test, con una ripartenza che toglie anche la pausa a mano ne
cadono tre.

**Non provato**: niente su un telefono. **Da provare sull'iPhone**,
camminando una parola vera: che la pausa e la ripartenza cadano dove
servono con il GPS vero, come suona la voce di iOS su «the U», che
l'interruttore e la riga dei km stiano bene sullo schermo, il tratteggio
sulla mappa. Chi lascia il percorso su un tratto a piedi non ha la
ripartenza da sola finché il navigatore non lo ritrova (niente ricalcolo,
ADR-0052): c'è «Resume».

**Aspettano l'utente** (scelte di prodotto, costruite con la proposta):

- l'interruttore **acceso di default**: per ora **spento**, su correzione
  del coordinatore del 2026-10-02 (l'app pubblicata non cambia senza il sì
  dell'utente, e un'API senza TASK-197 rifiuterebbe `pen_up`); la proposta
  sul tavolo resta acceso — **da confermare con l'utente**;
- i due testi della voce, quelli del punto 4 — **da confermare con
  l'utente**;
- i testi nuovi oltre quelli: la riga «… km of letters + … km walking
  between them» e «the next letter» — **da confermare con l'utente**.

**Seguiti** (non fatti, da chiedere al coordinatore): i `walks` in «My
activities» (l'API di TASK-172 non li prende: il suo punteggio confronta la
corsa con tutto il percorso, e la corsa riaperta è una linea sola; serve
un campo nell'API) e nei preferiti (tengono solo i `points`); se l'utente
vuole sulla scheda una scritta propria per la pausa «penna» al posto di
«Paused». **Nessun ADR nuovo**: le scelte dell'app stanno in `UI.md` sotto
ADR-0157.

**Si vede sul telefono solo dopo** l'aggiornamento del server con TASK-197
e la pubblicazione dell'app, tutti e due con l'ok dell'utente; con il
server vecchio e l'interruttore acceso la richiesta tornerebbe
`invalid_request`.
