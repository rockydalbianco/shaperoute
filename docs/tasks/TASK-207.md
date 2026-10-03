# TASK-207 — La foto dal cerchio di «Profile»

**Stato**: Done (2026-10-03)
**Fase**: 4 · **Branch**: `feat/TASK-207-profile-photo-button`
**Dipende da**: TASK-178 (la foto, in `main`)

## Obiettivo

La foto del profilo si aggiunge da «Profile», senza passare da
«Settings». Chiesto dall'utente il 2026-10-03 («lavora sul tasto di
aggiungere la foto profilo»); fra le proposte ha scelto un tondo «+» in
basso a destra del cerchio grande di «Profile».

## Contesto da leggere

- `docs/UI.md`, «Profile» con l'account e «Profile picture»
- `docs/DECISIONS.md` ADR-0146 (la foto del profilo)
- `apps/mobile/src/profile/` (TASK-177, TASK-178, TASK-116)

## Cosa fare

1. `ProfileHeader.tsx`: con il proprio profilo il cerchio diventa un
   pulsante («Profile picture») con un tondo «+» in basso a destra, bianco
   con il «+» scuro (nessun pulsante dell'account è giallo). Sul profilo di
   un altro il cerchio resta com'è, senza «+» e senza tocco.
2. `ProfileHome.tsx`: un tocco sul cerchio apre, sotto nome e bio e sopra
   «Edit profile», le stesse scelte di «Settings»: «Choose a picture»,
   «Take a photo» e, se c'è una foto, «Remove picture»; un altro tocco le
   richiude. Mentre la foto va all'API si legge «Saving…» (o «Removing…»)
   e il cerchio non si tocca; un errore si dice lì, con le parole di
   «Settings».
3. Le scelte in un file nuovo, `PhotoChoices.tsx`, usato da `PhotoRow`
   e da «Profile»: la riga di «Settings» non cambia.
4. Test deterministici; `UI.md`, `STATUS.md`, ADR-0168.

## Criteri di accettazione

- [x] In «Profile», con l'account, il cerchio grande ha un tondo «+» in
      basso a destra, con o senza foto.
- [x] Toccato il cerchio, si vedono «Choose a picture» e «Take a photo»;
      «Remove picture» solo con una foto. Ognuna fa quello che fa in
      «Settings» (`choose("library")`, `choose("camera")`, `remove()`) e
      richiude le scelte; un altro tocco sul cerchio le richiude senza
      scegliere.
- [x] Mentre salva o toglie, «Saving…» o «Removing…» sotto il cerchio,
      che non prende il tocco.
- [x] Un errore (per esempio «Profile pictures are not available on this
      API yet.») si legge in «Profile».
- [x] Il profilo di un altro (`UserProfilePage`) non ha né «+» né tocco
      sul cerchio.
- [x] La riga «Profile picture» di «Settings» fa le stesse cose di prima
      (i suoi test passano senza cambiare).
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/profile/PhotoChoices.tsx (nuovo)
apps/mobile/src/profile/ProfileHeader.test.tsx (nuovo)
apps/mobile/src/profile/ProfileHeader.tsx
apps/mobile/src/profile/ProfileHome.tsx
apps/mobile/src/profile/ProfileHome.test.tsx
apps/mobile/src/profile/PhotoRow.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-207.md
```

## Fuori scope

- Aggiornare il server (migrazione `0005`) e pubblicare l'app: servono
  perché la foto funzioni sul telefono, ma vogliono l'ok dell'utente e
  vanno con l'aggiornamento unico in coda (`AGENTI.md`).
- Il «+» sul pulsante del profilo in alto, o in «Edit profile».
- Ritagli o filtri diversi da quelli del telefono.

## Esito

Fatto: il cerchio di «Profile» ha il «+» bianco e apre, in un riquadro
sopra «Edit profile», le scelte di «Settings» (ADR-0168; il riquadro è
venuto dal simulatore, dove le tre pillole sembravano un gruppo con «Edit
profile»). 8 test nuovi in `ProfileHeader.test.tsx` e
`ProfileHome.test.tsx`; quelli di `PhotoRow` passano senza cambiare; app
1349 test verdi. Visto nel simulatore (iPhone 17, Expo Go) con dati finti,
chiuso e aperto con una foto; non toccato col dito (il simulatore non dava
i tocchi). **Resta**: la prova sull'iPhone, che vuole prima il server con
la `0005` e la pubblicazione dell'app, tutti e due con l'ok dell'utente.
