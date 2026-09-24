# TASK-051 — Due schermate: prima cosa disegnare, poi la mappa

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-051-two-screens`

## Obiettivo

L'app smette di sembrare una pagina web con due pannelli attorno alla
mappa: una schermata per scegliere forma e distanza, una per la mappa con
il percorso. Tutto quello che l'app fa oggi continua a funzionare.

## Scelta dell'utente (2026-09-24)

Dopo TASK-046: «cambiare un po' l'interfaccia e renderla più app e meno
sito». Fra tre proposte dell'agente (mappa piena con foglio, due
schermate, stesso layout rifinito) l'utente ha scelto **due schermate**.

## Contesto da leggere

- `docs/UI.md` («Il tema», «La schermata» e seguenti)
- `apps/mobile/App.tsx`, `src/route/RoutePanel.tsx`, `__tests__/App.test.tsx`

## Cosa fare

Decisioni dell'agente su delega dell'utente, dentro la scelta:

1. **Schermata «What to draw»**, all'apertura: il nome dell'app, da dove si
   parte (con «My position» e, senza posizione, la ricerca del luogo), le
   forme del catalogo come tessere da toccare, un campo per scrivere un'altra
   parola (letta dall'AI come oggi), la distanza con − e + attorno al campo
   dei km, e «Draw route» giallo in fondo.
2. **Schermata della mappa**: si apre con «Draw route». La mappa a tutto
   schermo, «←» in alto per tornare alla scelta, e in basso una scheda con
   l'attesa («Cancel»), il risultato («Export GPX») o il problema («Try N
   km», le forme da toccare, che riportano alla prima schermata).
3. **Senza librerie nuove**: la navigazione è uno stato dell'app, non
   React Navigation. La mappa resta montata anche sulla prima schermata
   (nascosta), così la pagina di MapLibre non si ricarica a ogni andata e
   ritorno.
4. Le tessere delle forme hanno un simbolo di testo (♥ ★ ○ ☾ e le emoji di
   gatto, pesce, cavallo). Disegnare i contorni veri vuole
   `react-native-svg`: una dipendenza, da chiedere prima.
5. La distanza resta un campo con il tastierino, più − e + a passi di 1 km,
   fermi fra 1 e 21. Un cursore vuole una libreria o un componente fatto a
   mano: rimandato.
6. Il titolo diventa «Sgrava», il nome del progetto (`CLAUDE.md`).

## Criteri di accettazione

- [x] All'apertura la schermata di scelta; «Draw route» apre la mappa e
      chiede il percorso; «←» torna alla scelta con forma e distanza di prima.
- [x] Tutti i comportamenti di `UI.md` restano: partenza e ricerca, parole
      lette dall'AI, distanza e suoi limiti, attesa e «Cancel», risultato e
      avvisi, «Export GPX», problemi con «Try N km» e le forme.
- [x] − e + cambiano la distanza di 1 km, entro 1–21 (test).
- [x] Toccare una tessera sceglie quella forma (test).
- [x] Nessun colore scritto a mano; ogni cosa da toccare alta almeno 44.
- [x] `npm run typecheck`, `npm run lint`, `npm run format:check`,
      `npm test` puliti.
- [x] Provato dall'utente sull'iPhone.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/screens/ChooseScreen.tsx   (nuovo)
apps/mobile/src/screens/MapScreen.tsx      (nuovo)
apps/mobile/src/route/ShapeTiles.tsx       (nuovo)
apps/mobile/src/route/DistanceStepper.tsx  (nuovo)
apps/mobile/src/route/distance.ts, distance.test.ts
docs/UI.md, docs/STATUS.md
```

## Fuori scope

- Contorni disegnati delle forme (`react-native-svg`) e cursore della
  distanza: dipendenze da chiedere.
- Animazioni fra le schermate.
- Cambiare i testi dei messaggi, a parte il titolo.
- Le indicazioni di svolta nell'app (TASK-047 e seguenti).

## Esito

Provato dall'utente sull'iPhone il 2026-09-24: «sì, va bene».

Le due schermate funzionano nei test: 224 verdi, 5 nuovi sull'andata e
ritorno, − e +, le tessere. In più rispetto al piano, deciso dall'agente:
«←» durante l'attesa abbandona il percorso come «Cancel»; «Draw route» su
un percorso già disegnato lo mostra senza richiederlo all'API; il file
`ShapeTiles.tsx` e `DistanceStepper.tsx` stanno in `src/route/`.
