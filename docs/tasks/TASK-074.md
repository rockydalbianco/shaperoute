# TASK-074 — Niente «fuori tracciato» per il marciapiede opposto o un GPS impreciso

**Stato**: In corso
**Fase**: 4 · **Branch**: `fix/TASK-074-off-route-tolerance`

## Obiettivo

Durante la navigazione l'avviso «You are off the route» arriva solo quando
l'utente è davvero fuori strada, non quando corre sul marciapiede opposto o
il GPS sbaglia per qualche secondo.

## Contesto da leggere

- `docs/UI.md`, «La navigazione»
- ADR-0052 (la navigazione, TASK-049)

Difetto trovato dall'utente: «se sono da una parte della strada e la route è
dall'altra, mi dice di tornare sul tracciato; ma i marciapiedi fanno parte
della strada, quindi serve una tolleranza di almeno 5–10 metri».

La soglia era già 40 m (`OFF_ROUTE_M`), ma **una sola posizione** oltre la
soglia bastava per l'avviso e la vibrazione, e la precisione dichiarata
della posizione (`coords.accuracy`) non si usava. In OSM il marciapiede
opposto è spesso una linea a sé, a 15–25 m; il GPS in città sbaglia di
10–20 m, e a tratti di più.

## Cosa fare

1. In `navigator.ts`: l'avviso dopo più posizioni di fila oltre la soglia,
   che durano qualche secondo; una posizione poco precisa non conta.
2. Ritorno sul percorso altrettanto robusto.
3. `useNavigation.ts` passa `coords.accuracy` e `timestamp` a `onFix`.
4. Test deterministici con sequenze di posizioni finte: marciapiede opposto
   a 20–25 m con rumore, un punto isolato a 60 m, una via parallela
   sbagliata, posizioni con accuracy 80 m.
5. ADR-0070, `UI.md`.

## Criteri di accettazione

- [x] 4 minuti sul marciapiede opposto (22 m, rumore fino a +23 m, con tre
      posizioni di fila oltre 40 m) non danno mai l'avviso.
- [x] Una posizione isolata a 60 m non dà l'avviso.
- [x] Una via parallela a 47–63 m dà l'avviso una volta, fra 8 e 12 s dopo
      averla presa.
- [x] Posizioni con accuracy 80 m non danno l'avviso e non riportano sul
      percorso chi ne è fuori.
- [x] «Back on the route» dopo due posizioni di fila sul percorso.
- [x] Test, typecheck, lint e prettier verdi.

## File toccati

```
apps/mobile/src/navigation/navigator.ts
apps/mobile/src/navigation/navigator.test.ts
apps/mobile/src/navigation/progress.ts
apps/mobile/src/navigation/useNavigation.ts
docs/UI.md
docs/tasks/TASK-074.md
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- Ricalcolare il percorso quando si è fuori (ADR-0052: non si ricalcola).
- Cambiare la frequenza delle posizioni (`FIX_EVERY_M`) o le soglie delle
  svolte (`ANNOUNCE_M`, `PASS_M`).
- La modalità tasca (TASK-070).

## Prova sull'iPhone (in attesa)

PR #86, CI verde. Manca la prova dell'utente per strada, insieme a TASK-061
(«beside» a voce): la farà alla prossima corsa. Il merge lo fa il
coordinatore dopo l'ok.

Come prepararla (Windows PowerShell). C: è quasi pieno: niente zone nuove,
si parte da Trento o Milano, già in cache.

1. Fermare con `Ctrl+C` l'API e Expo che girano da altri checkout.
2. API, dalla radice del worktree:
   ```powershell
   cd C:\Users\ricky\PycharmProjects\shaperoute-TASK-074
   $env:PYTHONPATH = "C:\Users\ricky\PycharmProjects\shaperoute-TASK-074\services\api;C:\Users\ricky\PycharmProjects\shaperoute-TASK-074\services\route-engine;C:\Users\ricky\PycharmProjects\shaperoute-TASK-074\services\ai"
   C:\Users\ricky\PycharmProjects\shaperoute\services\api\.venv\Scripts\python.exe -m shaperoute_api --lan --cache-dir C:\Users\ricky\PycharmProjects\shaperoute\data\cache
   ```
3. App, in un'altra finestra:
   ```powershell
   cd C:\Users\ricky\PycharmProjects\shaperoute-TASK-074
   npm.cmd run mobile
   ```
4. Per strada, dopo «Start»:
   - sul marciapiede opposto al percorso nessun «You are off the route»;
   - su una parallela sbagliata a 50 m o più: banner arancio, avviso una
     volta e vibrazione entro 10 s circa;
   - rientrando, «Back on the route» dopo un paio di posizioni;
   - su un marciapiede senza nome, «…onto the footpath beside Via …».

Dopo il merge: togliere subito il worktree e il suo `node_modules` (C: è
quasi pieno).

## Esito

*(a fine task, dopo la prova)*
