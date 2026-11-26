# TASK-450 — «Share your run»: ordine dei pulsanti e poster

**Stato**: Done · 2026-11-23 · PR #1541 in `main` (855cf73c), in produzione con l'OTA 26 del 2026-11-24
**Fase**: 5 · **Branch**: `feat/TASK-450-share-order-poster`
**Dipende da**: niente
**ADR**: nessuno finora · numero dal Coordinatore l'11 novembre 2026 (idea
I4 e punto S8, gruppo E, di `out/prova-app-2026-11-11/PROPOSTE.md`)

## Obiettivo

In «Share your run» le due azioni che si cercano, «Instagram» ed «Export
video», si raggiungono senza scorrere, e il poster porta il titolo del post
e non è più soltanto giallo (secondo le risposte dell'utente, qui sotto).

## Cosa di S8 è ancora vero (riletto su `main` 10907434, 2026-11-23)

S8 diceva: «Instagram ed Export video stanno in fondo, dopo emoji, video e
musica; il poster è solo giallo, col nome della forma e non col titolo del
post». Dopo TASK-417 D2a/D2b, TASK-455 e TASK-469 A7a/A7c-1:

- **I pulsanti in fondo: ancora vero.** `SharePost.tsx` mette, nell'ordine,
  il poster, «Results», «Add emoji», la riga «Edit video», «Music», e solo
  allora «Instagram» ed «Export video» con la riga di Strava. Su un iPhone
  il poster prende metà dello schermo: i due pulsanti sono sotto la piega.
- **Il poster solo giallo: ancora vero.** `PostImage.tsx` ha un solo fondo,
  `color.accent`, con tutto il resto in `color.onAccent`.
- **Il nome della forma al posto del titolo del post: vero da «My
  activities», non altrove.** `postOfActivity` scrive `activity.title` (ciò
  che il percorso disegna) o «luogo · forma». Il titolo del post, quello
  scritto in «Edit post», la scheda lo ha già (TASK-456, da
  `GET /me/drawings`) ma non lo passa al poster. Dal Feed («Poster and
  video», TASK-455) il poster porta già il titolo del post
  (`postOfDrawing`). A fine corsa, prima di «Save», non c'è titolo.
- **Già risolto da altri, tolto da qui**: niente. TASK-417 ha aggiunto
  «Together» dentro «Edit video», TASK-455 l'ingresso dal Feed, TASK-469 il
  vetro delle pastiglie: nessuno ha toccato l'ordine né il poster.

## Risposte dell'utente (parte 0)

Chieste una per volta il 2026-11-23, ognuna con la sua proposta; l'utente
ha scelto la prima di ognuna.

1. **Ordine dei pulsanti: «Subito sotto il poster».** «Instagram» ed
   «Export video», con la riga «Pick Instagram in the list…» e l'errore,
   stanno sotto il poster; poi «Results», «Add emoji», «Edit video»,
   «Music» e Strava. Scartate: pulsanti fissi in basso; tutto dentro una
   riga «Edit» (testo nuovo, un tocco in più per le emoji).
2. **Il poster: «Titolo del post + data».** Il titolo scritto in «Edit
   post» quando c'è, altrimenti «luogo · forma» come oggi; sotto, piccola,
   la data della corsa, anche a fine corsa. La data è sempre sul poster
   (scartata la pastiglia «Date» in «Results»). Distanza, tempo e passo
   restano i risultati in basso.
3. **I fondi: «Yellow», «Night», «Day».** Tre tessere sotto i pulsanti, con
   l'etichetta «Style»: «Yellow» com'è oggi, accesa all'apertura; «Night»,
   fondo nero dell'app, linea gialla, scritte chiare; «Day», fondo chiaro
   dell'app, linea e scritte scure. La scelta non si salva col post.

**Testi**: nessuno nuovo. «Style», «Yellow», «Night», «Day» sono già
nell'app e nelle quattro lingue; la data è scritta come nel resto dell'app.

## Cosa fare

1. Parte 0: le tre domande all'utente; turno sulla cartella
   `apps/mobile/src/share/**` e sì sulla lista dei file dal Coordinatore.
2. Ordine dei pulsanti in `SharePost.tsx`, secondo la risposta 1.
3. Il titolo del post sul poster da «My activities»; il resto del poster
   secondo le risposte 2 e 3, coi soli colori di `src/theme/tokens.ts`.
4. Test deterministici dei file toccati; `docs/UI.md` «Il post da
   condividere».
5. Schermate prima/dopo del foglio e del poster, col sì dell'utente.

## Come è fatto

- **Ordine** (`SharePost.tsx`): il blocco dei due pulsanti, con la riga
  «Pick Instagram in the list…» e l'errore, sale subito sotto il poster;
  la riga di Strava resta in fondo.
- **I fondi** (`postLook.ts`, `PostLookRow.tsx`, file nuovi): `PostLook` =
  `yellow | night | day`. «Night» e «Day» sono le palette `NIGHT` e `DAY`
  di `videoStyle.ts` (i token a un loro estremo, qualunque tono abbia
  l'app); «Yellow» è `accent` + `onAccent`. `PostImage` prende `look` e
  colora fondo, linea e scritte. La scelta è uno stato della pagina: non
  va all'API (`RunPostRequest` invariato).
- **Titolo** (`postRun.ts`, `ActivityCard.tsx`): `postOfActivity(activity,
  postTitle)`; la scheda passa il titolo del post che ha già
  (`choiceOf`, TASK-456). Un titolo vuoto o di soli spazi lascia quello di
  prima.
- **Giorno** (`postRun.ts`, `PostImage.tsx`): `PostRun.startedAt`, da
  `started_at` in «My activities» e dal primo fix a fine corsa; scritto con
  `dayLabel` («Sat 21 Nov 2026», testo già nell'app). Titolo e giorno
  stanno in una colonna che parte a 0,085 dell'altezza: due righe di titolo
  più il giorno finiscono sopra il disegno (0,2).
- **Dal Feed** («Poster and video»): il titolo c'era già; il giorno è una
  riga in `feed/PostActions.tsx` (`postOfDrawing`, `startedAt:
  drawing.started_at`), file aggiunto alla lista col sì del Coordinatore
  (2026-11-23).

- **La cornice** (`SharePost.tsx`): un filo (`hairline`) attorno al poster
  nella pagina, fuori dall'immagine condivisa. Uscita dalla prova nel
  simulatore: con «Night» il poster ha lo stesso scuro della pagina e non
  se ne vedevano i bordi.

## Prova nel simulatore (2026-11-23)

iPhone 17e, Expo Go, Metro dal worktree (8150), API locale (8050) su un
PostGIS a perdere (`task450-db`), account di prova con una corsa a stella
e il post «My first star» (`out/TASK-450/seed.py`); «prima» = i cinque file
di codice com'erano su `main`, «dopo» = il branch. Schermate in
`out/TASK-450/shots/`, fogli `out/TASK-450/TASK-450-pagina-prima-dopo.jpg`
e `TASK-450-poster-stili.jpg` (fuori da git). Visto: prima il poster
diceva «Stella» e i pulsanti erano in fondo; dopo dice «My first star» con
«Sab 21 nov 2026», i pulsanti stanno sotto il poster, le tre tessere
cambiano fondo, linea e scritte. Non provato nel simulatore: il poster a
fine corsa e dal Feed (coperti dai test), e l'immagine che arriva nel
foglio di condivisione di iOS.

## Criteri di accettazione

- [x] «Instagram» ed «Export video» stanno subito sotto il poster, prima di
      «Style», «Results», «Add emoji», «Edit video», «Music» e Strava
      (`SharePost.test.tsx`, «the page's order»).
- [x] Da «My activities» il poster di una corsa col post titolato porta
      quel titolo (`ActivityCardPoster.test.tsx`, `postRun.test.ts`).
- [x] Sotto il titolo c'è il giorno della corsa, anche a fine corsa; due
      righe di titolo e il giorno finiscono sopra il disegno
      (`PostImageLook.test.tsx`).
- [x] «Style» offre «Yellow», «Night», «Day»; «Yellow» all'apertura; i
      colori vengono dai token; la scelta non va all'API
      (`PostImageLook.test.tsx`, `SharePost.test.tsx`).
- [x] Dal Feed il poster ha il giorno della corsa
      (`PostActionsPosterDay.test.ts`).
- [x] Schermate prima/dopo approvate dall'utente (2026-11-23: «Sì, vanno
      bene», col giorno scritto con l'anno e la cornice attorno al poster).
- [x] Nessun testo nuovo, nessuna dipendenza nuova, niente di nativo
      (impronta iOS `5e1b5ce5` invariata: solo TypeScript in `src/`).

## File toccati

Turno su `apps/mobile/src/share/**` e lista approvati dal Coordinatore
(fork 3) il 2026-11-23; il task file va nella PR di codice.

```
apps/mobile/src/share/SharePost.tsx
apps/mobile/src/share/SharePost.test.tsx
apps/mobile/src/share/SharePostVideo.test.tsx   (due test: ora la pagina ha anche le tessere del poster)
apps/mobile/src/share/PostImage.tsx
apps/mobile/src/share/postRun.ts
apps/mobile/src/share/postRun.test.ts
apps/mobile/src/share/postLook.ts               (nuovo)
apps/mobile/src/share/PostLookRow.tsx           (nuovo)
apps/mobile/src/share/PostImageLook.test.tsx    (nuovo)
apps/mobile/src/activities/ActivityCard.tsx     (una riga)
apps/mobile/src/activities/ActivityCardPoster.test.tsx (nuovo)
apps/mobile/src/feed/PostActions.tsx            (una riga, sì del Coordinatore)
apps/mobile/src/feed/PostActionsPosterDay.test.ts (nuovo)
docs/UI.md                                      («Il post da condividere»)
docs/tasks/TASK-450.md                          (nuovo)
```

`apps/mobile/src/i18n/*.ts` non si tocca: nessun testo nuovo.

## Fuori scope

- Il video: «Edit video», «Music», «Together», gli stili (TASK-408,
  TASK-417).
- Le tessere di palestra e piscina (`GymSharePicture`, `PoolSharePicture`).
- Tenere il fondo scelto sul server col post (`RunPostRequest` è un
  contratto dell'API): come stile e musica, la scelta non si salva.
- Strava, il rimando in chat, il link del post (TASK-455, TASK-482).

## Esito

In «Share your run» «Instagram» ed «Export video» stanno subito sotto il
poster; il poster porta il titolo del post (da «My activities» prima
diceva la forma), il giorno della corsa sotto, e ha tre stili, «Yellow»,
«Night», «Day», con una cornice sottile nella pagina. Nessun testo nuovo,
nessun ADR: le scelte sono le tre risposte dell'utente qui sopra, il resto
è in «Come è fatto». #1541 unita dal Coordinatore il 2026-11-23 dopo il
«Sì, vanno bene» dell'utente alle schermate; è nell'OTA 26 di produzione
(`71fc76c4`, 2026-11-24).

**Resta, non di questa sessione**: la prova sul telefono dopo l'OTA 26 (è
nell'elenco di `STATUS.md`, «Prossimo passo», la segue il Coordinatore):
aprire «Share» da una corsa col post titolato, cambiare stile, toccare
«Instagram» e guardare che nel foglio di iOS l'immagine abbia lo stile
scelto e non la cornice. Non provati nel simulatore: il poster a fine
corsa e dal Feed (coperti dai test).

**Rimandato, se l'utente lo vuole**: il giorno senza l'anno («Sab 21 nov»,
com'era nell'anteprima della domanda 2) vuole un formato di data nuovo
nelle quattro lingue; l'utente ha approvato le schermate con l'anno.
