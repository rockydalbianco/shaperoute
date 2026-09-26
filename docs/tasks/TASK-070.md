# TASK-070 — Modalità tasca: schermo acceso ma nero, tocchi bloccati, voce e GPS attivi

**Stato**: In corso — codice e test fatti, manca la prova sull'iPhone
**Fase**: 4 · **Branch**: `feat/TASK-070-pocket-mode`

## Obiettivo

Durante la navigazione l'utente mette il telefono in tasca con lo schermo
nero e insensibile ai tocchi, e continua a sentire le indicazioni a voce.

## Contesto da leggere

- `docs/UI.md`, «La navigazione»
- ADR-0052 (navigazione), ADR-0070 (tolleranza «fuori tracciato»)

Storia: l'utente voleva le indicazioni col telefono bloccato. La posizione
in background di `expo-location` non funziona in Expo Go («You must use a
development build»), e una build propria su iPhone da Windows richiede
l'account Apple Developer a pagamento. L'utente ha scelto la strada B, la
«modalità tasca»: l'app resta in primo piano con lo schermo acceso, quindi
voce e GPS funzionano come oggi, ma il telefono sembra spento.

Dipendenze autorizzate dall'utente: `expo-keep-awake` ed `expo-brightness`
(`~57.0.2`, installate con `npx.cmd expo install`). Tutte e due sono nel
runtime di Expo Go per SDK 57: non chiedono plugin né `app.json`.

## Cosa fare

1. `usePocketMode(active)`: keep awake, luminosità al minimo, ritorno alla
   luminosità di prima all'uscita, all'arrivo, con «Stop», in background.
2. `PocketScreen`: `Modal` nero che ignora i tocchi; si esce tenendo premuto
   2 s. Avviso una volta per avvio dell'app.
3. «Pocket» accanto a «Stop» in `NavigationCard`.
4. Test deterministici con i moduli Expo finti; ADR-0066; `UI.md`.
5. Stima della batteria; prova sull'iPhone con l'utente.

## Criteri di accettazione

- [x] «Pocket» durante la navigazione: schermo nero, luminosità 0, keep
      awake col tag `pocket-mode`.
- [x] Un tocco sul nero non fa niente; tenere premuto 2 s esce, e la
      luminosità torna com'era.
- [x] La luminosità torna com'era anche all'arrivo, con «Stop» e quando
      l'app va in background; con il centro di controllo torna e poi si
      riabbassa.
- [x] Avviso la prima volta: «…if you press the side button, directions
      stop…», con «Cancel» e «Go dark»; le volte dopo si parte subito.
- [x] Navigazione, voce, vibrazione e GPS non cambiano (`useNavigation.ts`
      e `navigator.ts` non toccati).
- [x] Test, typecheck, lint e prettier verdi.
- [ ] Prova sull'iPhone: voce in tasca, tocchi ignorati, uscita, luminosità
      di prima.

## File toccati

```
apps/mobile/src/navigation/usePocketMode.ts        (nuovo)
apps/mobile/src/navigation/usePocketMode.test.ts   (nuovo)
apps/mobile/src/screens/PocketScreen.tsx           (nuovo)
apps/mobile/src/screens/NavigateScreen.tsx
apps/mobile/src/screens/NavigateScreen.test.tsx
apps/mobile/package.json
package-lock.json
docs/UI.md
docs/tasks/TASK-070.md
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- Posizione in background, build propria, EAS Build.
- Fermare la mappa sotto il nero (è in `App.tsx`, di TASK-065).
- Ricordare l'avviso fra un avvio e l'altro (servirebbe una dipendenza).
- Tenere lo schermo acceso anche fuori dalla modalità tasca.

## Batteria (stima)

Nessuna misura ancora: da fare nella prova (sotto). Stima da valori tipici
di iPhone, per un'ora di corsa:

| Parte | Schermo normale, mappa | Modalità tasca |
|---|---|---|
| GPS «BestForNavigation», ogni 5 m | 5–8 % | 5–8 % |
| Schermo | 8–15 % (luminosità alta, al sole) | OLED: ~1 % (pixel neri quasi spenti); LCD (SE, XR, 11): 2–4 % |
| Mappa (WebView) che segue la posizione | 2–4 % | 2–4 % (resta sotto il nero) |
| Voce e vibrazione | < 1 % | < 1 % |
| **Totale** | **15–25 %/h** | **8–13 %/h** (OLED), **10–16 %/h** (LCD) |

In pratica la modalità tasca costa più o meno quanto una corsa con Strava
a schermo spento più un paio di punti per la mappa: una corsa di 1–2 ore
va, un telefono sotto il 30 % no.

## Prova sull'iPhone

Tutto da **Windows PowerShell**, dal worktree su D:. C: è quasi pieno:
niente zone nuove, si parte da Trento, Milano o una zona già in cache.

1. Fermare con `Ctrl+C` l'API e Expo che girano da altri checkout.
2. API, prima finestra:
   ```powershell
   cd D:\shaperoute-TASK-070
   $env:PYTHONPATH = "D:\shaperoute-TASK-070\services\api;D:\shaperoute-TASK-070\services\route-engine;D:\shaperoute-TASK-070\services\ai"
   C:\Users\ricky\PycharmProjects\shaperoute\services\api\.venv\Scripts\python.exe -m shaperoute_api --lan --cache-dir D:\shaperoute-data\cache
   ```
3. App, seconda finestra. A casa sulla stessa Wi-Fi:
   ```powershell
   cd D:\shaperoute-TASK-070
   npm.cmd run mobile
   ```
   Fuori casa, con Tailscale acceso su PC e iPhone (l'indirizzo è quello
   di `& "C:\Program Files\Tailscale\tailscale.exe" ip -4`):
   ```powershell
   cd D:\shaperoute-TASK-070
   $env:REACT_NATIVE_PACKAGER_HOSTNAME = "100.x.y.z"
   npm.cmd run mobile
   ```
4. Sull'iPhone: percorso, «Start», poi **«Pocket»**:
   - compare l'avviso «Pocket mode»; «Go dark» → schermo nero, luminosità
     al minimo;
   - toccare e strisciare sul nero: non succede niente;
   - tenere premuto: «Keep holding…», dopo 2 s si torna alla mappa con la
     luminosità di prima;
   - «Pocket» di nuovo: niente avviso, subito nero.
5. In tasca, camminando o correndo: le svolte si sentono a voce con la
   vibrazione come senza modalità tasca; su una via sbagliata «Off the
   route» dopo 8–10 s.
6. Luminosità: dal nero, aprire il centro di controllo → la luminosità
   torna; chiuderlo → di nuovo nero e buio. Tornare alla home → la
   luminosità è quella di prima.
7. Batteria: annotare la percentuale prima e dopo 30 minuti in modalità
   tasca, e il modello dell'iPhone.

## Esito

*(dopo la prova)*
