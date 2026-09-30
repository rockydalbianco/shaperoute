# TASK-091 — App: registrare la traccia durante la navigazione

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-091-track-recording`

## Obiettivo

Mentre l'utente naviga un percorso, l'app tiene la traccia GPS di quello
che ha corso, e la conserva sul telefono anche se l'app si chiude.

## Contesto da leggere

- `docs/UI.md` «La navigazione»
- `apps/mobile/src/navigation/useNavigation.ts`
- `docs/DECISIONS.md` ADR-0066, ADR-0070

## Cosa fare

1. Modulo nuovo `navigation/trackRecorder.ts`, puro: riceve le posizioni
   (lat, lon, errore, ora), scarta quelle con errore oltre la soglia di
   ADR-0070 e quelle a meno di 5 m dalla precedente, tiene distanza e
   durata.
2. Collegarlo a `useNavigation`: parte con «Start», si ferma con la fine
   della navigazione; funziona anche in modalità tasca.
3. Salvataggio sul telefono a intervalli con `expo-file-system` (già
   presente), insieme alla richiesta e al percorso pianificato; alla
   riapertura una corsa interrotta si può riprendere o scartare.
4. Test di `trackRecorder` e del salvataggio, con posizioni finte.
5. `UI.md`.

## Criteri di accettazione

- [ ] Una sequenza di posizioni finte produce la traccia attesa, senza i
      punti scartati, con distanza in metri.
- [ ] La traccia sopravvive alla chiusura dell'app (test sul file).
- [ ] Nessuna dipendenza nuova; nessun dato lascia il telefono.
- [ ] Test dell'app verdi; prova sull'iPhone camminando almeno 500 m.

## File toccati

```
apps/mobile/src/navigation/trackRecorder.ts
apps/mobile/src/navigation/trackRecorder.test.ts
apps/mobile/src/navigation/trackStore.ts
apps/mobile/src/navigation/trackStore.test.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useNavigation.test.ts
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-091.md
```

## Fuori scope

- GPS a telefono bloccato: in Expo Go non c'è (serve una build propria).
  La traccia si registra con lo schermo acceso o in modalità tasca.
- Punteggio e schermata di fine corsa (TASK-092).
- Registrare una corsa senza un percorso pianificato.

## Esito
