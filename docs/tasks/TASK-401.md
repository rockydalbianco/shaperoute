# TASK-401 — Le indicazioni a schermo bloccato: la notifica subito, la Live Activity nella 1.0.3

**Stato**: Todo · proposta (parte 0) in PR; nessun codice prima delle scelte
dell'utente e del via del Coordinatore sulla lista dei file
**Fase**: 5 · **Branch**: `docs/TASK-401-lock-screen-directions` (documenti);
il codice `feat/TASK-401-a-…`, `feat/TASK-401-b-…`
**ADR**: ADR-0335 (proposto) · numeri dal Coordinatore il 2026-11-05

## Obiettivo

Con l'iPhone bloccato, durante una corsa con un percorso, chi corre **vede**
la prossima indicazione senza sbloccare: la freccia, «Turn right» o «Turn
left», i metri che mancano e la percentuale del disegno fatta. Oggi la sente
soltanto (la voce, ADR-0225).

Richiesta dell'utente del 2026-11-05: «Dai le indicazioni del percorso
anche da iPhone bloccato con una notifica esterna, quella percentuale svolta
a destra, sinistra, eccetera». Alla domanda «Come vuoi le indicazioni a
schermo bloccato?» ha scelto **«Live Activity, poi anche OTA»**: subito, con
un OTA, una notifica che si sostituisce a ogni svolta; nella build 1.0.3 la
Live Activity vera (il riquadro fisso sul lock screen e nella Dynamic
Island), contro «Solo Live Activity (1.0.2)» e «Solo notifica via OTA».

## Contesto da leggere

- `DECISIONS.md` ADR-0335 (questo task), ADR-0225 e la sua aggiunta (la corsa
  a schermo bloccato, iOS e Android), ADR-0045 (le svolte dal grafo),
  ADR-0314 (TASK-370, l'Apple Watch: la stessa dipendenza nativa)
- `apps/mobile/src/navigation/runPosition.ts` (il task di posizione che gira
  a schermo bloccato), `navigator.ts` (`onFix`, `upcoming`, `remainingM`),
  `screens/NavigateScreen.tsx` (`doneOf`, «{percent}% drawn»)
- `apps/mobile/src/gym/restAlert.ts`: la notifica locale di fine recupero
  (TASK-385 B), lo stesso schema per il permesso e per toglierla

## Com'è oggi (main `0ffada6b`)

1. **A schermo bloccato la corsa va avanti**: su iOS le posizioni arrivano al
   task `muw-run-location` di expo-task-manager (TASK-261), che chiama lo
   stesso `onFix` della schermata; la voce dice le svolte a 50 m
   (`ANNOUNCE_M`, più lontano in bici) e vibra. iOS mostra la barra blu.
2. **Sul lock screen non c'è niente di MuW**: nessuna notifica durante la
   corsa, nessuna Live Activity. Su Android c'è solo la notifica fissa del
   servizio, «MuW is recording your activity», che non cambia.
3. **I dati ci sono già tutti nel JavaScript**: la prossima svolta
   (`upcoming`, con il frasario di `phrases.ts`), i metri che mancano, la
   percentuale (`doneOf`, mostrata come «{percent}% drawn»), il fuori rotta e
   il rientro (TASK-303).
4. **`expo-notifications` è già nella build** (1.0.1, impronta iOS
   `6f8bba4c`): la usa `restAlert.ts` per le notifiche locali. Una notifica
   nuova è solo JavaScript: arriva con un OTA.
5. **Nessun codice nativo per i widget**: non esistono `apps/mobile/targets/`
   né un modulo per ActivityKit; `app.json` non ha `NSSupportsLiveActivities`.

## Come è fatta (proposta)

### Il principio

Quello che si vede a schermo bloccato è **la stessa indicazione che dice la
voce**, nello stesso momento, calcolata dallo stesso `onFix`: nessuna
seconda logica di guida. Il lock screen è un'altra uscita del navigatore,
come la voce e la vibrazione.

### A — La notifica (OTA, solo JavaScript)

- Un modulo nuovo `navigation/lockNotice.ts` con un'interfaccia
  sostituibile nei test, come `RestNotifier`.
- **Quando**: solo con l'app dietro o il telefono bloccato (`AppState` non
  `active`), e solo durante una corsa con un percorso. Una notifica quando la
  voce annuncia una svolta; una quando si esce di rotta («Off the route») e
  una quando si rientra. A fine corsa, e quando l'app torna davanti, si
  toglie.
- **Una sola alla volta**: sempre lo stesso identificativo, così iOS
  sostituisce quella di prima invece di accumularle.
