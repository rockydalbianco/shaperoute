# TASK-477 — Il pannello di fine attività che non scorre

**Stato**: In lavorazione · 2026-11-12 · assegnato dal Coordinatore
(nessun ADR: è un difetto).

## Il difetto

Visto nel simulatore il 2026-11-12, provando TASK-305 R6b: con un account,
alla fine di un volo, su un iPhone da 844 pt «Save» e «Discard» finivano
sotto il bordo dello schermo. Se ne vedeva solo l'orlo, toccato a caso.

Il pannello sotto la mappa (`screens/MapScreen.tsx`, la View con
`{children}`) non ha un'altezza massima e non scorre. Dentro ci sono due
cose:
- la scheda di fine (volo, sci, scialpinismo…);
- `RunEnd`, il cui modulo arriva da solo al 50% dello schermo
  (`FORM_SHARE`), più i bottoni.

Le schede di fine dello sci (`SnowFinishCard`, cinque righe) e dello
scialpinismo (`SkiTourFinishCard`, quattro) sono più alte di quella del volo
(tre): stessa sorte.

## La correzione

- `MapScreen` riceve `scrolls`, vero solo alla fine di un'attività.
  - Il pannello arriva al massimo sotto la riga del banner: schermo − safe
    area in alto − la riga − due spazi (`cardMaxHeight`).
  - I figli stanno in uno `ScrollView`.
  - Fuori dalla fine resta tutto com'era.
- `App.tsx`: una riga, `scrolls={finishing || freeFinishing}`, col sì del
  Coordinatore.
- `RunEnd.tsx` non si tocca (la #1284 di TASK-476 lo cambia).

## Criteri di accettazione

- [ ] A fine volo, sci e scialpinismo, su iPhone 17e (844 pt), «Save» e
      «Discard» si raggiungono scorrendo. Schermate prima/dopo nel
      simulatore, al turno dopo TASK-461.
- [ ] Fuori dalla fine (risultato, navigazione, corsa) il pannello è come
      prima.
- [x] Test: alla fine i figli sono in uno `ScrollView` col `maxHeight`,
      altrove no (`screens/MapScreenScrolls.test.tsx`).

## File toccati

`apps/mobile/src/screens/MapScreen.tsx`,
`apps/mobile/src/screens/MapScreenScrolls.test.tsx` (nuovo),
`apps/mobile/App.tsx` (una riga, col sì del Coordinatore),
`docs/tasks/TASK-477.md`.

## Legato

La #1302 (TASK-305, il volo in due righe di riquadri) resta in bozza:
l'utente sceglie dalle schermate se tenerla anche con il pannello che
scorre.
