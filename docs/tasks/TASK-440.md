# TASK-440 — Foto del post a schermo intero, con «Salva»

**Stato**: Done
**Fase**: app · **Branch**: `feat/TASK-440-feed-photo-viewer`

## Obiettivo

Nel Feed, un tocco sulla foto di un post la apre a schermo intero; da lì
«Save» la salva sul telefono.

## Contesto da leggere

- `apps/mobile/src/feed/FeedPost.tsx` (le pagine delle foto, TASK-330)
- `apps/mobile/src/messages/MediaViewer.tsx` (stesso schema, TASK-333)

## Cosa fare

1. Nuovo `PhotoViewer`: modale scura, foto intera (`contain`), zoom con due
   dita su iOS, tasti «Save» e «Close».
2. «Save» scarica la foto nella cache con le intestazioni del post e apre
   il foglio del telefono, dove c'è «Salva immagine» (scelta dell'utente
   del 2026-11-11: niente `expo-media-library`, così esce via OTA senza
   cambiare la build nativa).
3. In `FeedPost`, il tocco sulla pagina di una foto apre il visore; quello
   sulla pagina del disegno apre ancora il percorso.

## Criteri di accettazione

- [x] Un tocco su una foto del post apre la foto a schermo intero, non il
      percorso.
- [x] Un tocco sul disegno apre ancora il percorso; uno scorrimento non
      apre nulla.
- [x] «Save» scarica la foto e apre il foglio del telefono; senza rete lo
      dice; «Close» chiude.
- [x] Nessuna dipendenza nuova, nessun testo nuovo da tradurre.

## File toccati

```
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/feed/FeedPostPhotoTap.test.tsx
apps/mobile/src/feed/PhotoViewer.tsx
apps/mobile/src/feed/PhotoViewer.test.tsx
docs/tasks/TASK-440.md
```

## Fuori scope

- Salvataggio diretto nel rullino (`expo-media-library`): build nativa.
- Foto a schermo intero nella pagina del post (`PostPage`) e nei profili.
- Scorrere tra le foto dentro il visore.
- Raggiungere il visore col lettore di schermo: le pagine delle foto non
  sono elementi accessibili a sé (la scheda si legge come una cosa sola).

## Esito

Fatto in #1137 (2026-11-11): un tocco sulla foto del post nel Feed la apre a schermo intero, «Save» apre il foglio del telefono con «Salva immagine»; nessuna dipendenza nuova né testo nuovo. Esce con l'ottavo OTA, poi la prova sul telefono.

Uscito con l'ottavo OTA in produzione (2026-11-11 14:09Z, da main cd0c8b08): iOS gruppo 0cf2abd4-69dc-44ca-b5ea-429a0155a1f8, Android 41d7bb93-47c7-4236-b80f-3f61fd454220, preview 76f5ccd6-6bf5-45dd-9c70-163a7d6b860b. Resta la prova dell'utente sul telefono: nel Feed, tocco sulla foto di un post, poi «Save» e «Salva immagine».
