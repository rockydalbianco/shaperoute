# TASK-407 — La 1.0.2 solo per gli screenshot nuovi

**Stato**: In corso
**Fase**: 5 · **Branch**: `chore/TASK-407-version-1-0-2`; punto di build
`release/1.0.2` (non si unisce a `main`)

## Obiettivo

L'utente il 2026-11-06, testuale:

> «Se uscisse adesso solo per gli screenshot, quelle cose slitterebbero alla
> 1.0.3 ho cambiato idea usciamo solo con gli screen shot»

La versione 1.0.1 pubblicata non lascia cambiare gli screenshot. La 1.0.2
esce per portare sullo Store gli 8 screenshot v4, già approvati da Apple
nella Libreria di risorse e già messi sulla bozza 1.0.2 in App Store
Connect. Login Apple e Google (TASK-322 B), schermata di blocco (TASK-401 B),
composer (TASK-348 B–D) e calorie e battito (TASK-374 C/D) passano alla 1.0.3.

## Cosa fare

1. In `main`: `apps/mobile/app.json` a `"version": "1.0.2"`, in un commit da
   solo.
2. `release/1.0.2` = `76305c1a` (il commit dell'ultimo OTA di produzione,
   gruppo `3ef55853`) più il solo commit della versione, preso con
   cherry-pick. In `main` c'è JS che l'utente non ha ancora approvato per la
   produzione, quindi la build non parte da `main`. Se l'utente dà prima
   l'«ok produzione» all'anteprima, il Coordinatore indica `e9960204` al
   posto di `76305c1a`.
3. Su una copia pulita di `release/1.0.2` si misura l'impronta iOS: deve
   essere `6f8bba4c`, come la build 8 (1.0.1).
4. La build la lancia l'utente con il suo account Apple, con il comando
   controllato dal Coordinatore.
5. Il testo «Novità in questa versione» e l'invio in verifica solo con il sì
   esplicito dell'utente.

## Criteri di accettazione

- [ ] `apps/mobile/app.json` in `main` dice `1.0.2`.
- [ ] L'impronta iOS (`APP_VARIANT=production`) di `release/1.0.2` è
      `6f8bba4cf1b6f95fc3c1c84ba9812d950a2232a1`.
- [ ] `fingerprint.config.js` esclude la versione: il cambio non sposta il
      runtime, gli OTA di produzione raggiungono 1.0.1 e 1.0.2 insieme.

## File toccati

```
apps/mobile/app.json
docs/tasks/TASK-407.md
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- Ogni modifica al codice: la 1.0.2 ha lo stesso codice nativo della 1.0.1
  e il JS dell'ultimo OTA di produzione.
- Le immagini per iPad, Apple Watch e iPhone Duo. iPad non serve, perché
  l'app è solo per iPhone. Watch esce con la build 1.1. Duo aspetta Xcode
  27.1, perché il badge «made for iPhone Duo» è una promessa da controllare
  prima nel simulatore.

## Esito

*(a fine task)*
