# TASK-061 — `along` nella navigazione (schermo e voce)

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-061-along-navigation`

## Obiettivo

Quando un'indicazione non ha `street` ma ha `along` (TASK-060, ADR-0057),
la navigazione lo dice e lo mostra come deduzione: la via accanto, non la
via su cui si corre.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0045, ADR-0052, ADR-0057
- `docs/UI.md` «La navigazione»
- `packages/shared-types/src/index.ts`, tipo `Direction`

## Cosa fare

1. In `phrases.ts`, `onto` aggiunge « beside <along>» dopo il tipo di
   strada quando `street` manca e `along` c'è.
2. Test sulle frasi (banner, partenza, voce, `street` che vince, API
   vecchia) e sul banner.
3. ADR-0058 con la formulazione; `UI.md` aggiornato.

## Criteri di accettazione

- [x] Senza `street` e con `along`: «Turn left onto the footpath beside Via
      Rosmini», alla partenza «Head out on the footpath beside Via Rosmini».
- [x] Con `street`, la frase è quella di sempre, `along` ignorato.
- [x] Senza `along` (API precedente a TASK-060), `null` o vuoto: frase di
      prima.
- [x] Il banner (`NavigationBanner` in `src/screens/NavigateScreen.tsx`)
      mostra la frase nuova: test su un file nuovo, componente non toccato.
- [x] La voce usa la stessa frase (`announcement` → `instruction`).

## File toccati

```
apps/mobile/src/navigation/phrases.ts
apps/mobile/src/navigation/phrases.test.ts
apps/mobile/src/screens/NavigateScreen.test.tsx   (nuovo, solo test)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-061.md
```

Il componente che mostra l'indicazione è `NavigationBanner` in
`apps/mobile/src/screens/NavigateScreen.tsx`: prende la frase da
`instruction()` e `thenText()`, quindi non è stato modificato.

## Fuori scope

- Voce a telefono bloccato (TASK-070, sospeso).
- Nomi o dedotti nel motore o nell'API (TASK-053, TASK-060).

## Esito

`onto` dice «beside» e la via accanto quando manca il nome (ADR-0058):
banner, seconda riga e voce insieme. 5 test nuovi; tutta la suite mobile
verde (LoadingBar e MapView falliscono solo sotto carico nel giro completo,
passano da soli, non toccati). Da provare sull'iPhone con un percorso che
passa su marciapiedi (Milano o Trento).
