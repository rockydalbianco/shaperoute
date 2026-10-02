# TASK-198 — La penna alzata nella corsa: pausa automatica e avviso a voce

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-198-pen-up-run`
**ADR**: ADR-0157 per il contratto (scritto da TASK-197); un ADR nuovo
dal coordinatore solo se serve una scelta dell'app
**Dipende da**: TASK-197 in `main` e sul server (l'aggiornamento del server
solo con l'ok dell'utente)

## Obiettivo

Correndo una parola chiesta con la penna alzata, l'app mette in pausa la
registrazione da sola alla fine di ogni lettera e la fa ripartire
all'inizio della successiva, dicendolo a voce. Sulla mappa i tratti a piedi
si vedono tratteggiati. Il punteggio di fine corsa guarda solo le lettere.

Chiesto e confermato dall'utente il 2026-10-02: «pausa automatica con
avviso a voce».

## Contesto da leggere

- `docs/tasks/TASK-197.md`: `pen_up` nella richiesta, `walks` nel
  risultato
- `docs/API.md` «`POST /routes`», «`POST /track-scores`»
- `docs/UI.md`: la corsa, la mappa, la voce
- `apps/mobile/src/navigation/trackRecorder.ts`: le pause (TASK-169,
  ADR-0137), con quella automatica di chi sta fermo
- `apps/mobile/src/navigation/runControl.ts`, `navigator.ts`,
  `progress.ts`, `phrases.ts`

## Cosa fare

1. **La richiesta**: in «Draw», con una parola, l'interruttore «Lift the
   pen between letters». **Acceso di default: da confermare con
   l'utente** (proposta della sessione social del 2026-10-02). Acceso,
   la richiesta manda `pen_up: true`.
2. **La mappa**, nella scelta del percorso e nella corsa: le lettere come
   oggi, i tratti a piedi tratteggiati, con un colore da
   `src/theme/tokens.ts` (aggiungerlo lì se manca). Un risultato senza
   `walks` si disegna come oggi.
3. **La pausa automatica**: quando chi corre arriva all'inizio di un tratto
   a piedi, l'app mette in pausa la registrazione, una pausa di tipo nuovo
   («penna»), che non si confonde con quella di chi sta fermo né con quella
   chiesta a mano. Quando arriva entro pochi metri dall'inizio della
   lettera successiva, la registrazione riparte. La soglia si sceglie con
   la precisione del GPS (`POOR_FIX_M`) e si scrive in `UI.md`.
4. **L'avviso a voce**, in inglese come il resto dell'interfaccia: alla
   fine di una lettera, per esempio «Letter done. Walk to the A: the
   drawing is paused.»; all'inizio della successiva, «Pen down: draw the
   A.». Le indicazioni di svolta continuano anche a piedi.
5. **I numeri della corsa**: tempo e distanza non contano i tratti a piedi.
   Viene già dalle pause; un test lo controlla.
6. **Il punteggio**: `POST /track-scores` riceve anche i `walks`.
7. **La corsa salvata e Strava**: le pause «penna» vanno con le altre. Il
   GPX per Strava apre già un segmento nuovo a ogni pausa: Strava mostra
   le lettere unite da linee dritte sulla base. Se l'API vuole sapere che
   una pausa è «penna», è un campo in più, da concordare con il
   coordinatore.
8. **Chi mette in pausa a mano** durante un tratto a piedi: la pausa resta
   sua, e la ripartenza all'inizio della lettera non la toglie.

## Criteri di accettazione

- [ ] Con l'interruttore acceso la richiesta ha `pen_up: true`; spento, o
      con una forma, il campo non c'è.
- [ ] Un risultato con `walks` disegna i tratti a piedi tratteggiati, nel
      colore preso da `tokens.ts`; uno senza `walks` resta com'è.
- [ ] Test con posizioni simulate lungo una parola di 3 lettere: due pause
      «penna», ognuna dall'inizio di un tratto a piedi a pochi metri
      dall'inizio della lettera successiva; i due avvisi a voce, una volta
      sola ciascuno.
- [ ] La distanza e il tempo della corsa non contano i tratti a piedi:
      test.
- [ ] Una pausa chiesta a mano durante un tratto a piedi non viene tolta
      dalla ripartenza automatica: test.
- [ ] Il punteggio manda i `walks`: test.
- [ ] Test, lint, `tsc` e `npm run format:check` verdi.

## File toccati

Elenco previsto; la PR dichiara i suoi.

```
apps/mobile/src/navigation/trackRecorder.ts
apps/mobile/src/navigation/runControl.ts
apps/mobile/src/navigation/navigator.ts
apps/mobile/src/navigation/progress.ts
apps/mobile/src/navigation/phrases.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/useRouteRequest.ts
apps/mobile/src/api/trackScores.ts
apps/mobile/src/theme/tokens.ts
apps/mobile/src/**/*.test.ts(x)
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-198.md
```

## Fuori scope

- **Il motore e l'API**: TASK-197.
- **Le cifre** nelle parole e **le forme di più pezzi**: task a parte
  (TASK-197, «Fuori scope»).
- **L'orologio**: la pausa automatica è solo nell'app. Con il GPX
  sull'orologio si mette in pausa a mano, ai waypoint «Pause» e «Resume»
  di TASK-197.
- **Mostrare in «My activities» la corsa con i tratti a piedi spezzati**:
  oggi la linea registrata unisce le pause con una linea dritta, come fa
  Strava. Se l'utente la vuole spezzata, è un seguito.
- **Pubblicare l'app**: solo con l'ok dell'utente, da `origin/main` pulito.

## Esito

*(a fine task)*
