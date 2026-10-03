# TASK-204 — La grafica della corsa in corso

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-204-run-screen-look`

## Obiettivo

Chiesto dall'utente il 2026-10-03: «Migliora la parte grafica di quando
registri una corsa». Alla fine la schermata della corsa in corso, con un
percorso e senza, si legge meglio a colpo d'occhio, con gli stessi numeri,
gli stessi comandi e lo stesso comportamento di TASK-169.

## Contesto da leggere

- `docs/UI.md`, «Il tema» e «La navigazione» (la corsa: due pagine, il
  conto alla rovescia, la pausa).
- ADR-0046 (il giallo è del percorso), ADR-0137 (la corsa di TASK-169).

## Cosa fare

1. Sotto la mappa, i tre numeri senza riquadri: la distanza per prima e più
   grande, il passo e il tempo accanto, separati da una riga sottile; il
   nome sotto il numero, piccolo e maiuscolo, l'unità accanto al numero.
2. Gli stessi numeri nei sei riquadri di «Data» e della pausa: il valore
   con l'unità accanto, il nome sotto.
3. «Pocket» e «Music» tondi, con un'icona disegnata (un telefono, una
   nota) e il nome sotto, come «Stop» e «Resume»; il nome anche sotto
   «Pause».
4. «Paused» in una pillola con il segno della pausa, sopra i pulsanti.
5. In «Data», accanto a ogni km una barra: più lunga se il km è stato più
   veloce, la più veloce chiara, le altre grigie. «Auto-pause» e «Voice»
   con un interruttore disegnato al posto di «On» / «Off».
6. Nei banner sopra la mappa la freccia (la svolta, o la partenza) in un
   disco scuro; la barra del percorso fatto più spessa.
7. Il conto alla rovescia: ogni numero entra rimpicciolendo, con un anello
   giallo che si allarga e svanisce.

## Criteri di accettazione

- [x] Nessun testo, numero, comando o comportamento cambiato: i test di
      TASK-164, 169, 173, 186 passano come sono.
- [x] La distanza sotto la mappa è più grande del passo e del tempo (test).
- [x] Ogni km di «Data» ha la sua barra, lunga 1 per il più veloce e 0,35
      per il più lento (test).
- [x] Nessun colore scritto a mano: tutto da `src/theme/tokens.ts`; il
      giallo solo per il percorso, «Resume» e il conto alla rovescia.
- [x] Viste nel simulatore: la corsa, la pausa, «Data» con i km, il conto
      alla rovescia.

## File toccati

```
apps/mobile/src/screens/Countdown.tsx
apps/mobile/src/screens/FreeRunScreen.tsx      (solo StartPointer e i suoi stili)
apps/mobile/src/screens/NavigateScreen.tsx
apps/mobile/src/screens/RunDashboard.tsx
apps/mobile/src/screens/RunDashboard.test.tsx
apps/mobile/src/screens/RunPanel.tsx
docs/tasks/TASK-204.md
docs/UI.md                                     (le righe della corsa)
docs/DECISIONS.md                              (ADR-0163)
docs/STATUS.md                                 (le righe di TASK-204)
```

## Fuori scope

- La schermata di fine corsa e la scheda di una corsa salvata: sono dove
  arriva TASK-117 (pubblicare una corsa). I sei riquadri di
  `FreeFinishCard` cambiano aspetto da soli, perché usano `RunGrid`, ma il
  suo file non si tocca in quella parte.
- La linea della corsa sulla mappa e il riquadro dell'attribuzione di
  OpenFreeMap: sono della mappa (`src/map/`), comune a tutte le schermate.
- Testi nuovi o cambiati, numeri nuovi (il battito), «Map» e «Data» (alti
  56 punti per scelta dell'utente, TASK-186).
- Librerie di icone o di grafica: le icone sono disegnate con le `View`,
  come già la pausa e il «play».

## Esito

Fatto (PR #233, in `main` dal 2026-10-03): la corsa in corso con il
nuovo aspetto, visto nel simulatore (corsa, pausa, «Data» con due km, il
conto alla rovescia in video); 1294 test verdi, nuovi quelli della
distanza, dei nomi sotto i pulsanti e delle barre dei km. Nessun testo
cambiato; **una parola nuova sullo schermo**, «Pause» sotto il pulsante
(prima solo l'etichetta d'accessibilità). Non visto dal vivo: il banner
della svolta con il disco (stesso codice di quello della partenza, visto).
Da guardare con una build Android: il carattere «♪» di «Music».

Il 2026-10-03, con l'ok dell'utente, `main` (c16e9c1) è stato pubblicato
su un ramo EAS a parte, `task-204-test`, aperto dall'utente con il link del
gruppo; `preview` non è cambiato. L'utente: «mi piace, teniamo Pause».
L'aspetto e la parola «Pause» sono confermati.
