# TASK-362 — Le schede del Feed: «Tutti» e «Seguiti»

**Stato**: Todo — documenti ora, codice col via del Coordinatore e le scelte chiuse
**Fase**: 4 · **Branch**: `docs/TASK-362-feed-tabs` (documenti),
`feat/TASK-362-feed-tabs` (codice) · **ADR**: ADR-0308 · numeri dal
Coordinatore (2026-10-30)

## Obiettivo

In cima al Feed l'utente sceglie cosa vedere: tutti i post pubblici, o solo
quelli di chi segue. Il filtro sta sul server, ogni scheda ha la sua cache e
la sua posizione, e al prossimo avvio si riapre l'ultima scelta. La richiesta
è dell'utente (2026-10-30, un brief incollato).

## Contesto da leggere

- `docs/API.md`, «Feed» e «Follow».
- `docs/tasks/TASK-355.md` e ADR-0306: le schede tolgono i filtri alla sua
  parte B.
- ADR-0227 (il feed), ADR-0127 (gli esempi), ADR-0173 (i follow).
- `docs/tasks/TASK-339.md` e `ui/EmptyState`: lo stile degli stati vuoti.

## Cosa c'è oggi

Letto il codice di `main` il 2026-10-30.

- `GET /feed` (`feed.py`): pagine da 20 con cursore, solo con il token. Tre
  gruppi: i propri, quelli di chi si segue, gli altri entro 50 km dal telefono
  (tutti, senza posizione). Cronologico solo dentro ogni gruppo.
- Un post è una riga di `drawings`: l'autore arriva da `runs.user_id`, la data
  è `published_at`, la visibilità è `everyone`, `followers` o `only_me`.
- I follow esistono (`follows`, ADR-0173; conta solo la richiesta accettata):
  **nessun modello dati nuovo**.
- I post «di MuW» non stanno sul server: sono gli esempi di `sampleFeed.json`,
  mostrati senza account e a feed vuoto (ADR-0127).
- `useFeed` tiene una lettura sola; un errore sulla prima pagina mostra gli
  esempi senza dire nulla.
- L'app non ha AsyncStorage: le scelte stanno in file (`settings/sport.ts`).

## Scelte dell'utente

Una alla volta, con le sue parole.

1. **Schede o filtri.** Le due schede sostituiscono i filtri All, Friends,
   Mine di TASK-355 B. Li toglie la sessione di TASK-355, avvisata dal
   Coordinatore.
   — *Risposta:* «Sì, sostituiscono».
2. **I propri post in «Seguiti».** La proposta era escluderli; l'utente li
   vuole dentro: «Seguiti» mostra chi si segue e i propri post.
   — *Risposta:* «No, includili».
3. **«Tutti» senza il criterio «vicino».** Oggi chi non segue nessuno vede i
   disegni entro 50 km, e nessuno più lontano. Con «Tutti» cronologico vede
   gli ultimi pubblicati nel mondo, spesso lontani. Proposta: accettarlo, come
   chiede il brief.
   — *Risposta:* «Sì, cronologico».
4. **I post di MuW in «Tutti».** Proposta: gli esempi restano solo a «Tutti»
   vuoto o senza account (non hanno una data vera). Un account MuW che
   pubblica sul server è un lavoro a parte.
   — *Risposta:* «Sì, solo lì».
5. **I nomi e i testi.** Proposta: «Tutti» e «Seguiti», con i messaggi degli
   stati vuoti e «Retry», in cinque lingue. Testi esatti da approvare prima del
   codice.
   — *Risposta:* aperta.
6. **«Seguiti» senza account.** Proposta: la scheda c'è e chiede il login;
   «Tutti» mostra gli esempi, come oggi.
   — *Risposta:* aperta.
7. **La riga di privacy.** Se le schede non mandano più la posizione, la frase
   di TASK-356 «to show you drawings nearby in the Feed» resta vera solo per
   le app già installate. Proposta: toglierla in un secondo tempo, col sì
   dell'utente, quando le versioni vecchie non contano più. TASK-356 non si
   tocca.
   — *Risposta:* aperta.

## Cosa fare

Il codice parte col via del Coordinatore. Coda su `FeedScreen.tsx`: **362**,
344 B, 355 B ridotta, 309 B. `FeedPost.tsx` non si tocca (339 B, 355 A).

