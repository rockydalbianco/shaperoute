/**
 * What the support page says, in the app's five languages (TASK-237 E).
 * Apple asks for a support address with a way to reach us. Every answer
 * says something the app does today, with the names the app shows in
 * that language: change it here when the app changes, then run
 * `node site/tools/make_support.mjs`.
 */

/** Where to write: the address of the privacy policy, the user's choice. */
export const CONTACT = "muw2610@gmail.com";

export const SUPPORT = {
  en: {
    title: "Support",
    intro:
      "Need help with MuW, found a problem, or have a question about your data? Write to us:",
    tip: "Tell us which iPhone and which version of iOS you use, and what you were doing when it happened. A screenshot helps.",
    faqHeading: "Questions people ask",
    faq: [
      {
        q: "Do I need an account?",
        a: "No. You can draw routes, explore and run without one. With an account you can save your runs, keep favorite routes and publish your drawings.",
      },
      {
        q: "Why doesn't the route look exactly like my shape?",
        a: "Streets rarely follow a shape exactly, so MuW looks for the streets that draw it best and offers up to three routes. If another distance draws better, the app says so with «Try 12 km»; you can also start from a different place.",
      },
      {
        q: "How do I delete my account?",
        a: "In «Settings», tap «Delete account». Everything that is yours is deleted at once.",
      },
    ],
    privacy: "Privacy policy",
    privacyLine: "What we keep, why and for how long:",
  },
  it: {
    title: "Assistenza",
    intro:
      "Hai bisogno di aiuto con MuW, hai trovato un problema o hai una domanda sui tuoi dati? Scrivici:",
    tip: "Dicci quale iPhone e quale versione di iOS usi, e che cosa stavi facendo quando è successo. Uno screenshot aiuta.",
    faqHeading: "Domande frequenti",
    faq: [
      {
        q: "Serve un account?",
        a: "No. Puoi disegnare percorsi, esplorare e correre senza. Con un account puoi salvare le tue corse, tenere i percorsi preferiti e pubblicare i tuoi disegni.",
      },
      {
        q: "Perché il percorso non è identico alla mia forma?",
        a: "Le strade seguono raramente una forma alla perfezione, quindi MuW cerca quelle che la disegnano meglio e propone fino a tre percorsi. Se un'altra distanza viene meglio, l'app lo dice con «Prova 12 km»; puoi anche partire da un altro punto.",
      },
      {
        q: "Come elimino il mio account?",
        a: "In «Impostazioni», tocca «Elimina account». Tutto quello che è tuo si cancella subito.",
      },
    ],
    privacy: "Informativa sulla privacy",
    privacyLine: "Che cosa teniamo, perché e per quanto tempo:",
  },
  de: {
    title: "Support",
    intro:
      "Brauchst du Hilfe mit MuW, hast du ein Problem gefunden oder eine Frage zu deinen Daten? Schreib uns:",
    tip: "Sag uns, welches iPhone und welche iOS-Version du benutzt und was du gerade gemacht hast. Ein Screenshot hilft.",
    faqHeading: "Häufige Fragen",
    faq: [
      {
        q: "Brauche ich ein Konto?",
        a: "Nein. Du kannst ohne Konto Routen zeichnen, entdecken und laufen. Mit einem Konto kannst du deine Läufe speichern, Lieblingsrouten behalten und deine Zeichnungen veröffentlichen.",
      },
      {
        q: "Warum sieht die Route nicht genau wie meine Form aus?",
        a: "Straßen folgen einer Form selten genau. MuW sucht deshalb die Straßen, die sie am besten zeichnen, und bietet bis zu drei Routen an. Wenn eine andere Distanz besser passt, sagt die App es mit «12 km versuchen»; du kannst auch an einem anderen Ort starten.",
      },
      {
        q: "Wie lösche ich mein Konto?",
        a: "Tippe in «Einstellungen» auf «Konto löschen». Alles, was dir gehört, wird sofort gelöscht.",
      },
    ],
    privacy: "Datenschutzerklärung",
    privacyLine: "Was wir aufbewahren, warum und wie lange:",
  },
  fr: {
    title: "Assistance",
    intro:
      "Besoin d'aide avec MuW, un problème trouvé ou une question sur tes données ? Écris-nous :",
    tip: "Dis-nous quel iPhone et quelle version d'iOS tu utilises, et ce que tu faisais à ce moment-là. Une capture d'écran aide.",
    faqHeading: "Questions fréquentes",
    faq: [
      {
        q: "Faut-il un compte ?",
        a: "Non. Tu peux dessiner des parcours, explorer et courir sans compte. Avec un compte, tu peux enregistrer tes courses, garder tes parcours favoris et publier tes dessins.",
      },
      {
        q: "Pourquoi le parcours ne ressemble-t-il pas exactement à ma forme ?",
        a: "Les rues suivent rarement une forme à la perfection : MuW cherche donc celles qui la dessinent le mieux et propose jusqu'à trois parcours. Si une autre distance donne un meilleur dessin, l'app le dit avec «Essayer 12 km» ; tu peux aussi partir d'un autre endroit.",
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Dans «Réglages», touche «Supprimer le compte». Tout ce qui est à toi est supprimé aussitôt.",
      },
    ],
    privacy: "Politique de confidentialité",
    privacyLine: "Ce que nous gardons, pourquoi et combien de temps :",
  },
  es: {
    title: "Ayuda",
    intro:
      "¿Necesitas ayuda con MuW, has encontrado un problema o tienes una pregunta sobre tus datos? Escríbenos:",
    tip: "Dinos qué iPhone y qué versión de iOS usas, y qué estabas haciendo cuando pasó. Una captura de pantalla ayuda.",
    faqHeading: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Necesito una cuenta?",
        a: "No. Puedes dibujar rutas, explorar y correr sin una. Con una cuenta puedes guardar tus carreras, conservar tus rutas favoritas y publicar tus dibujos.",
      },
      {
        q: "¿Por qué la ruta no se parece exactamente a mi forma?",
        a: "Las calles rara vez siguen una forma a la perfección, así que MuW busca las que mejor la dibujan y propone hasta tres rutas. Si otra distancia dibuja mejor, la app lo dice con «Probar 12 km»; también puedes empezar desde otro sitio.",
      },
      {
        q: "¿Cómo elimino mi cuenta?",
        a: "En «Ajustes», toca «Eliminar cuenta». Todo lo que es tuyo se borra en el acto.",
      },
    ],
    privacy: "Política de privacidad",
    privacyLine: "Qué guardamos, por qué y durante cuánto tiempo:",
  },
};