- **Senza suono**: parla già la voce; la notifica si vede e basta (su
  Android un canale suo «Directions», importanza bassa).
- **Cosa dice** (scelta dell'utente del 2026-11-05, «Frase della voce +
  %»): il titolo è **la stessa frase che dice la voce** in quel momento,
  con la freccia davanti («↱ In 50 m, turn right onto Via Roma»); fuori
  rotta «⚠ Off the route». Sotto, sempre: «42% drawn · 3.1 km left». Unico
  testo nuovo «{distance} left».
- **Il permesso** è quello delle notifiche push, chiesto come per il
  recupero della palestra; rifiutato, resta la voce come oggi.
- Limite: una notifica non si aggiorna da sola metro per metro; mostra i
  metri del momento dell'annuncio. Il conto alla rovescia è della parte B.

### B — La Live Activity (build 1.0.3, nativo)

- **Il riquadro sul lock screen**: freccia grande, metri alla svolta,
  «Turn right», la via, una barra con la percentuale e i km che mancano.
  **Nella Dynamic Island** (iPhone 14 Pro e più nuovi): compatta, freccia a
  sinistra e metri a destra; espansa, come il riquadro. Dagli iPhone
  senza isola si vede solo sul lock screen. Su un Apple Watch con watchOS 11
  la stessa Live Activity compare da sola nello Smart Stack.
- **Si aggiorna dal telefono**, non da un server: il task di posizione
  chiama `update` quando cambia qualcosa che si vede (i metri arrotondati a
  10, la percentuale intera, la svolta, il fuori rotta), al massimo una volta
  al secondo. Nessuna push di ActivityKit, nessun server toccato.
- **Parte** con «Start» di una corsa **con percorso** (senza percorso
  niente, scelta 3b) e **finisce** a fine corsa: all'arrivo resta 5 minuti
  col riepilogo, con «Stop» sparisce subito (scelta 4); si chiude da sola
  se l'app viene chiusa a mano.
- **Con la Live Activity attiva, la notifica della parte A non si manda**:
  una cosa sola sul lock screen.
- **Il nativo**: un widget extension SwiftUI (`ActivityConfiguration`) in
  `apps/mobile/targets/live-activity/`, generato a ogni `prebuild` da
  `@bacons/apple-targets`; un modulo Expo locale piccolo
  (`apps/mobile/modules/live-activity/`, Swift + `ActivityKit`) con tre
  funzioni, `start`, `update`, `end`; `NSSupportsLiveActivities` in
  `app.json`. ActivityKit chiede iOS 16.1 (il minimo di SDK 57 è da
  verificare).
- **L'impronta iOS cambia**: arriva solo con una build per l'App Store. Il
  codice JavaScript che la chiama controlla che il modulo ci sia, così un
  OTA con la parte B non rompe chi ha la 1.0.1: lì resta la notifica.

### La dipendenza nativa, con TASK-370

`@bacons/apple-targets` è la stessa dipendenza che TASK-370 (l'app per Apple
Watch, sessione «Apple Watch app status») porta nella build 1.1, con il sì
dell'utente del 2026-10-30 dato per TASK-323 E. Se la Live Activity va
nella 1.0.3, **la dipendenza arriva prima** e la aggiunge **TASK-401 B**:
`package.json`, il plugin in `app.json`, la cartella `apps/mobile/targets/`
con la sola sottocartella `live-activity/`. TASK-370 A2 la trova già lì e
aggiunge `targets/watch/` accanto, senza toccare quella della Live Activity.
Versione e posto del plugin si concordano con la sessione di TASK-370
prima di scrivere codice; la lista dei file va al Coordinatore.

**Accordo con TASK-370** (sessione «Apple Watch app status», 2026-11-05;
scritto anche in `tasks/TASK-370.md` con la loro PR #849, che qui non si
tocca):

1. TASK-401 B mette nella 1.0.3 `@bacons/apple-targets` **5.0.0**, il
   plugin in `app.json` (una sola config) e `apps/mobile/targets/
   live-activity/`.
2. Il plugin va con **`"match": "live-activity"`**. Senza opzioni la 5.0.0
   costruisce ogni `targets/*/expo-target.config.js` (`match = "*"`): il
   target dell'orologio entrerebbe nella 1.0.3 appena TASK-370 A2 mette
   `targets/watch/expo-target.config.js` in `main`. `targets/watch/Core/`
   (A1, già in `main`) non ha quel file e non conta.
