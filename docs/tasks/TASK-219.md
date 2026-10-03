# TASK-219 — «Find friends» è solo una lente

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-219-feed-lens-only`
**Dipende da**: TASK-215 (fatto) · **ADR**: ADR-0182

## Obiettivo

In cima a «Feed» il tasto per cercare gli amici è solo una lente, senza
testo. Chiesto dall'utente il 2026-10-03, dopo aver visto TASK-215: «deve
esserci solo un emoji del trova».

## Contesto da leggere

- `docs/UI.md` «Le pagine» («Feed»), ADR-0178
- `apps/mobile/src/social/FindFriendsButton.tsx`,
  `apps/mobile/src/screens/FeedScreen.tsx`

## Cosa fare

1. Il tasto largo «Find friends» diventa un cerchio con la lente, come il
   bottone di «Profile»; VoiceOver lo legge «Find friends».
2. In cima all'elenco di «Feed», allineato a destra, sotto il bottone di
   «Profile».
3. Test, `UI.md`, ADR.

## Criteri di accettazione

- [x] Sullo schermo nessun testo, solo la lente; il tasto si chiama «Find
      friends» per VoiceOver e apre la ricerca (test).
- [x] In «Feed» è il primo tasto, sopra i disegni (test).
- [x] Nel simulatore: a destra, sotto il bottone di «Profile», dello stesso
      stile dei cerchi di sport e profilo.
- [x] Test verdi dell'app (typecheck, lint, prettier, jest).

## File toccati

```
apps/mobile/src/social/FindFriendsButton.tsx
apps/mobile/src/social/FindFriendsButton.test.tsx
apps/mobile/src/screens/FeedScreen.tsx
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-219.md
```

## Fuori scope

- La pagina della ricerca: resta quella di TASK-215.
- I seguiti qui sotto.

## Seguiti (scelte dell'utente del 2026-10-03: «a tappe»)

Senza numero, finché non partono. Dettagli in ADR-0182.

- **«Invite friends»**, sotto la ricerca: la condivisione del telefono
  (`Share` di React Native, nessuna dipendenza) con un messaggio e il link
  per scaricare Sgrava. **Aspetta l'App Store** (TASK-152): scelta
  dell'utente, scartati il link di Expo Go e un messaggio senza link. Il
  testo del tasto e del messaggio va confermato con l'utente.
- **Gli amici dai contatti**: l'app legge la rubrica, con il permesso, e
  cerca chi è iscritto con quei numeri. Serve il numero di telefono
  nell'account (TASK-183, che chiedeva «a cosa serve il numero»: a farsi
  trovare dagli amici), la sua verifica con un SMS (un servizio a
  pagamento), la dipendenza `expo-contacts` e una riga della privacy (i
  numeri della rubrica arrivano al server: come impronta, mai tenuti). Le
  tre cose vanno chieste all'utente prima.
- **Collegare Facebook**, per ultimo, dopo TASK-152: l'SDK non va in Expo
  Go, serve un'app sviluppatore su Meta e la sua revisione per
  `user_friends`, che dà solo gli amici che hanno collegato anche Sgrava.
- **Strava: non si può.** L'API di Strava non ha più gli elenchi di amici
  e follower (`/athlete/friends` risponde 401), e dal 1° settembre 2026 ha
  tolto anche i membri dei club. Detto all'utente.

## Esito

Fatto il 2026-10-03: in cima a «Feed», a destra sotto il bottone di
«Profile», c'è solo la lente in un cerchio, che apre la ricerca di
TASK-215. Nell'intestazione delle pagine non stava su un iPhone da 390 pt.
Provato nel simulatore (screenshot all'utente).
