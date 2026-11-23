# TASK-352 — «Who can see it» riparte dall'ultima scelta salvata

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-352-publish-by-default` · **ADR**: ADR-0304

## Obiettivo

Chi ha scelto una volta di pubblicare non deve rifarlo a ogni attività: la
scelta fatta a fine attività resta per la successiva, e si può togliere.
Nessuno diventa pubblico senza averlo scelto.

## Contesto da leggere

- `docs/DECISIONS.md`, ADR-0170 e ADR-0304
- `docs/UI.md`, «Who can see it»

## Cosa fare

1. `social/visibilityChoice.ts`: l'ultima scelta salvata, sul telefono, una
   per account; «Only me» se non ce n'è.
2. `RunEnd.tsx`: parte da lì; la tiene solo quando la corsa è salvata. Le
   attività da file partono sempre da «Only me» e non la cambiano.
3. Se parte da «Everyone» o «Followers», le parole di quella scelta stanno
   anche sopra «Save»: il modulo scorre e la scelta potrebbe non vedersi.
4. Testi di Help e Privacy nelle cinque lingue, pagine del sito rigenerate,
   data della privacy.

## Criteri di accettazione

- [x] La prima attività di un account parte da «Only me».
- [x] Dopo aver salvato con «Everyone», la successiva parte da «Everyone»;
      con «Only me» torna a «Only me».
- [x] Toccare una scelta senza salvare, o un «Save» fallito, non cambia
      niente.
- [x] Senza «Save» non parte nulla: app chiusa e riaperta sul modulo.
- [x] Le attività da file partono da «Only me» e non toccano la scelta.
- [x] Un altro account sullo stesso telefono parte da «Only me»; un account
      cancellato lascia la sua scelta.
- [x] Taglio di 200 m ai due capi invariato (l'API non è toccata).
- [x] Sì dell'utente ai testi di Help e Privacy nelle cinque lingue («Sì,
      approvo», mostrati in italiano).
- [x] Impronta iOS 83793e26 su copia pulita.

## File toccati

```
apps/mobile/src/social/visibilityChoice.ts
apps/mobile/src/social/visibilityChoice.test.ts
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/activities/RunEndForm.test.tsx
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/account/useAccount.ts
apps/mobile/__tests__/AppDrawings.test.tsx
apps/mobile/src/about/content/{en,it,de,fr,es}.ts
apps/mobile/src/about/documents.test.ts
apps/mobile/src/about/AboutPage.test.tsx
site/privacy/index.html
site/privacy/{it,de,fr,es}/index.html
site/tests/privacy.test.mjs
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-352.md
```

## Fuori scope

- Il modulo su una corsa di «My activities»: mostra la scelta di quella corsa.
- Un'impostazione in «Settings» per la scelta di partenza.
- Pubblicare il sito, il server, l'OTA: col sì dell'utente.

## Esito

La prima attività parte da «Only me»; da quando un account salva con
«Everyone» o «Followers», le successive ripartono da lì finché non cambia.
