# TASK-231 — Condividere il post di una corsa su Instagram e Strava

**Stato**: In corso — parte A (l'app) in `main` (PR #303, `cf973d1`,
2026-10-04); parte B (l'API) da fare, se l'utente la vuole
**Fase**: 4 · **Branch**: `feat/TASK-231-share-post` (parte A)
**ADR**: ADR-0194

## Obiettivo

Da una corsa finita, o da una corsa di «My activities», si fa il «post» di
Sgrava, lo si cambia con emoji e risultati, e lo si condivide su Instagram
e su Strava.

## La richiesta dell'utente (2026-10-04)

«Metti la possibilità di condividere il post tutto nostro su Strava e
Instagram; metti la possibilità di modificare il post aggiungendo emoji e
risultati della corsa.»

## Le scelte dell'utente (2026-10-04)

Proposta mostrata con un disegno della schermata e accettata così («Sì,
così»), **compresa la dipendenza nuova `react-native-view-shot`**:

1. **Il post** è un'immagine verticale 9:16 (la forma delle storie di
   Instagram), sul giallo di Sgrava: logo, titolo, il disegno della corsa
   in nero, i risultati.
2. **I risultati** (distanza, tempo, passo, punteggio) si accendono e si
   spengono uno per uno; partono tutti accesi.
3. **Le emoji**: se ne tocca una in una riga sotto il post e compare sul
   post; si trascina dove si vuole, si toglie toccandola. Al più cinque.
4. **Dove**: «Share» a fine corsa e su ogni corsa di «My activities».
5. **Instagram** passa dal foglio di condivisione di iOS, dove Instagram
   offre Storia, Feed e Messaggi.
6. **Strava** non accetta foto da altre app: emoji e risultati vanno come
   testo dell'attività; l'immagine si salva in Foto e si aggiunge a mano.

E dal coordinatore: **l'immagine non mostra i primi e gli ultimi 200 m**
della traccia, come un disegno che vedono gli altri (ADR-0114).

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0156 (Strava), ADR-0170 (la descrizione a
  Strava), ADR-0114 punto 4 (i 200 m)
- `docs/UI.md` «La fine della corsa», «My activities», «Cosa esce dal
  telefono»
- `docs/API.md` «Send to Strava»

## Parte A — l'app

1. `src/share/`: il post (`PostImage`), i suoi dati (`postRun`), le emoji
   (`stickers`), l'immagine e il foglio di condivisione (`sharePicture`,
   con `react-native-view-shot` ed `expo-sharing`), la schermata
   (`SharePost`, un `Modal`), la riga di Strava (`StravaPostRow`).
2. «Share» in `FinishCard`, `FreeFinishCard` e `ActivityCard`.
3. `sendToStrava` e `useStrava().send` prendono una descrizione: il testo
   del post («🔥❤️ 5.20 km · 28:10 · 5:25 /km · Score 87»), che l'API
   mette sopra «Drawn with Sgrava». L'API la accetta già (TASK-208 A).
4. I testi nuovi in inglese, italiano, tedesco, spagnolo e francese.

## Parte B — l'API (fatta il 2026-10-05, branch `feat/TASK-231-b-strava-update`)

Una corsa **già su Strava** tiene il testo con cui è partita: oggi «Send
to Strava» a «Save» manda la corsa senza il testo del post, e il post
aperto dopo da «My activities» può solo dire «View on Strava». La parte B
fa sì che `POST /me/activities/{key}/strava` con una `description`, su
una corsa già mandata, cambi la descrizione dell'attività su Strava (`PUT
/api/v3/activities/{id}`, permesso `activity:write`, che Sgrava chiede
già). Poi l'app mostra «Update on Strava» al posto della riga di oggi.
Vuole l'aggiornamento del server, con l'ok dell'utente.

Fatta così (ADR-0194, punti 7–9): il testo del post è un campo suo,
`post`, in cima alla descrizione; su una corsa già mandata fa il `PUT`.
L'utente il 2026-10-05: «fai la parte b e pubblica».

## Criteri di accettazione

- [x] Il post mostra titolo, disegno senza i primi e gli ultimi 200 m, e
      i risultati accesi; un risultato spento sparisce (test).
- [x] Le emoji si aggiungono fino a cinque, si spostano trascinandole e si
      tolgono toccandole, anche con VoiceOver (test).
- [x] «Instagram» fa il PNG del post e apre il foglio di condivisione; un
      errore lo dice (test, e prova nel simulatore: il foglio si apre con
      l'immagine, 116 KB).
- [x] «Send to Strava» dal post manda emoji e risultati accesi come
      descrizione (test con Strava finto).
- [x] Prima di «Save» la riga di Strava dice da dove mandarla; senza
      Strava nell'API non c'è niente di Strava (test).
- [x] Tutti i testi nelle cinque lingue (test delle tabelle).
- [x] Test verdi dell'app, lint, tipi, Prettier.
- [ ] Prova sull'iPhone con Instagram e Strava veri (l'utente, dopo la
      pubblicazione con il suo ok).
- [x] Parte B: `post` in cima alla descrizione all'invio; su una corsa
      già mandata il testo cambia su Strava con un `PUT`, il nome no;
      Strava che rifiuta dà `422` e la corsa resta mandata (test con
      Strava finto); «Update on Strava» nell'app (test).

## File toccati

```
services/api/shaperoute_api/strava.py, strava_client.py   (parte B)
services/api/tests/test_strava.py                         (parte B)
packages/shared-types/fixtures/strava-send-post.json      (parte B, nuovo)
docs/API.md                                               (parte B)
apps/mobile/package.json
package-lock.json
apps/mobile/__mocks__/react-native-view-shot.ts          (nuovo)
apps/mobile/src/share/                                    (nuovo)
apps/mobile/src/activities/ActivityCard.tsx
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/screens/FreeRunScreen.tsx
apps/mobile/src/api/strava.ts
apps/mobile/src/api/strava.test.ts
apps/mobile/src/strava/useStrava.ts
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts
docs/tasks/TASK-231.md                                    (nuovo)
docs/DECISIONS.md, docs/UI.md, docs/STATUS.md             (solo le righe nuove)
```

## Fuori scope

- Instagram senza foglio di condivisione (`instagram-stories://` con il
  post come adesivo): vuole un App ID di Meta e una build propria.
- Salvare in Foto con un pulsante proprio: vuole `expo-media-library`
  (un'altra dipendenza); oggi c'è «Save Image» nel foglio.
- Il post di un disegno di un altro, dal Feed.
- Il post di bici e canoa con km/h al posto del passo: segue TASK-182 (le
  unità) e le parti di TASK-208 B sul tipo di attività.
- Cambiare `RunEnd.tsx` (di TASK-208 B) per mettere il testo del post
  nell'invio a «Save».

## Esito

**Parte A** (2026-10-04, PR #303): il post si fa, si cambia e si condivide
dall'app; provato nel simulatore con Expo Go (immagine PNG da 116 KB, il
foglio si apre). Rispetto al disegno mostrato all'utente manca «More»,
che apriva lo stesso foglio di «Instagram». Restano la prova sull'iPhone,
la pubblicazione e la parte B. *(il resto a fine task)*
