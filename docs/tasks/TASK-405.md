# TASK-405 — Un percorso di MuW non dice «looks 100% like it»

**Stato**: Done · 2026-11-06
**Fase**: 5 · **Branch**: `fix/TASK-405-muw-no-score`
**Numeri**: TASK-405, assegnato dal Coordinatore; nessun ADR nuovo (è una
correzione, nessuna scelta di prodotto cambia): «ADR-0310, precisazione»
in `DECISIONS.md`. Seguito di TASK-365 (ADR-0310), trovato con la PR #868.

## Obiettivo

Aperto dal Feed, un percorso di MuW mostra sotto la distanza
«Star · Trento · looks 100% like it». Il 100% non è una misura: è il
`similarity: 1` che `muwCardRoute` e `muwDetail`
(`apps/mobile/src/feed/muwRoute.ts`) mettono perché il tipo lo vuole, e il
loro stesso commento dice che questi percorsi non hanno punteggio da
mostrare. La riga deve dire solo titolo e città; ogni altro percorso
(quelli di «Explore», gli esempi, «RIDE IT YOURSELF») la tiene com'è.

## Cosa c'è oggi

`ExploredCard` (`apps/mobile/src/explore/ExploredCard.tsx`) scrive
`t("{title} · {city} · looks {percent}% like it")` con
`route.similarity` del percorso aperto (`Explored.route`). Il percorso
aperto da un post di MuW è `muwCardRoute(route)` (PR #868, `App.tsx`:
`openExplored(muwCardRoute(route), fetchMuwRoute(route))`); a percorso
caricato `optionsOf` lo copia con lo spread e gli rimette la `similarity`
del dettaglio. `ThemedCard` mostra solo i percorsi a tema, mai quelli di
MuW.

## Cosa cambia

- `RecommendedRoute` (`explore/recommendedRoutes.ts`) ha un campo
  opzionale `scored?: false`: il segno che il percorso non ha una
  somiglianza da dire. Assente per tutti gli altri, che non cambiano.
- `muwCardRoute` lo mette; `optionsOf` lo porta avanti con lo spread, così
  vale anche a percorso caricato.
- `ExploredCard`, con `scored === false`, scrive `{title} · {city}` come
  stringa composta (come `RouteTiles`, `NearYou`, `RideItYourself`):
  nessuna chiave nuova, nessun testo da tradurre.
- `similarity` resta un numero ovunque: renderla opzionale toccherebbe una
  decina di file che la leggono (le card con `match`, i preferiti,
  `toResult` → `RouteResult`). `muwDetail` resta com'è, il suo `1` finisce
  solo nel `RouteResult`.

Solo JS, nessun testo nuovo, nessun `locales/*.json`: impronta iOS
invariata (`6f8bba4c`), arriva con un OTA.

## Criteri di accettazione

- [x] Un percorso di MuW, in caricamento e aperto, mostra
      «{title} · {city}» senza «looks» né percento
      (`feed/muwRouteNoScore.test.tsx`; senza la correzione i due test
      falliscono).
- [x] Un percorso di «Explore» tiene «… · looks N% like it» con la sua
      somiglianza (stesso file).
- [x] I test di prima di `ExploredCard`, `muwRoute` e `recommendedRoutes`
      restano verdi (28 su 28 coi nuovi); typecheck, lint e Prettier verdi
      in locale sui file toccati.
- [ ] Impronta iOS `6f8bba4c` con `APP_VARIANT=production`: la misura il
      Coordinatore nella copia di pubblicazione (diff solo JS, lockfile
      uguale).
- [ ] CI verde.

## File toccati

```
apps/mobile/src/explore/recommendedRoutes.ts
apps/mobile/src/explore/ExploredCard.tsx
apps/mobile/src/feed/muwRoute.ts
apps/mobile/src/feed/muwRouteNoScore.test.tsx    (nuovo)
docs/tasks/TASK-405.md                           (nuovo)
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- `FeedScreen.tsx`, `feedWithMuw.ts`, `App.tsx` e `docs/UI.md`: sono della
  PR #868 (TASK-365) finché non è unita.
- Il `similarity: 1` di `muwDetail`, che va nel `RouteResult` (punteggio a
  fine corsa, preferiti): nessuno lo mostra come percento sul foglio, e
  cambiarlo è un'altra scelta.
- Un percorso di MuW tenuto fra i preferiti e riaperto da lì: è un
  preferito, con la sua riga.
- **L'OTA**, che parte col sì dell'utente.

## Esito

Un percorso di MuW aperto dal Feed dice solo «Star · Trento», in
caricamento e aperto; ogni altro percorso tiene «looks N% like it». Il
segno è `scored: false` su `RecommendedRoute`, messo da `muwCardRoute`.
Solo JS; l'impronta la conferma il Coordinatore, l'OTA col sì
dell'utente.
