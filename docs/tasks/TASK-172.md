# TASK-172 — «My activities»: le corse registrate, nel profilo

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-172-my-activities`
**Dipende da**: TASK-171 (la pagina di «Profile», `ask`, `sessionEnded`),
TASK-169 (la fine della corsa, la pausa nella traccia)

## Obiettivo

Chi ha un account ritrova in «Profile», alla voce «My activities», tutte le
corse che ha registrato, con un percorso o senza: giorno, ora, luogo,
l'anteprima di cosa ha disegnato, km, tempo, passo e punteggio. Chiesto
dall'utente il 2026-10-02 insieme a «Favorites» (TASK-171): «le mie
attività con tutte le attività che hanno registrato, con lo storico: data,
ora, posizione e l'anteprima di cosa aveva disegnato».

È la metà privata di TASK-117: salvare e ritrovare. Titolo, «Public» e la
traccia tagliata per gli altri restano a TASK-117, che parte da qui.

## Contesto da leggere

- `docs/DATABASE.md` (tabella `runs`, «Come si memorizza una traccia»)
- `docs/API.md` «Account», «Favorites», `POST /track-scores`
- `docs/UI.md` «Profile», «Favorites», «La fine della corsa», «Correre
  senza percorso», «Cosa esce dal telefono»
- `docs/DECISIONS.md` ADR-0139 (i preferiti: stesso schema di chiave fatta
  dall'app, stessa pagina), ADR-0090, ADR-0091, ADR-0114
- `services/api/shaperoute_api/favorites.py`, `track_scores.py`
- `apps/mobile/src/favorites/` (il modello da seguire), `App.tsx`
  (`onEndRun`, `onFinishDone`, `onFreeDone`), `src/screens/FinishScreen.tsx`,
  `FreeRunScreen.tsx`, `src/navigation/trackStore.ts`, `freeRun.ts`

## Da decidere con l'utente prima di partire

Scelte di prodotto, non delegate. La proposta è già scritta: se l'utente
dice sì, si parte così.

1. **Si salva da sola.** A fine corsa, chi è entrato ha la corsa in «My
   activities» senza toccare niente («tutte le attività che hanno
   registrato»); si può cancellare dall'elenco. L'alternativa è un pulsante
   «Save» nella schermata di fine corsa (com'era scritto in TASK-117).
2. **Senza account** la corsa resta com'è oggi (sul telefono finché ha il
   punteggio, poi si perde), con una riga che invita a entrare per tenerla.
3. **Il luogo** è il nome del posto da cui si parte («Trento»), trovato
   dall'API; quando non lo trova, niente nome.

## Cosa fare

1. API: tabella `runs` (migrazione dopo la `0002`), come la descrive
   `DATABASE.md` senza titolo, «pubblica» e traccia tagliata: utente,
   chiave fatta dall'app, percorso pianificato (o nessuno), cosa disegna
   (forma, parola, titolo), traccia `LineStringM` (M = secondi
   dall'inizio), inizio (data e ora), distanza, durata, punteggio e
   fedeltà (o nessuno), luogo.
2. `PUT /me/activities/{key}` — la corsa fix per fix, il percorso e la sua
   somiglianza se c'erano. **Punteggio, distanza e durata li ricalcola
   l'API** (`track_score`, ADR-0090): quelli dell'app non si usano. La
   chiave la fa l'app dalla traccia, come per i preferiti: mandare due
   volte la stessa corsa la salva una volta.
3. `GET /me/activities` (dalla più recente, a pagine con cursore, con
   un'anteprima leggera di percorso e traccia), `GET /me/activities/{key}`
   (intera), `DELETE /me/activities/{key}`. Solo il proprietario.
4. App: a fine corsa, con un percorso (`FinishCard`) e senza
   (`FreeFinishCard`), la corsa va all'API; senza rete resta sul telefono e
   parte alla prossima apertura, senza perdersi né raddoppiare.
5. App: in «Profile» la riga «My activities» con il numero, sotto
   «Favorites»; la pagina elenca le corse: anteprima (percorso giallo,
   traccia chiara, come a fine corsa), giorno e ora, luogo, km, tempo,
   passo, punteggio. Il tocco apre la corsa sulla mappa; da lì o
   dall'elenco si cancella, con conferma.
6. `DELETE /me` cancella anche le corse: un test lo dimostra.
7. Test di API e app; `API.md`, `DATABASE.md`, `UI.md` (anche «Cosa esce
   dal telefono»: la traccia intera va al server), ADR-0140.

## Criteri di accettazione

- [ ] Il punteggio salvato è quello calcolato dall'API, anche se l'app ne
      manda un altro; una corsa senza percorso non ha punteggio.
- [ ] La stessa corsa mandata due volte è un'attività sola.
- [ ] Una corsa finita senza rete compare in «My activities» dopo la
      prossima apertura con la rete, una volta sola.
- [ ] Un account vede, apre e cancella solo le sue corse; senza token
      `not_signed_in`.
- [ ] Cancellato l'account, non resta nessuna riga di `runs`.
- [ ] L'elenco mostra giorno e ora dell'inizio con l'orologio del telefono,
      luogo, km, tempo, e l'anteprima del disegno.
- [ ] Due pagine consecutive dell'elenco non ripetono e non saltano corse.
- [ ] Senza account si corre come prima.
- [ ] Colori dai token; testi in inglese; test verdi.

## File toccati

```
services/api/migrations/0003_runs.sql
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/app.py
services/api/tests/test_activities.py
packages/shared-types/fixtures/activity-request.json
packages/shared-types/fixtures/activity.json
packages/shared-types/fixtures/activities.json
apps/mobile/App.tsx
apps/mobile/__tests__/AppActivities.test.tsx
apps/mobile/src/api/activities.ts
apps/mobile/src/api/activities.test.ts
apps/mobile/src/activities/
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/src/screens/ProfileScreen.tsx
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-172.md
```

`FinishScreen.tsx`, `FreeRunScreen.tsx`, `trackStore.ts` e `freeRun.ts` sono
di TASK-169 finché non è in `main`: se servono, dopo. Il numero della
migrazione è il primo libero al momento di partire.

## Fuori scope

- Titolo, «Public», traccia tagliata, il feed vero: TASK-117 e TASK-118.
- Le corse fatte prima di questo task: sul telefono non ci sono più.
- Statistiche nel tempo (km del mese, record), filtri, ricerca.
- Caricare un GPX da fuori; mandare la corsa a Strava.
- Foto della corsa.

## Esito

*(si compila a fine task)*
