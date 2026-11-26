# TASK-509 — Stati vuoti, icone di «Add to Feed», sagoma nelle tessere

**Stato**: In lavorazione · parte 0 (le scelte dell'utente) chiusa il
26 novembre 2026; il codice parte al «via al codice» del Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-509-part-0` (questo file), poi
`feat/TASK-509-a-empty-states`, `feat/TASK-509-b-add-icons`,
`feat/TASK-509-c-tile-outline`
**ADR**: nessuno nuovo; una precisazione ad ADR-0293 (la figura degli stati
vuoti), d'accordo col Coordinatore · numero di task dal «Coordinatore
(fork 3)» il 23 novembre 2026 (gruppo M di
`out/prova-app-2026-11-23/PROPOSTE.md`: U3, U15 e la sagoma in «Explore»)

## Obiettivo

Nella prova nel simulatore del 23 novembre 2026, su un account appena creato
e senza dati, tre cose: le pagine vuote non invitano a fare niente e il loro
disegno sembra un caricamento fermo; le righe di «Add to Feed» sono solo
testo; una tessera il cui percorso non c'è ancora è un riquadro nero. Alla
fine ogni pagina vuota ha il suo disegno finito e, dove serve, un pulsante;
ogni riga del «+» ha la sua icona; ogni tessera in attesa mostra la sagoma
della forma.

## Cosa era ancora vero il 26 novembre 2026 (`origin/main` c80aff30)

| Punto | Stato | Dove |
|---|---|---|
| U3 il cuore del Feed vuoto | vero, ed è voluto: `EmptyState` disegna la figura in grigio e il primo 16% in giallo, fermo (TASK-339, ADR-0293). È in 7 pagine: Feed, Messaggi, Preferiti, Ricerca, primo passo del profilo, «Style», «My activities» | `ui/EmptyState.tsx` |
| U3 «All» senza pulsante | vero: «Nobody has published anything yet.»; da disconnessi «Log in from Profile to see the activities.». «Following» senza seguiti ha già «Find people to follow» | `screens/FeedScreen.tsx` |
| U3 Coach vuoto | vero: sottotitolo «Based on your last 4 weeks», la scheda del corpo «This week» a 0% (la stessa di «Today»), la frase, nessun pulsante | `coach/CoachPage.tsx`, `trainingmode/WeekBodyCard.tsx` |
| U3 «Explore» senza partenza | vero: le città, la frase «Choose a start first: the routes are the ones near it.», «Ask for a route», poi niente; il sottotitolo parla di «dove sei» anche senza partenza | `explore/ExploreScreen.tsx` |
| U15 «Add to Feed» | vero: fino a sette righe di solo testo | `feed/AddToFeed.tsx`, `feed/addToFeedEntries.ts` |
| Sagoma nelle tessere | vero: `RouteCard` con `line={null}` è un riquadro vuoto in cinque posti — esempi della città, tessera in arrivo in «Explore», «NEAR YOU» in «Draw», «Explore» della pagaia, «WORDS». I primi quattro sanno la forma | `explore/RouteCard.tsx` e chi lo chiama |

Il contorno vero di ogni forma del catalogo c'è già: `route/ShapeGlyph.tsx`
(TASK-444). Le icone a linea dell'app sono PNG di Lucide a tre densità
(`assets/ui/icons/`, `assets/ui/tabs/`, TASK-444).

## Scelte dell'utente (2026-11-26, una domanda alla volta)

1. **La figura degli stati vuoti: «La A».** La figura intera si disegna in
   giallo una volta sola, poi resta ferma e completa; con «Riduci
   movimento» è già intera. Vale per tutte le pagine che usano
   `EmptyState`. Era proposta anche la B (solo grigio).
   Nel Feed «All» vuoto: con l'account, il pulsante **«Record now»** /
   «Registra ora» (testo di TASK-481), che avvia una registrazione come la
   prima voce del «+»; senza account, il pulsante **«Log in»** / «Accedi»,
   che apre la pagina di accesso. Le frasi restano. Il pulsante «Log in»
   è stato confermato a parte: «Sì, vanno bene».
2. **Coach vuoto: «Sì, così».** Senza allenamenti nelle ultime 4 settimane
   spariscono la scheda del corpo e il sottotitolo; restano la figura, la
   frase di oggi e il pulsante **«Go to your workouts»** / «Vai agli
   allenamenti» (testo nuovo), che chiude il Coach e lascia sulla pagina da
   cui è stato aperto («Today» o le schede della palestra). Coi consigli,
   «Based on your last 4 weeks» scende sopra i consigli, sotto la scheda
   del corpo. Senza account la pagina resta com'è.
3. **«Explore» senza partenza: «Sì, così».** Al posto della frase da sola:
   la figura, la stessa frase e il pulsante **«My position»** / «La mia
   posizione» (testo di «Draw»), che chiede la posizione al telefono come
   fa «Draw». Il sottotitolo è nascosto finché la partenza manca. Le città
   e «Ask for a route» restano.
4. **Icone di «Add to Feed»: «Sì, queste».** Lucide, a sinistra del titolo,
   nel colore del testo (mai gialle): «Record now» `circle-dot`, «Already
   recorded» `history`, «Photos only» `images`, «From a file» `file-up`,
   «Sleep» `moon`, «Gym workout» `dumbbell`, «Workout plan»
   `clipboard-list`. Nessun testo cambia.
5. **Sagoma nelle tessere: «Sì, così».** In una tessera il cui percorso non
   c'è ancora («Drawing…», «Up next», «Not drawn») il contorno vero della
   forma, grigio e centrato; quando il percorso arriva tutto è come oggi.
   Nei quattro posti che sanno la forma; «WORDS» resta com'è (le lettere
   non sono sul telefono).

Testo nuovo, uno solo: «Go to your workouts» — it «Vai agli allenamenti»,
de «Zu deinen Trainings», fr «Voir tes séances», es «Ir a tus
entrenamientos». Traduzioni approvate dall'utente: «Sì, vanno bene»
(2026-11-26).

Dal Coordinatore (2026-11-26): tre PR A, B, C; la C solo dopo che TASK-449
è in `main`; le icone sono l'insieme a cui si allineerà TASK-510; il cuore
accanto al titolo nell'«Explore» della pagaia non è di questa task.

## Parti

- **A — stati vuoti**: la figura, i pulsanti del Feed, Coach, «Explore»
  senza partenza.
- **B — icone di «Add to Feed»**.
- **C — sagoma nelle tessere** (dopo TASK-449 in `main`).

Solo app: nessuna dipendenza, nessun file nativo, l'impronta iOS resta
`5e1b5ce5`. Nessuna modifica a server o motore.

## File toccati

Parte A:

```
apps/mobile/src/ui/EmptyState.tsx
apps/mobile/src/ui/EmptyState.test.tsx
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreenEmpty.test.tsx        (nuovo)
apps/mobile/src/coach/CoachPage.tsx
apps/mobile/src/coach/CoachPage.test.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreNoStart.test.tsx         (nuovo)
apps/mobile/App.tsx                                     (due prop: «Log in» al Feed, «My position» a «Explore»)
apps/mobile/src/i18n/it.ts, de.ts, fr.ts, es.ts         (una chiave)
```

Parte B:

```
apps/mobile/src/feed/addToFeedEntries.ts
apps/mobile/src/feed/addToFeedEntries.test.ts
apps/mobile/src/feed/AddToFeed.tsx
apps/mobile/src/feed/AddToFeed.test.tsx
apps/mobile/assets/ui/icons/circle-dot*.png, history*.png, images*.png,
  file-up*.png, moon*.png, dumbbell*.png, clipboard-list*.png   (nuovi, Lucide)
```

Parte C:

```
apps/mobile/src/explore/RouteCard.tsx                   (una prop: la forma da mostrare senza linea)
apps/mobile/src/explore/RouteCardOutline.test.tsx       (nuovo: tutte le forme del catalogo)
apps/mobile/src/explore/CityExamples.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/route/NearYou.tsx
apps/mobile/src/paddle/PaddleExplore.tsx
```

`route/ShapeGlyph.tsx` si riusa senza modificarlo. Un test esistente che
diventa rosso per il comportamento nuovo si segnala al Coordinatore prima
di toccarlo. I documenti (`UI.md`, la precisazione ad ADR-0293, `STATUS.md`,
`COMPLETATI.md`) vanno nella PR di chiusura, di soli documenti.

## Criteri di accettazione

- [ ] Ogni pagina con `EmptyState` mostra la figura intera; il disegno
      parte una volta e, con «Riduci movimento», non si muove.
- [ ] Feed «All» vuoto: con l'account c'è «Record now» e avvia la
      registrazione; senza account c'è «Log in» e apre l'accesso.
- [ ] Coach vuoto: niente scheda del corpo né sottotitolo, c'è «Go to your
      workouts» e chiude la pagina; coi consigli il sottotitolo è sopra i
      consigli.
- [ ] «Explore» senza partenza: figura, frase e «My position», che chiede
      la posizione; nessun sottotitolo.
- [ ] Ogni riga di «Add to Feed» ha la sua icona (un test su tutte le voci:
      una voce nuova senza icona fallisce).
- [ ] Ogni tessera in attesa che sa la forma ne mostra il contorno; un test
      passa tutte le forme del catalogo e fallisce se una non ha contorno.
- [ ] Nessun colore scritto a mano; la chiave nuova in tutte le lingue, al
      suo posto nelle tabelle.
- [ ] `tsc` e i test dei file toccati verdi in locale, CI verde; schermate
      fatte vedere all'utente prima di «pronta».

## Lasciato fuori

- Il cuore accanto al titolo nell'«Explore» della pagaia: lo porta
  all'utente il Coordinatore.
- Le tessere di «WORDS»: restano vuote mentre la parola viene disegnata.
- Coach senza account: resta com'è.

## Cronologia

- 2026-11-26 — avviata dall'utente («Avvia la 509»). Punti riverificati su
  `origin/main` c80aff30, cinque domande all'utente una alla volta, tutte
  risposte; poi il sì a «Log in» e alle traduzioni. Elenco dei file
  approvato dal Coordinatore: il codice si prepara in locale e parte al suo
  «via al codice» (dopo TASK-449 parte A in `main`); le due prop di
  `App.tsx` nella PR della parte A, al turno su quel file.
