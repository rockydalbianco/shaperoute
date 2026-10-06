# TASK-251 — «Paddle»: velocità in km/h e andatura in min/500 m

**Stato**: In lavorazione — parte A (l'uscita in corso e la sua fine) in `main` dalla #383 (`bf859e0`, 2026-10-06), non ancora pubblicata; parte B («My activities») aspetta il via del coordinatore
**Fase**: 4 · **Branch**: `feat/TASK-251-paddle-speed-pace`
**Dipende da**: TASK-191 (i percorsi sull'acqua), TASK-216 (la velocità
in bici, `navigation/ride.ts`), TASK-182 (km o miglia)

## Obiettivo

Chiesto dall'utente il 2026-10-06: «Quando registro un'attività in Kayak o
padel, la velocità oraria non è in chilometri orari, ma è l'unità di misura
che si usa col Kayak e anche l'andatura modificalo». Prima una pagaiata
mostrava i numeri di una corsa: il passo al chilometro dappertutto, nessuna
velocità.

## Scelta dell'utente (2026-10-06)

- **Velocità in km/h, andatura in minuti ogni 500 m.** Proposte anche: nodi
  e min/500 m; solo nodi. Con le miglia di «Settings» la velocità è in mph
  (detto nella proposta scelta), l'andatura resta ogni 500 m.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0215
- `docs/UI.md` «Sull'acqua: «Paddle»», «Velocità e andatura»
- `apps/mobile/src/navigation/ride.ts` (come la bici cambia la corsa)
- `apps/mobile/src/screens/RunPanel.tsx`, `RunDashboard.tsx`

## Parti

- **A — l'uscita in corso e la sua fine (solo app).** Questa PR.
- **B — «My activities» e il post da lì.** L'API tiene lo sport di una
  corsa salvata (`runs.activity`) ma **non lo restituisce** in
  `GET /me/activities` né in `GET /me/activities/{key}`: serve un campo in
  più nel contratto (`activity`), i fixture di `shared-types`, e poi
  `activityText.runFacts` e `postOfActivity`. `activities.py` è di TASK-247:
  si parte col via del coordinatore. Aggiornare il server chiede l'ok
  dell'utente.

## Cosa fare (parte A)

1. `src/navigation/paddle.ts` (nuovo): `isPaddle`, `PADDLE_PACE_M`,
   `per500S`, `paddlePaceLabel`, `paddleAnnouncement`.
2. `RunPanel.tsx`: con `paddling` «Speed now» e «Avg speed» (km/h o mph),
   «Avg /500 m», «Last 500 m»; niente «Last km» né «Elev. gain».
3. `RunDashboard.tsx`: i parziali ogni 500 m, chiamati coi metri.
4. La voce: ogni km (o miglio) col passo medio ogni 500 m, cinque lingue.
5. Il post di fine uscita: l'andatura in `/500 m`; lo sport nel file della
   corsa (`SavedRun.activity`).
6. Senza percorso («Paddle without a route»): lo stesso, dallo sport di
   «Settings» alla partenza.

## Criteri di accettazione

- [x] Lungo un percorso sull'acqua, sotto la mappa: «Speed now» in km/h.
- [x] Su «Data» e in pausa: «Speed now», «Avg speed», «Time», «Avg /500 m», «Last 500 m», «Calories».
- [x] I parziali sono ogni 500 m («500», «1000», …), col loro tempo e la
      differenza dal precedente; prima dei primi 500 m lo dicono.
- [x] Con le miglia: distanza in miglia, velocità in mph, andatura e
      parziali sempre ogni 500 m.
- [x] La voce dice ogni km (con le miglia ogni miglio) col passo medio
      ogni 500 metri, in cinque lingue.
- [x] Il post di fine uscita scrive «5:37 /500 m».
- [x] Senza percorso, con «Paddle» in «Settings»: schermata, voce, fine
      uscita e post come sopra.
- [x] Una corsa e una pedalata, con e senza percorso, restano come prima,
      parola per parola (i test di prima passano senza modifiche).
- [x] Typecheck, lint, prettier e tutti i test dell'app verdi.
- [ ] Guardato dall'utente sull'iPhone (dopo la pubblicazione).
- [ ] Parte B: «My activities» e il post da lì.

## File toccati

```
apps/mobile/src/navigation/paddle.ts            (nuovo)
apps/mobile/src/navigation/paddle.test.ts       (nuovo)
apps/mobile/src/navigation/paddleRun.test.ts    (nuovo)
apps/mobile/src/screens/RunPaddle.test.tsx      (nuovo)
apps/mobile/src/voice/paddleWords.test.ts       (nuovo)
apps/mobile/src/screens/RunPanel.tsx
apps/mobile/src/screens/RunDashboard.tsx        (righe: i parziali)
apps/mobile/src/screens/FinishScreen.tsx        (una riga: il post)
apps/mobile/src/screens/FreeRunScreen.tsx       (righe: lo sport, il post)
apps/mobile/src/navigation/useNavigation.ts     (righe: la frase dei km)
apps/mobile/src/navigation/useFreeRun.ts        (righe: la frase dei km)
apps/mobile/src/navigation/trackStore.ts        (righe: `activity` nel file)
apps/mobile/src/share/postRun.ts                (righe: l'andatura)
apps/mobile/src/voice/phrasebook.ts
apps/mobile/src/voice/{en,it,de,es,fr}.ts       (due frasi ciascuno)
apps/mobile/src/i18n/{it,de,es,fr}.ts           (quattro testi ciascuno)
docs/tasks/TASK-251.md
docs/STATUS.md
docs/DECISIONS.md
docs/UI.md
```

## Da confermare dall'utente

- I testi nuovi: «Avg /500 m» · «Med. /500 m», «Last 500 m» · «Ultimi
  500 m», «Your first 500 metres will show here.» · «I tuoi primi 500 metri
  appariranno qui.», e la frase della voce «… Passo medio: 6 minuti ogni
  500 metri.» (tedesco, spagnolo e francese scritti dall'agente).
- **«Elev. gain» non c'è sull'acqua**: al suo posto e a quello di «Last
  km» ci sono «Avg /500 m» e «Last 500 m». Se il dislivello serve, va tolto
  altro.
- **In bici senza percorso** («Ride without a route») la schermata mostra
  ancora il passo al km, non i km/h: non è stato chiesto e non è stato
  toccato. Da decidere.

## Esito

Parte A in `main` (#383, merge `bf859e0`, 2026-10-06; merge fatto dalla
sessione col sì dell'utente, perché il coordinatore era senza crediti). Le
caselle sono state guardate in un simulatore
(iPhone 17e, Expo Go, una pagina di prova con `RunStrip` e `RunGrid`):
«5:37 /500 m» rimpiccioliva il numero e «Passo med…» e «Letzte 500…»
venivano tagliati, quindi l'unità è nel nome della casella («Avg /500 m»)
e i nomi sono quelli che ci stanno. I parziali e la voce sono provati solo
dai test. Sull'iPhone, pagaiando, non è stata provata.
