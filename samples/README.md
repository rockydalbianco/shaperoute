# Samples — Percorsi generati, versionati

I GPX prodotti durante lo sviluppo stanno qui e **entrano nel repository**.
Non sono scarti: sono il modo per vedere se il motore sta migliorando o
peggiorando. Vedi ADR-0014.

Un GPX pesa qualche decina di KB. Anche dopo cento prove la cartella resta
più leggera di una singola immagine.

## Nomenclatura

```
TASK-013_heart_15km_levico_v1.gpx
   │       │      │      │     └── iterazione, crescente, mai riusata
   │       │      │      └──────── zona: levico | trento | valsugana
   │       │      └─────────────── distanza target
   │       └────────────────────── forma
   └────────────────────────────── task che l'ha prodotto
```

Un file non si sovrascrive mai. Se rigeneri lo stesso caso dopo una
modifica, incrementi `v`. È l'unico modo per avere un prima e un dopo da
confrontare: sovrascrivere cancella esattamente l'informazione che serve.

## Le tre zone

Le stesse di `docs/TESTING.md`, e vanno provate tutte e tre, non solo
quella dove il risultato viene bene.

| Zona | Dove | Perché |
|---|---|---|
| `trento` | centro città | rete fitta, caso facile |
| `levico` | Levico Terme | rete media, caso realistico |
| `valsugana` | versante, fondovalle | rete rada, caso difficile |

## Come si guarda un campione

1. Apri il file in [gpx.studio](https://gpx.studio) o [geojson.io](https://geojson.io).
2. Rispondi a una domanda sola: **si riconosce la forma?**
3. Annota la riga in [`LOG.md`](LOG.md), con il punteggio di somiglianza
   che ha stampato la CLI.

Il punto 3 è quello che si salta, ed è quello che serve davvero: mettere
accanto il punteggio numerico e il giudizio a occhio, prova dopo prova, è
ciò che permette di chiudere ADR-0010 con dati invece che a sensazione.

## Confrontare due versioni

```
git log --oneline -- samples/
```

Per vedere un campione com'era prima di una modifica:

```
git show <commit>:samples/TASK-015_heart_15km_levico_v3.gpx > /tmp/prima.gpx
```

gpx.studio carica più tracce insieme: aprendo il prima e il dopo sulla
stessa mappa la differenza si vede subito.