3. TASK-370 A2 mette `targets/watch/` accanto e non tocca `live-activity/`;
   con `MUW_WATCH=1` il loro `app.config.ts` allarga `match` a
   `{live-activity,watch}`; il loro A-flip, alla 1.1, allarga `match` in
   `app.json`.
4. La PR della parte B scrive l'impronta iOS della 1.0.3 che ne esce: è il
   nuovo riferimento di TASK-370.

**Rilascio (Coordinatore, 2026-11-06)**: l'utente ha cambiato piano. La 1.0.2 è
uscita solo per gli screenshot; il giro nativo, con la parte B, è la **1.0.3**.
Dove sopra le scelte dell'utente citano la 1.0.2, ora vale la 1.0.3.

La 1.0.3 è già condivisa (video nei messaggi 333 E; testo della chiave di
Salute 374 C, 345 C, 397 C; accesso con Apple e Google 322): l'ordine lo
tiene il Coordinatore con l'utente.

### Le scelte ancora aperte (una alla volta, all'utente)

1. ~~Notifica, Live Activity o tutte e due~~ → tutte e due (2026-11-05).
2. ~~Parte A, i testi~~ → **«Frase della voce + %»** (2026-11-05, contro
   «Corta, stile navigatore»): il titolo è la frase che dice la voce, già
   approvata e tradotta; fuori rotta «Off the route», che c'è già; sotto
   «42% drawn · 3.1 km left». Unico testo nuovo «{distance} left», con la
   distanza nelle unità scelte (km o mi), da tradurre in cinque lingue.
3. ~~Parte B, cosa mostra~~ → **«Solo la guida»** (2026-11-05, contro
   «Guida + numeri della corsa»): sul lock screen freccia, metri alla
   svolta che scendono, la svolta in breve («Turn right») e la via; sotto
   una barra con la % disegnata e la distanza che manca. Nell'isola
   compatta la freccia a sinistra e i metri a destra; espansa come il
   riquadro. Fuori rotta «⚠» e i metri per rientrare. Niente tempo, passo
   o distanza fatta.
3b. ~~Senza percorso~~ → **«No, solo con percorso»** (2026-11-05, contro
   «Sì, con i numeri»): nelle corse senza percorso nessuna Live Activity.
4. ~~Parte B, la fine~~ → **«Riepilogo per qualche minuto»** (2026-11-05,
   contro «Sparisce subito»): all'arrivo il riquadro mostra «✓ You have
   arrived.» (il testo che la schermata ha già) e la barra al 100%, e
   sparisce da solo dopo 5 minuti (`dismissalPolicy: .after`); con «Stop»
   prima dell'arrivo sparisce subito.
5. ~~La dipendenza~~ → **«Sì, nella 1.0.2»** (2026-11-05): l'utente dà il
   sì a `@bacons/apple-targets` 5.0.0 e al modulo locale in Swift nella
   build 1.0.3. Manca il via del Coordinatore sulla lista dei file.

## Cosa fare

**Parte 0 (questa PR)**: questo file, ADR-0335 «Proposto», le righe in
`STATUS.md`.

**Parte A** (scelta 2 fatta; parte col via del Coordinatore):
1. `navigation/lockNotice.ts` + test: quando parte, cosa dice, che si
   sostituisce, che si toglie a fine corsa e con l'app davanti, che col
   permesso rifiutato non fa niente.
2. Il collegamento in `useNavigation.ts`, dove la voce dice la svolta.
3. Il testo nuovo in `src/i18n/{it,de,fr,es}.ts`.
4. Prova nel simulatore a schermo bloccato con la corsa simulata.

**Parte B** (dopo le scelte 3–5, nella 1.0.3):
1. `@bacons/apple-targets`, `targets/live-activity/` (SwiftUI), il modulo
   locale, `NSSupportsLiveActivities`.
2. `navigation/liveActivity.ts` + test (quando parte, quando si aggiorna,
   il limite di una volta al secondo, il ritorno alla notifica senza il
   modulo).
3. Prova nel simulatore (lock screen e Dynamic Island) e sull'iPhone con la
   build di prova.

## Criteri di accettazione

**Parte A**
- [ ] Con il telefono bloccato e una corsa con percorso, a ogni svolta
      annunciata dalla voce c'è una notifica con freccia, svolta, metri e
      percentuale, e una sola alla volta.
- [ ] La notifica non suona; a fine corsa e con l'app davanti sparisce.
- [ ] Col permesso delle notifiche rifiutato la corsa va come oggi.
- [ ] L'impronta iOS di `main` non cambia (OTA).
- [ ] Test deterministici verdi.

