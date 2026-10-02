# TASK-186 — «Map» e «Data» più grandi nella corsa

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-186-bigger-run-tabs`

Chiesto dall'utente il 2026-10-02 («Quando entro in run with ingrandiscimi
pulsante map e data sotto»); numero assegnato dal coordinatore.

## Obiettivo

Durante la corsa, i due nomi in fondo alla scheda che cambiano pagina,
«Map» e «Data», sono due pulsanti grandi: si prendono col pollice mentre
si corre, senza cercarli.

## Contesto da leggere

- `docs/UI.md` «La corsa» (le due pagine, «Map» e «Data»)
- `docs/DECISIONS.md` ADR-0137 (la corsa a due pagine, TASK-169)
- `apps/mobile/src/screens/RunDashboard.tsx` (`PageTabs`), `Segmented.tsx`
  (l'aspetto da riprendere)

## Cosa fare

1. `PageTabs`: da due scritte piccole con un trattino sotto a due pulsanti
   che si dividono la larghezza della scheda, alti più del tocco minimo,
   con la scritta più grande. La pagina aperta si riconosce dalla
   superficie più chiara, come nelle altre scelte dell'app (`Segmented`):
   non dal giallo, che è del percorso.
2. Uguali sulle due pagine: «Data» ha gli stessi due pulsanti in fondo.
3. Un test sulle misure; `UI.md`, `STATUS.md`, un aggiornamento di
   ADR-0137 in `DECISIONS.md`.

## Criteri di accettazione

- [x] «Map» e «Data» occupano insieme tutta la larghezza della scheda, metà
      ciascuno, e sono alti più di `MIN_TAP_SIZE`.
- [x] La pagina aperta si distingue senza il giallo.
- [x] Tocco e swipe cambiano pagina come prima; chi usa VoiceOver trova
      ancora due «tab» con il loro stato.
- [x] Colori e misure dai token; test, lint, typecheck e prettier verdi.
- [x] Visto in un simulatore, su «Map» e su «Data».

## File toccati

```
apps/mobile/src/screens/RunDashboard.tsx
apps/mobile/src/screens/RunDashboard.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-186.md
```

## Fuori scope

- La schermata «Save» / «Discard» a fine corsa: dentro TASK-172, deciso dal
  coordinatore (stessa richiesta dell'utente).
- «Send to Strava»: TASK-187, dopo la risposta dell'utente.
- Gli altri pulsanti della corsa («Pause», «Pocket», «Music», «Stop»).
- Pubblicare su `preview`: con l'ok dell'utente, da `main` pulito.

## Esito

Fatto il 2026-10-02 (ADR-0137, aggiornamento). «Map» e «Data» sono due
pulsanti larghi metà scheda e alti 56 punti, con la scritta da 16 in
grassetto; la pagina aperta ha la superficie più chiara e il bordo. Uguali
su «Map» e su «Data». Visto in un simulatore con un GPS simulato: i due
pulsanti, il tocco che cambia pagina nei due sensi.

Una cosa vista e non di questo task: nel simulatore il primo tocco su
«Data», due secondi dopo la fine del conto alla rovescia, non ha cambiato
pagina; i tre dopo sì. Da riguardare sull'iPhone: se si ripete, è del
conto alla rovescia (TASK-169), non dei pulsanti.

Pubblicata su `preview` il 2026-10-02, con l'ok dell'utente (update
`21496dce`, da c6f1fc7): resta da provare sull'iPhone.
