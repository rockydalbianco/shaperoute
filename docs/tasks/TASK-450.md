# TASK-450 — «Share your run»: ordine dei pulsanti e poster

**Stato**: In corso · parte 0 (domande all'utente, turno sulla cartella)
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

## Criteri di accettazione

*(si fissano con le risposte dell'utente)*

- [ ] «Instagram» ed «Export video» sono dove l'utente ha scelto.
- [ ] Da «My activities» il poster di una corsa col post titolato porta
      quel titolo.
- [ ] Il poster ha ciò che l'utente ha scelto (risposte 2 e 3).
- [ ] Schermate prima/dopo approvate dall'utente.
- [ ] Impronta iOS invariata (`5e1b5ce5`), nessuna dipendenza nuova.

## File toccati

Elenco previsto, da confermare col Coordinatore.

```
apps/mobile/src/share/SharePost.tsx
apps/mobile/src/share/SharePost.test.tsx
apps/mobile/src/share/PostImage.tsx
apps/mobile/src/share/postRun.ts
apps/mobile/src/share/postRun.test.ts
apps/mobile/src/activities/ActivityCard.tsx
apps/mobile/src/i18n/{de,es,fr,it}.ts        (solo se ci sono testi nuovi)
docs/UI.md                                   («Il post da condividere»)
docs/tasks/TASK-450.md
file nuovi in apps/mobile/src/share/         (test del poster; la riga dei fondi, se l'utente la vuole)
```

## Fuori scope

- Il video: «Edit video», «Music», «Together», gli stili (TASK-408,
  TASK-417).
- Le tessere di palestra e piscina (`GymSharePicture`, `PoolSharePicture`).
- Tenere il fondo scelto sul server col post (`RunPostRequest` è un
  contratto dell'API): come stile e musica, la scelta non si salva.
- Strava, il rimando in chat, il link del post (TASK-455, TASK-482).

## Esito

*(a fine task)*