**Parte B**
- [ ] Sul lock screen e nella Dynamic Island la Live Activity mostra la
      prossima svolta con i metri che scendono e la percentuale, e finisce
      con la corsa.
- [ ] Con la Live Activity attiva la notifica della parte A non parte.
- [ ] Su una build senza il modulo (1.0.1) un OTA con la parte B dà la
      notifica della parte A, senza errori.
- [ ] Test deterministici verdi; la build 1.0.3 si costruisce con
      `targets/live-activity/`.

## File toccati

Parte 0:

```
docs/tasks/TASK-401.md
docs/DECISIONS.md
docs/STATUS.md
```

Parte A (lista per il Coordinatore, 2026-11-05):

```
apps/mobile/src/navigation/lockNotice.ts          (nuovo)
apps/mobile/src/navigation/lockNotice.test.ts     (nuovo)
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/notifications/pushDevice.ts       (una riga)
apps/mobile/src/i18n/{it,de,fr,es}.ts
```

`apps/mobile/locales/*.json` **non si tocca** (Coordinatore, 2026-11-05):
sono i testi nativi dei permessi iOS che `app.json` carica, e cambiarli
muove l'impronta iOS. «{distance} left» va nelle tabelle dell'app
`src/i18n/`, con l'inglese come chiave. L'impronta iOS va misurata su una
copia staccata e deve restare `6f8bba4c`.

Cosa si riusa, senza toccarlo: `askPushPermission` e `pushPermission` di
`notifications/pushDevice.ts` (il permesso, come `restAlert.ts` di TASK-385
B) e lo schema di `PHONE_NOTIFIER` (una notifica locale con un tipo nei
`data`); `restAlert.ts` non si modifica. In `pushDevice.ts` una riga sola:
il tipo nuovo `run_directions` in `QUIET_WHILE_OPEN`, così una notifica
arrivata mentre l'app torna davanti non compare come banner. Il punto
d'aggancio è `useNavigation.ts`, dove `onFix` restituisce le frasi che la
voce dice (`cue`): lì, con l'app dietro, la stessa frase va anche a
`lockNotice`. `NavigateScreen.tsx` non si tocca (`doneOf` e `remainingM`
si calcolano dalla `Navigation`, che `useNavigation` ha già).

Parte B (lista per il Coordinatore, 2026-11-05):

```
apps/mobile/package.json                          (@bacons/apple-targets 5.0.0)
package-lock.json
apps/mobile/app.json                              (plugin con "match": "live-activity",
                                                   NSSupportsLiveActivities)
apps/mobile/targets/live-activity/**              (nuovo: expo-target.config.js, widget SwiftUI)
apps/mobile/modules/live-activity/**              (nuovo: modulo Expo locale, Swift +
                                                   index.ts; start, update, end)
apps/mobile/src/navigation/liveActivity.ts        (nuovo)
apps/mobile/src/navigation/liveActivity.test.ts   (nuovo)
apps/mobile/src/navigation/useNavigation.ts       (parte con un percorso; la notifica
                                                   della parte A solo senza modulo)
apps/mobile/src/i18n/{it,de,fr,es}.ts             (solo se servono testi brevi nuovi)
apps/mobile/plugins/watchConfig.test.ts           (di TASK-370; via del Coordinatore
                                                   2026-11-06: il test passa con e
                                                   senza la parte B)
```

Fuori percorso, con la via di ritorno sulle strade di TASK-314 B (ADR-0274,
precisazione B punto 7), `liveStateOf` legge `navigation.wayBack` con
`upcomingOnWay`: la Live Activity mostra la stessa svolta di voce, banner e
notifica. Senza via, i metri in linea d'aria di `navigation.rejoin`.

Il tipo degli attributi della Live Activity (`ActivityAttributes`) sta sia
nel modulo sia nel target, uguale: i due binari non condividono codice.
Niente `targets/_shared/`, perché con l'orologio entrerebbe anche nel suo
target. `NavigateScreen.tsx` e `lockNotice.ts` non si toccano.

## Fuori scope

- Le indicazioni sull'Apple Watch: sono di TASK-370.
- Push di ActivityKit dal server (aggiornare la Live Activity con l'app
  chiusa): la corsa tiene l'app viva, non serve.
- Cambiare la notifica fissa del servizio su Android: la parte A manda la
  sua, accanto.
- Le Live Activity per altro (gruppi, contest, recupero della palestra).
- Toccare la logica delle svolte (`navigator.ts`, `phrases.ts`).

## Esito

*(si compila a fine task)*
