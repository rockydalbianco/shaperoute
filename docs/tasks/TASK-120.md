# TASK-120 — Commenti

**Stato**: In corso — codice fatto (API e app, una PR); mancano
l'aggiornamento del server con la migrazione `0011`, la pubblicazione e la
prova sull'iPhone con due account, con l'ok dell'utente
**Fase**: 4 · **Branch**: `feat/TASK-120-comments`
**Dipende da**: TASK-117 (i disegni pubblicati) · TASK-213 (il filtro dei
commenti negativi, in `main`) · **Prima di aprirli a tutti**: TASK-121

> **Cambiato il 2026-10-03, scelta dell'utente**: i commenti vanno
> **subito sotto le corse pubblicate vere** (TASK-117), aperte da un
> profilo, senza aspettare il feed vero (TASK-118). I post del «Feed» di
> oggi sono esempi (TASK-156): restano senza commenti. Quando arriva
> TASK-118, le sue schede useranno gli stessi endpoint e lo stesso foglio.
> E (TASK-213, ADR-0176): un commento negativo non si pubblica e chi lo
> scrive vede un avviso.

## Obiettivo

Sotto un disegno pubblico gli iscritti leggono e scrivono commenti.

## Contesto da leggere

- `docs/API.md` («Drawings»), `docs/DATABASE.md`
- `apps/mobile/src/social/DrawingCard.tsx`, `drawingsDoor.ts`
- ADR-0176 e `services/api/shaperoute_api/comment_filter.py`

## Cosa fare

1. API: `GET /drawings/{id}/comments` (a pagine, dal più vecchio),
   `POST /drawings/{id}/comments` (testo semplice, 1–500 caratteri),
   `DELETE /comments/{id}` — cancella l'autore del commento o il
   proprietario del disegno. Limite di commenti al minuto per utente. Il
   filtro di TASK-213 prima di salvare: `422 comment_rejected`.
2. Il numero dei commenti: lo dà `total` della prima pagina (il feed vero,
   TASK-118, lo porterà nelle sue schede).
3. App: sotto il disegno aperto un pulsante con il numero, che apre un
   foglio con l'elenco (foto, nome, testo, quanto tempo fa), il campo per
   scrivere sopra la tastiera, tieni premuto per cancellare il proprio;
   l'avviso di ADR-0176 per un commento negativo.
4. Il testo si mostra sempre come testo: niente link attivi, niente HTML
   (la mappa è in una WebView: un commento non ci entra mai).
5. Test; `API.md`, `DATABASE.md`, `UI.md`.

## Criteri di accettazione

- [x] Commento vuoto, solo spazi o oltre 500 caratteri: rifiutato con il motivo.
- [x] Chi non è autore né proprietario non può cancellare.
- [x] Oltre il limite al minuto l'API risponde con un errore chiaro, e
      l'app lo dice.
- [x] Cancellato il disegno o l'account, i commenti spariscono.
- [x] Un commento negativo non si pubblica, e l'app mostra l'avviso.
- [ ] Test verdi; prova sull'iPhone con due account (aspetta il server e
      la pubblicazione, con l'ok dell'utente).

## File toccati

```
services/api/migrations/0011_comments.sql           (nuovo)
services/api/shaperoute_api/comments.py             (nuovo)
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/tests/test_comments.py                 (nuovo)
services/api/tests/test_drawings.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/api-error-codes.json
packages/shared-types/fixtures/comment*.json        (nuovi)
packages/shared-types/test/comments.test.ts         (nuovo)
apps/mobile/src/api/comments.ts                     (nuovo, e il test)
apps/mobile/src/api/routes.ts
apps/mobile/src/social/commentsDoor.ts              (nuovo, e il test)
apps/mobile/src/social/useDrawingComments.ts        (nuovo)
apps/mobile/src/social/DrawingComments.tsx          (nuovo, e il test)
apps/mobile/src/social/commentText.ts               (nuovo, e il test)
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts      (i testi nuovi)
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-120.md
```

`routes.ts`: il tipo dell'errore di un percorso prende `reason` da
`ApiError`, che ora ha anche il motivo di un commento (una riga).
`ProfileLayer.tsx`: il provider dei commenti attorno all'app, dove sta la
scheda del disegno. `test_drawings.py`: lo schema «di prima dei disegni»
prende le migrazioni prima della loro, non tutte le altre (la `0011` dei
commenti vuole la tabella `drawings`; una riga).

## Fuori scope

- Risposte a un commento, menzioni, like ai commenti, modifica.
- Notifiche (TASK-185). Segnalare e bloccare (TASK-121): **segnalare un
  commento arriva con TASK-121**, scelta dell'utente del 2026-10-03; per
  ora bastano il filtro e la cancellazione da parte del proprietario.
- I commenti sui post d'esempio del «Feed» e nelle schede del feed vero
  (TASK-118).

## Esito

**2026-10-03, ADR-0175.** API in `comments.py`, tabella `comments`
(migrazione `0011`: il primo numero libero al merge; legata al disegno,
`ON DELETE CASCADE` su disegno e account). Li legge e li scrive chi vede
il disegno; un disegno tornato privato li tiene, visti solo dal
proprietario. Cancella chi l'ha scritto (anche sotto un disegno tornato
privato) o il proprietario del disegno; gli altri `403`. La regola
«chi vede il disegno, commenta» vale anche quando TASK-208 porterà
«Followers»: i commenti seguono la visibilità del disegno, senza regole
loro. Al più 10 al
minuto per account (`429` con `Retry-After`). Il filtro di TASK-213
prima di salvare: `422 comment_rejected`, `reason` `"negative"`, il
messaggio dell'utente; il codice e il motivo sono nel contratto
(`API_ERROR_CODES`, `COMMENT_REASONS`, `fixtures/comment-error.json`).

App: sotto un disegno aperto da un profilo, fra i numeri e «Back to the
profile», il pulsante «Write a comment» / «1 comment» / «4 comments» apre
un foglio dal basso (un `Modal` trasparente con `KeyboardAvoidingView`,
così il campo sta sopra la tastiera) con l'elenco dal più vecchio, «Show
more comments», il campo «Add a comment…» e «Post»; tieni premuto (o
l'azione «Delete» di VoiceOver) per cancellare. Il numero è il `total`
della prima pagina: nessun campo nuovo nel disegno, `drawings.py` non
cambia. La foto di chi scrive viene da `GET /users/{public_id}`, una volta
per profilo finché l'app è aperta. Testi nuovi in `UI.md`.

I testi nuovi sono in `t()` e tradotti in italiano, tedesco, spagnolo e
francese (ADR-0172, TASK-210 entrato prima del merge); l'avviso in
italiano è con le parole dell'utente. Il troppi-al-minuto lo dice l'app
con il suo testo, gli altri rifiuti di `invalid_request` con le parole
dell'API, come i disegni.

Test: 18 in `test_comments.py`, il contratto e il filtro verdi dopo il
merge di `main` con TASK-213; app: `api/comments`, `commentText`,
`commentsDoor`, `DrawingComments` (10 casi del foglio); `shared-types`
verde.

**Da chiedere all'utente**: i testi nuovi dell'app (`UI.md`, «I commenti
di un disegno») e le loro traduzioni; l'ok per aggiornare il server (migrazioni fino alla
`0011`) e pubblicare l'app; la prova sull'iPhone con due account.

Seguiti:

- **TASK-118**: le schede del feed vero portano il numero dei commenti e
  aprono lo stesso foglio (`DrawingComments`).
- **TASK-121**: segnalare un commento; una colonna «nascosto» se serve
  nasconderlo senza cancellarlo.
