# TASK-480 — Explore senza mappe: il fotografo delle mappe nascosto

**Stato**: Done (2026-11-21) — #1363 in `main` (25a9f199); causa dimostrata al
simulatore, schermate prima/dopo approvate dall'utente («Sì, approvo»);
esce con l'OTA 20, che pubblica il Coordinatore col sì dell'utente
**Fase**: 5 · **Branch**: `fix/TASK-480-explore-maps`

## Il difetto

Segnalato dall'utente il 2026-11-21 dal telefono, in produzione (OTA 19,
commit `22d3b0cc`): «in explore manca la mappa sotto ai disegni», «anche con
la corsa e tutti gli altri sport». Le schede di «Explore» mostravano la linea
del disegno sul fondo scuro, senza la mappa sotto.

## La causa

La mappa di una scheda è una foto (TASK-162, ADR-0131): `useFeedMap` la
chiede, `FeedMapShooter` la scatta con una pagina-mappa nascosta, una alla
volta. Con più fotografi montati scatta il primo arrivato, gli altri
aspettano (TASK-332, `useTurn` in `feed/FeedMaps.tsx`).

Per le pagine delle schede il fotografo era quello dentro `FeedScreen`
(TASK-163). Dal TASK-367 e dal TASK-379 il `TabShell` dispone solo la pagina
a schermo e le due vicine: le altre restano costruite ma con
`display: none`. L'ordine delle pagine è Feed, Draw, Messages, Explore,
profilo: con «Explore» a schermo le vicine sono Messages e il profilo, e la
pagina del Feed, col suo fotografo, non è disposta. Lì sotto la pagina-mappa
non dice mai «ready»: nessuna foto viene scattata e nessuna viene
abbandonata, restano tutte in coda finché il Feed, o una sua vicina (Draw,
il profilo), torna a schermo.

Per questo il difetto si vedeva solo in «Explore», e spariva da sé dopo un
passaggio dal Feed, da «Draw» o dal profilo.

## La prova al simulatore (2026-11-21)

Sul codice di `22d3b0cc`, in Expo Go, con un'API locale e dati finti:

- aperta l'app e andati su «Explore»: nessuna mappa dopo 80 s (esempi di
  New York) e dopo 30 s («NEAR YOU» a Trento);
- Feed, «NEAR YOU» di «Draw» e disegni del profilo: mappe presenti;
- dopo 12 s sul Feed, tornati su «Explore»: le mappe ci sono tutte, anche
  quelle chieste per prime. Quindi niente scade (l'attesa di 20 s di
  `SHOT_TIMEOUT_MS` parte solo dopo «ready»): la coda aspetta e basta.

Col codice corretto: «Explore» aperta per prima ha le mappe entro 15 s,
anche scorrendo la lista; Feed, «Draw» e profilo come prima.

Schermate e ricetta in `out/TASK-480/` del checkout principale (non nel
repository): `TASK-480-1-explore.jpg`, `TASK-480-2-feed-draw-profilo.jpg`.

## La correzione

`TabShell` monta un `FeedMapShooter` suo, grande come la finestra, come
primo figlio della shell: prima delle pagine, quindi prende il turno prima
del fotografo di una pagina, ed è disposto qualunque pagina sia a schermo.
Subito sopra c'è una copertura opaca del colore dello sfondo
(`tab-maps-cover`): la pagina-mappa non si vede mai, nemmeno attraverso la
barra delle schede, che è traslucida.

Nient'altro cambia: i fotografi di `PeopleScreen`, `ContestPage` e
`WhileRouting` restano, e servono dove la shell non c'è (la mappa grande).
Niente di nativo, nessuna dipendenza: esce con un OTA.

Nessun ADR: è una correzione, non una decisione nuova (Coordinatore,
2026-11-21).

## File toccati

- `apps/mobile/src/tabs/TabShell.tsx`
- `apps/mobile/src/feed/FeedMaps.tsx` (solo il commento sui fotografi)
- `apps/mobile/src/tabs/TabShellMaps.test.tsx` (nuovo)
- `docs/tasks/TASK-480.md`

## Criteri di accettazione

- [x] Causa dimostrata al simulatore sul codice dell'OTA 19.
- [x] In «Explore» le mappe tornano sotto i disegni, senza toglierle a Feed,
      «Draw» e profilo (simulatore; `TabShellMaps.test.tsx`, tre dei suoi
      quattro test falliscono senza la correzione).
- [x] Test dei file toccati, `tsc`, eslint e Prettier verdi; CI verde.
- [x] Schermate prima/dopo di Explore, Feed, Draw e profilo approvate
      dall'utente (2026-11-21: «Sì, approvo»).
- [x] #1363 in `main`.

## Cosa resta

- **OTA 20**: lo chiede e lo pubblica il Coordinatore, col sì dell'utente.
  Poi uno sguardo dell'utente a «Explore» sul telefono.
- **Pulizia, non urgente**: il `FeedMapShooter` rimasto in
  `apps/mobile/src/screens/FeedScreen.tsx` ora aspetta sempre, perché la
  shell prende il turno per prima. Si può togliere, coi test che lo
  guardano, **dopo** TASK-355 B2, TASK-312 C2, TASK-481 A e TASK-309 B2, che
  hanno `FeedScreen.tsx` in coda (indicazione del Coordinatore).
- Un fotografo montato dentro una pagina delle schede non deve mai essere
  il primo: chi ne aggiunge uno lo tenga dietro quello della shell, o non lo
  aggiunga affatto.
