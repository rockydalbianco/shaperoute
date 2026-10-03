# TASK-205 — Lo sport accanto al profilo

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-205-sport-button`

## Obiettivo

Lo sport si cambia dalla prima schermata, senza passare da «Settings».
Chiesto dall'utente il 2026-10-03: «Nella prima schermata a fianco al
profilo, metti la possibilità di cambiare sport».

## Contesto da leggere

- `docs/UI.md`, «Le pagine» e «Profile» (la sezione «Sport» di «Settings»)
- `docs/DECISIONS.md` ADR-0152 (lo sport in «Settings»), ADR-0153 (la bici)
- `apps/mobile/src/settings/` (TASK-189, TASK-190)

## Cosa fare

1. `src/settings/SportButton.tsx`: un pulsante tondo, come quello del
   profilo, con l'emoji dello sport scelto. Toccato apre un piccolo menu
   sotto di sé con gli sport di «Settings» (`SPORTS`): uno pronto si
   sceglie con un tocco e il menu si chiude; uno non pronto dice «Soon» e
   non prende il tocco. Un tocco fuori dal menu, o il tasto indietro di
   Android, lo chiude senza cambiare niente.
2. La scelta è la stessa di «Settings» (`saveSport`, `sport.json`): il
   pulsante segue `useSport`, quindi anche una scelta fatta in «Settings»,
   e «Draw» cambia subito come da «Settings».
3. `App.tsx`: l'`action` del `Pager` diventa il pulsante dello sport e
   quello del profilo, affiancati.
4. Test deterministici del pulsante; `UI.md`, `STATUS.md`, ADR-0165.

## Criteri di accettazione

- [x] Nell'intestazione di «Feed», «Draw» ed «Explore», a sinistra del
      pulsante del profilo, c'è il pulsante dello sport con l'emoji dello
      sport scelto (🏃‍♂️ «Run», 🚴 «Bike»).
- [x] Toccato, mostra «Run», «Bike» e «Paddle» con «Soon»; lo sport scelto
      ha il «✓».
- [x] Scegliere «Bike» lo salva come «Settings» (`saveSport("bike")`),
      chiude il menu e il pulsante mostra 🚴; «Draw» chiede `cycling`.
- [x] «Paddle» non si sceglie; un tocco fuori chiude il menu senza
      cambiare sport.
- [x] Una scelta fatta in «Settings» si vede subito sul pulsante.
- [x] Sulla mappa e durante la corsa il pulsante non c'è, come quello del
      profilo.
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/settings/SportButton.tsx (nuovo)
apps/mobile/src/settings/SportButton.test.tsx (nuovo)
apps/mobile/__tests__/AppSportButton.test.tsx (nuovo)
apps/mobile/App.tsx (l'action del Pager)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-205.md
```

## Fuori scope

- Togliere la sezione «Sport» da «Settings»: resta, le due scelte sono la
  stessa.
- Cosa mostrano «Explore», «Feed» e la corsa con «Bike»
  (`tasks/TASK-190.md`, «Domande aperte»).
- «Paddle» pronto: arriva con TASK-191 C, che accende `ready` in
  `sport.ts`; il pulsante lo mostra da solo.

## Esito

Il pulsante dello sport sta a sinistra del profilo su «Feed», «Draw» ed
«Explore»: emoji dello sport scelto, un menu sotto di sé con «Run», «Bike»
e «Paddle» «Soon», la stessa scelta di «Settings» (ADR-0165). Test: 6 del
pulsante (`SportButton.test.tsx`) e 2 dell'app (`AppSportButton.test.tsx`:
«Bike» scelto dall'intestazione porta «Draw» a 10 km e a «Ride without a
route»); suite dell'app verde (148 file, 1302 test), lint, typecheck e
Prettier verdi. Visto nel simulatore su un iPhone 13 mini (375 punti, il
più stretto): ci sta, con circa 11 punti fra «Explore» e il pulsante;
immagini in `out/task-205/` (fuori da git). Il menu è stato aperto con una
riga temporanea in una copia, perché il simulatore non prendeva tocchi
senza il permesso dell'utente. **Da provare sull'iPhone**: il tocco, il
menu, la scelta, con il prossimo aggiornamento pubblicato (ok
dell'utente). I testi nuovi («Sport, Run» per VoiceOver, «Changes the
sport», «Close») sono dell'agente.