1. `feed.py`: `filter` facoltativo, `all` o `following`. Senza parametro la
   risposta resta quella di oggi, per le app già installate. Con `filter`
   l'ordine è solo `published_at DESC, id DESC`; `lat` e `lon` sono ignorati.
   - `all`: `visibility = 'everyone'`, più `shown_sql`.
   - `following`: i propri e gli autori con la richiesta accettata, `everyone`
     e `followers`, più `shown_sql`.
2. `EXPLAIN` su 10.000 disegni per entrambi i filtri, scritto nella PR. Una
   migrazione solo se serve: numero dal Coordinatore (0040 e 0041 sono prese).
3. `shared-types`, fixture, `docs/API.md`.
4. `api/feed.ts` e `useFeed.ts`: il `filter`, una lettura e un cursore per
   scheda, per account. Con le schede l'app non manda più `lat` e `lon`.
5. `feed/FeedTabs.tsx` (nuovo): due schede con `Tap` e i token, sulla riga della
   lente. `feed/feedTabChoice.ts` (nuovo): l'ultima scheda in un file del
   telefono, come `settings/sport.ts`; non si manda a nessuno.
6. `FeedScreen.tsx`: una `FlatList` per scheda, entrambe montate, così cambiare
   scheda non rilegge e non perde la posizione. Pull e pagine per scheda.
7. Stati, con `ui/EmptyState` (dalla TASK-339 A, in `main`):
   - «Seguiti» senza follow: messaggio e «Find people to follow», verso «Find
     friends» (TASK-215), anche sopra i propri post se ce ne sono;
   - follow senza post: messaggio proprio;
   - senza account: scelta 6;
   - errore di rete in una delle due schede, con un account: messaggio e
     «Retry», senza gli esempi al posto del Feed.

## Criteri di accettazione

- [ ] Senza `filter`, `GET /feed` risponde come prima: test sull'ordine a tre
      gruppi e con `lat`, `lon`.
- [ ] `following`: con follow, senza follow, richiesta solo in attesa, dopo aver
      smesso di seguire, un blocco, un `followers`, un `only_me`, i propri post.
- [ ] `all`: niente `followers` né `only_me`, solo cronologico, nessun repeat
      fra le pagine.
- [ ] Il filtro è sul server: una pagina è piena anche con pochi seguiti.
- [ ] Cambiare scheda non fa richieste già fatte e tiene la posizione: test.
- [ ] La scheda scelta si riapre al riavvio; una scelta illeggibile dà «Tutti».
- [ ] Pull e pagina successiva toccano solo la scheda aperta.
- [ ] L'EXPLAIN su 10.000 disegni è nella PR.
- [ ] Testi approvati in cinque lingue, nessun colore a mano, `Tap` ed
      etichette, nessuna dipendenza nuova, impronta `83793e26` su una copia
      pulita.
- [ ] Prima e dopo dal simulatore, in scuro e in chiaro. Server solo col sì
      dell'utente; una migrazione, se c'è, solo in locale.

## File toccati

Questa PR:

```
docs/tasks/TASK-362.md
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Codice:

```
services/api/shaperoute_api/feed.py
services/api/tests/test_feed.py
services/api/tests/test_feed_tabs.py                  (nuovo)
packages/shared-types/src/index.ts
packages/shared-types/fixtures/feed*.json
apps/mobile/App.tsx                                   (solo se `near` va tolto)
apps/mobile/src/api/feed.ts
apps/mobile/src/feed/useFeed.ts, useFeed.test.tsx
apps/mobile/src/feed/FeedTabs.tsx, FeedTabs.test.tsx  (nuovi)
apps/mobile/src/feed/feedTabChoice.ts, .test.ts       (nuovi)
apps/mobile/src/screens/FeedScreen.tsx, FeedScreen*.test.tsx
apps/mobile/src/i18n/*.ts
docs/API.md, docs/UI.md, docs/DATABASE.md (se migrazione)
docs/STATUS.md, docs/tasks/TASK-362.md
```

## Fuori scope

- `FeedPost.tsx`, foto dell'autore, conteggi, skeleton: TASK-339 B e TASK-355.
- Cosa apre la lente: TASK-344 B.
- Gli altri stati vuoti e il resto del Feed senza account: TASK-339 C.
- La riga di privacy di TASK-356: la tocca solo un sì dell'utente, scelta 7.
- Profili suggeriti: il pulsante porta a «Find friends», che già esiste.
- Applicare una migrazione o aggiornare il server.

## Esito

*(a fine task)*
