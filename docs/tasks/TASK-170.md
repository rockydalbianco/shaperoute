# TASK-170 — Togliere «Run with Strava»

**Stato**: Done
**Fase**: 4 · **Branch**: `chore/TASK-170-no-strava`

Chiesto dall'utente il 2026-10-02 («L'impostazione run with strava la
vorrei togliere»); numeri assegnati dal coordinatore (ADR-0138).

## Obiettivo

Nell'app non c'è più il pulsante «Run with Strava», né la scheda in tre
passi che apriva: da un percorso si esce con «Start» o con «Export GPX».

## Contesto da leggere

- `docs/UI.md` «Correre con Strava», «Export del GPX»
- `docs/DECISIONS.md` ADR-0106 (TASK-135)

## Cosa fare

1. Togliere `RunWithStrava` dalle tre schede di un percorso: disegnato
   (`RoutePanel.tsx`), di «Explore» (`ExploredCard.tsx`), a tema
   (`ThemedCard.tsx`).
2. Cancellare `apps/mobile/src/strava/`, che nessun altro usa.
3. Un controllo nei test delle tre schede: il pulsante non c'è.
4. Documenti: `UI.md`, `INSIGHTS.md`, `STATUS.md`, ADR-0138 che supera
   ADR-0106.

## Criteri di accettazione

- [x] Nessuna delle tre schede di un percorso mostra «Run with Strava».
- [x] «Export GPX» e «Start» funzionano come prima, con il segnale
      `route_chosen` (`via: "start"` o `"gpx"`).
- [x] Nel codice dell'app non resta niente di Strava, a parte i tre
      controlli dei test.
- [x] Test, lint, typecheck e prettier verdi.

## File toccati

```
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx
apps/mobile/src/explore/ExploredCard.tsx
apps/mobile/src/explore/ExploredCard.test.tsx
apps/mobile/src/explore/ThemedCard.tsx
apps/mobile/src/explore/ThemedCard.test.tsx
apps/mobile/src/strava/RunWithStrava.tsx        (cancellato)
apps/mobile/src/strava/RunWithStrava.test.tsx   (cancellato)
docs/UI.md
docs/INSIGHTS.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-170.md
```

## Fuori scope

- «Export GPX»: resta com'è, ed è il modo di portare un percorso in
  un'altra app, Strava compresa.
- L'API, il server, le variabili d'ambiente: del lavoro di TASK-135 lì non
  c'è niente (nessun account collegato, nessun token, nessuna chiave).
- Le altre menzioni di Strava nei documenti, che non parlano del pulsante:
  il runner che «usa già Strava o Garmin» (`PRODUCT.md`), la Strava art
  (`ROADMAP.md`, ADR vecchi), l'import del GPX in Strava non ancora provato
  (`GPX.md`, «Non ancora verificato»).
- Il task file di TASK-135 e il testo di ADR-0106: restano come storia.

## Esito

Fatto (2026-10-02). Il pulsante e la scheda non ci sono più; le tre schede
finiscono con «Export GPX» e il loro «Back…». 818 test dell'app verdi
(tre controlli nuovi, tolti i cinque test di `RunWithStrava`), lint,
typecheck e prettier puliti. Non guardato su un telefono: si vede dopo la
prossima pubblicazione su `preview`.

Di Strava altrove non c'era niente da togliere: TASK-135 era solo app,
senza API, senza `.env`, senza `DEPLOY.md`. Il seguito di TASK-135
(«l'import in Strava con un account vero») cade con il pulsante; che il
GPX si importi in Strava resta fra le cose non verificate di `GPX.md`.
