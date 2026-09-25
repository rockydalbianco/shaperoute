# TASK-069 — La barra di caricamento con una stima per le parole

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-069-word-progress`

## Obiettivo

Quando la richiesta è una parola, la barra di caricamento stima il calcolo
con un tempo misurato sulle parole, non con quello di una forma della
stessa distanza.

## Contesto da leggere

- `docs/UI.md`, «Chiedere un percorso» (la barra e i tempi)
- ADR-0050 (la barra come stima per fase), ADR-0055 (pulsa oltre il doppio)
- `docs/API.md`, «Una parola invece di una forma» (tempi già noti)

## Cosa fare

1. Misurare con la CLI del motore (`python -m route_engine --word`) 2–3
   parole di lunghezze diverse, a Trento, con la zona già in cache.
2. Da quei numeri, una funzione pura `wordSeconds(word, distanceM)` in
   `progress.ts`, scelta da `phaseSeconds`/`estimateProgress` nella fase
   di calcolo quando la richiesta ha una parola.
3. `LoadingBar` riceve la parola e la passa alla stima; `RoutePanel` gliela
   dà da `view.request.word`.
4. Test deterministici della stima e della barra; `UI.md` aggiornato.

## Criteri di accettazione

- [x] Una richiesta con `word` usa `wordSeconds` per la fase di calcolo;
      una forma usa `computeSeconds` come prima.
- [x] La stima di una parola cresce con le lettere e non è mai minore di quella
      di una forma della stessa distanza.
- [x] La barra pulsa oltre il doppio della stima della parola (ADR-0055).
- [x] I tempi misurati sono scritti qui sotto.
- [x] Test verdi (`npm.cmd test` in `apps/mobile`), `tsc` pulito.

## Misure

CLI del motore (`python -m route_engine --word … --start 46.0671,11.1214`),
Trento con la zona già in cache, sul PC di sviluppo, 2026-09-25. Tempo
dall'avvio del comando al GPX scritto, quindi anche il caricamento del grafo.

| Parola | Lettere | Distanza | Secondi |
|---|---|---|---|
| UNO | 3 | 10 km | 45 |
| CIAO | 4 | 15 km | 75, poi 43 |
| TRENTO | 6 | 21 km | 106 |
| CAMMINO | 7 | 21 km | 141 |

Già annotati in `API.md`: «CIAO» a 15 km 40–140 s, «BELLO» fino a 258 s.
A parità di distanza (21 km) 7 lettere costano un terzo più di 6: il tempo
lo fanno le lettere. Media 17,7 s a lettera; scelti **20 s a lettera**
(`WORD_LETTER_S`), un po' sopra, mai meno di `computeSeconds` della stessa
distanza (ADR-0064).

## File toccati

```
apps/mobile/src/route/progress.ts
apps/mobile/src/route/progress.test.ts
apps/mobile/src/route/LoadingBar.tsx
apps/mobile/src/route/LoadingBar.test.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx
docs/UI.md
docs/tasks/TASK-069.md
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- Tempi del motore più brevi per le parole (è lavoro del motore).
- `services/`, `packages/shared-types`, `src/navigation/`, `shapeWords.ts`,
  `ShapeTiles.tsx`.
- Il limite di 5 minuti dell'attesa nell'app.

## Esito

La barra di una parola stima il calcolo dalle lettere (20 s l'una) invece
che dalla distanza: «CIAO» a 15 km ha 80 s di stima e pulsa dopo 160 s, non
più dopo 75 s. Le forme non cambiano. 299 test verdi, `tsc` e lint puliti;
nuovi test in `progress.test.ts`, `LoadingBar.test.tsx` e
`RoutePanel.test.tsx` (la parola arriva alla barra). Non provato
sull'iPhone: cambia solo il ritmo della barra.
