import type { AboutContent, AboutDocument } from "../documents";

/**
 * «Help», «Terms» and «Privacy» in Spanish (TASK-210 F): the same sections
 * as `en.ts`, in the same order (a test compares them). The names of
 * buttons are the ones the app shows in Spanish; the pages as
 * TASK-210 G names them: «Feed», «Dibuja», «Explora». «Terms» and «Privacy» are
 * drafts, as in English, with the same places to fill (the user's choice
 * of 2026-10-07).
 */

const UPDATED = "5 de octubre de 2026";

const help: AboutDocument = {
  title: "Cómo funciona MuW",
  draft: false,
  updated: null,
  sections: [
    {
      heading: "Qué es MuW",
      blocks: [
        "MuW dibuja rutas reales que trazan una forma en el mapa. Tú eliges la forma, la distancia y dónde empezar; obtienes una ruta por calles reales, con su archivo GPX.",
        "La app tiene tres páginas, una al lado de otra, «Feed», «Dibuja» y «Explora»: desliza a la izquierda o a la derecha, o toca un nombre arriba. «Perfil» se abre desde el círculo de arriba.",
      ],
    },
    {
      heading: "Dibujar una ruta",
      blocks: [
        {
          bullets: [
            "Elige una forma: un corazón, una estrella, un gato y más, una palabra de la A a la Z, o el contorno de una foto tuya.",
            "Fija la distancia: hasta 21 km a pie, desde donde estás o desde cualquier lugar que busques.",
            "Toca «Dibujar la ruta». MuW dibuja hasta tres rutas por calles reales, A, B y C: quédate con la que te guste.",
            "«Exportar GPX» te da el archivo para tu reloj o para otra app.",
          ],
        },
        "Una ruta suele tardar unos segundos; las más largas pueden tardar hasta un minuto.",
      ],
    },
    {
      heading: "Explora",
      blocks: [
        "Rutas ya dibujadas en tu ciudad, listas para empezar: sin esperas, solo tienes que elegir una.",
        "Elige «Cerca de mí», un pueblo cercano o busca una ciudad, y toca una ruta para verla en el mapa.",
      ],
    },
    {
      heading: "Correr una ruta",
      blocks: [
        {
          bullets: [
            "«Empezar» inicia la carrera tras una breve cuenta atrás.",
            "Una voz te anuncia cada giro con antelación. El mapa muestra el tramo que ya has corrido y el que te queda por delante.",
            "«Pausa» detiene el reloj y «Reanudar» lo vuelve a poner en marcha.",
            "Para terminar la carrera, mantén pulsado el botón de stop: un toque corto no la termina.",
          ],
        },
        "«Correr sin ruta» registra tu carrera igualmente, sin ninguna forma que seguir.",
        "Una ruta es una sugerencia hecha con datos del mapa: mantén la vista en la calle y respeta las normas de tráfico.",
      ],
    },
    {
      heading: "Guardar carreras y rutas",
      blocks: [
        "Con una cuenta, «Guardar» al final de una carrera la guarda en «Mis actividades», en «Perfil»; «Descartar» la tira. Sin conexión, la carrera espera en el teléfono y se envía más tarde.",
        "El corazón en una ruta del mapa la guarda en «Favoritos».",
      ],
    },
    {
      heading: "Publicar y compartir",
      blocks: [
        "Una carrera guardada es privada: solo la ves tú. Activa «Pública», al final de la carrera o en una carrera de «Mis actividades», y los demás miembros la ven como un dibujo en tu perfil, sin sus primeros y últimos 200 m.",
        "«Compartir» crea una imagen de tu carrera para enviarla donde quieras.",
      ],
    },
    {
      heading: "Feed y amigos",
      blocks: [
        "«Feed» muestra dibujos de los que sacar ideas: toca uno para abrir su ruta y empezarla.",
        "La lupa de arriba en «Feed» encuentra a otros miembros por su nombre. En un perfil puedes tocar «Seguir»; tus solicitudes, tus seguidores y a quién sigues están en «Perfil».",
        "En el dibujo público de un miembro puedes reaccionar con un emoji, enviar un súper like y escribir un comentario. No se aceptan comentarios negativos.",
      ],
    },
    {
      heading: "Correr, bici, remo",
      blocks: [
        "Elige tu deporte con el botón junto a tu perfil, o en «Ajustes».",
        {
          bullets: [
            "Correr: hasta 21 km por calles reales, con la voz giro a giro.",
            "Bici: de 10 a 30 km, por carriles bici y calles abiertas a las bicis. Los giros se anuncian con antelación y la pantalla muestra tu velocidad.",
            "Remo: de 1 a 5 km en lagos y en el mar, cerca de la orilla, para tu canoa, kayak o tabla. Sigues la línea del mapa.",
          ],
        },
        "En el agua, lee el aviso de seguridad antes de salir: ponte el chaleco salvavidas, consulta el tiempo y el viento, respeta las normas del lugar. La ruta no se aleja más de 1 km de la orilla: eso no la hace segura ni permitida.",
      ],
    },
    {
      heading: "Ajustes",
      blocks: [
        {
          bullets: [
            "Foto de perfil, correo electrónico y número de teléfono. El número es opcional y solo lo ves tú.",
            "Idioma: English, Deutsch, Italiano, Español o Français. La voz lo sigue.",
            "Mapas sin conexión: el teléfono guarda los mapas de tu alrededor y dibuja las rutas por sí mismo; «Eliminar» libera el espacio.",
            "Unidades: las de tu teléfono, kilómetros o millas. Con millas cambian las distancias, el ritmo y la voz: un aviso en cada milla, los giros en pies.",
            "Notificaciones: dos interruptores, correo y push, apagados hasta que los enciendas. MuW aún no envía notificaciones: tu elección se guarda en tu cuenta para cuando lo haga.",
          ],
        },
      ],
    },
    {
      heading: "Tu cuenta",
      blocks: [
        "Te registras con un correo electrónico, un nombre de usuario y una contraseña. Debes tener al menos 16 años.",
        "Todavía no hay forma de recuperar una contraseña olvidada: guarda bien la tuya.",
        "«Cerrar sesión» y «Eliminar cuenta» están al final de «Ajustes». Eliminar la cuenta elimina todo lo que es tuyo, al momento, y no se puede deshacer.",
      ],
    },
    {
      heading: "Preguntas",
      blocks: ["Escribe a [contact email]."],
    },
  ],
};

const terms: AboutDocument = {
  title: "Condiciones de uso",
  draft: true,
  updated: UPDATED,
  sections: [
    {
      heading: "Quién ofrece MuW",
      blocks: [
        "MuW la ofrece [name] («nosotros»). Puedes escribirnos a [contact email].",
        "Estas condiciones son el acuerdo entre tú y nosotros para el uso de la app MuW. Al crear una cuenta o usar la app, las aceptas.",
      ],
    },
    {
      heading: "Qué es MuW",
      blocks: [
        "MuW dibuja rutas que trazan una forma en el mapa, para correr, ir en bici o remar; registra tu actividad mientras las sigues; y permite a los miembros publicar sus dibujos, seguirse, reaccionar y comentar.",
      ],
    },
    {
      heading: "Quién puede usarla",
      blocks: [
        "Debes tener al menos 16 años para crear una cuenta. Para dibujar una ruta no hace falta una cuenta.",
      ],
    },
    {
      heading: "Tu cuenta",
      blocks: [
        {
          bullets: [
            "Te registras con una dirección de correo electrónico, un nombre de usuario y una contraseña. La cuenta es solo tuya: no uses la cuenta de otra persona ni te hagas pasar por otra persona.",
            "Mantén tu contraseña en secreto. Eres responsable de lo que se haga con tu cuenta. Todavía no hay forma de recuperar una contraseña olvidada.",
            "Si añades un número de teléfono, añade solo un número que sea tuyo.",
            "Puedes cerrar sesión o eliminar tu cuenta en cualquier momento desde «Ajustes».",
          ],
        },
      ],
    },
    {
      heading: "Cómo usar MuW",
      blocks: [
        "Usa la app dentro de la ley y con respeto hacia los demás miembros. En particular, no:",
        {
          bullets: [
            "publiques contenido ofensivo, de odio, amenazante o acosador, ni en tu nombre de usuario, biografía, foto, títulos o comentarios;",
            "publiques contenido que no te corresponde publicar, ni datos personales de otras personas sin su permiso;",
            "intentes romper, sobrecargar o eludir el servicio, ni recopiles datos de sus miembros por medios automáticos.",
          ],
        },
      ],
    },
    {
      heading: "Lo que publicas",
      blocks: [
        "Tus carreras, tus dibujos, sus títulos, tu perfil y tus comentarios siguen siendo tuyos.",
        "Al publicarlos nos permites guardarlos y mostrarlos en la app a los demás miembros, solo para hacer funcionar el servicio: un permiso gratuito y no exclusivo que termina cuando eliminas el contenido o tu cuenta.",
        "La app no acepta comentarios con palabras ofensivas: un filtro automático de palabras los rechaza. Podemos retirar contenido que vaya contra estas condiciones. Para avisarnos de un contenido que no debería estar, escribe a [contact email].",
      ],
    },
    {
      heading: "Seguridad",
      blocks: [
        "Una ruta es una sugerencia calculada a partir de datos del mapa. Nadie la ha recorrido por ti, y el mapa puede estar incompleto o desactualizado: una calle puede estar cerrada, ser privada, no tener acera o ser peligrosa.",
        {
          bullets: [
            "Eres responsable de por dónde vas. Respeta las normas de tráfico y las señales, aunque la ruta o la voz digan otra cosa.",
            "Comprueba las condiciones antes y durante tu actividad: tráfico, luz, tiempo, el terreno, tu propia salud y forma física.",
            "No mires el teléfono mientras te mueves entre el tráfico.",
            "En el agua, ten aún más cuidado: ponte el chaleco salvavidas, consulta el tiempo y el viento, respeta las normas del lugar (zonas de baño, canales de embarcaciones, puertos). MuW no las conoce. Una ruta cerca de la orilla no es, por eso, segura ni permitida.",
          ],
        },
        "Las distancias, los tiempos y la velocidad vienen del GPS del teléfono y son estimaciones.",
      ],
    },
    {
      heading: "Sin garantía, y los límites de nuestra responsabilidad",
      blocks: [
        "Trabajamos para que MuW funcione y sus rutas sean buenas, pero la app se ofrece tal como es: no prometemos que esté siempre disponible ni libre de errores, que una ruta se pueda completar ni que sus medidas sean exactas.",
        "En la medida en que la ley lo permita, no somos responsables de los daños que se deriven del uso de la app o de sus rutas. Nada en estas condiciones limita una responsabilidad que la ley no permite limitar, ni los derechos que tienes como consumidor.",
      ],
    },
    {
      heading: "Publicidad",
      blocks: [
        "MuW muestra publicidad, ofrecida por Google AdMob, entre los dibujos de «Feed» y marcada como «Patrocinado». Un anuncio abre lo que indica el anunciante: su contenido no es nuestro.",
      ],
    },
    {
      heading: "Servicios de otros",
      blocks: [
        {
          bullets: [
            "Los mapas vienen de OpenFreeMap y de los datos de OpenStreetMap (© colaboradores de OpenStreetMap).",
            "Los lugares se buscan con Geoapify.",
            "Si conectas Strava, las carreras que envíes allí siguen las condiciones y los ajustes de privacidad de Strava.",
            "Una imagen que compartes sale por el menú de compartir del teléfono: la app que la recibe tiene sus propias condiciones.",
          ],
        },
      ],
    },
    {
      heading: "Cambios",
      blocks: [
        "Podemos cambiar la app y añadir o quitar lo que hace. Cuando cambiemos estas condiciones cambiaremos la fecha de arriba; si un cambio es importante, lo daremos a conocer antes de que se aplique.",
      ],
    },
    {
      heading: "Cerrar la cuenta",
      blocks: [
        "Puedes dejar de usar MuW y eliminar tu cuenta en cualquier momento: «Privacidad» dice qué se elimina y cuándo. Podemos suspender o cerrar una cuenta que vaya contra estas condiciones.",
      ],
    },
    {
      heading: "Ley aplicable",
      blocks: [
        "Estas condiciones se rigen por [governing law]. Si eres consumidor, conservas las protecciones que la ley del país donde vives no permite dejar de lado.",
      ],
    },
    {
      heading: "Contacto",
      blocks: ["[name] · [contact email]"],
    },
  ],
};

const privacy: AboutDocument = {
  title: "Política de privacidad",
  draft: true,
  updated: UPDATED,
  sections: [
    {
      heading: "Quién es responsable de tus datos",
      blocks: [
        "El responsable del tratamiento de tus datos personales es [name]. Para cualquier cosa sobre tus datos, escribe a [contact email].",
        "Este texto dice qué datos trata MuW, para qué, dónde se guardan y durante cuánto tiempo, y qué puedes hacer al respecto.",
      ],
    },
    {
      heading: "Sin cuenta",
      blocks: [
        "Puedes dibujar rutas, explorar y correr sin cuenta. La carrera en sí no sale entonces del teléfono. Lo que sí sale del teléfono está en «Rutas que pides», «Tu posición» y «Otros que reciben datos».",
      ],
    },
    {
      heading: "Tu cuenta",
      blocks: [
        {
          bullets: [
            "Tu dirección de correo electrónico y tu nombre de usuario, para dejarte entrar y distinguir las cuentas.",
            "Tu contraseña, guardada solo como hash (Argon2id): nunca guardamos ni vemos la contraseña en sí.",
            "El día en que te registraste y cuándo confirmaste que tienes al menos 16 años.",
            "La sesión de cada teléfono desde el que entraste: el teléfono guarda un token en su almacenamiento seguro, el servidor solo un hash de él. Una sesión termina 90 días después de su último uso, o cuando cierras sesión.",
            "Tus dos elecciones de notificaciones en «Ajustes», correo y push: las dos están apagadas hasta que las enciendas, y MuW aún no envía notificaciones.",
          ],
        },
        "Tu dirección de correo electrónico nunca se muestra a los demás miembros.",
      ],
    },
    {
      heading: "Tu número de teléfono (opcional)",
      blocks: [
        "Puedes añadir un número de teléfono en «Ajustes». Es opcional: la app funciona igual sin él.",
        "Es privado: solo lo ves tú. Nunca está en tu perfil, en la búsqueda ni en ninguna lista. Está para que los amigos que ya tienen tu número puedan encontrar tu cuenta, con una búsqueda desde los contactos del teléfono que todavía no existe.",
        "No comprobamos el número ni le enviamos mensajes. Puedes quitarlo en cualquier momento desde «Ajustes»; se elimina con la cuenta.",
      ],
    },
    {
      heading: "Tu perfil",
      blocks: [
        "Tu nombre de usuario, tu biografía y tu foto de perfil son lo que los demás miembros ven de ti. La foto se guarda como una pequeña imagen cuadrada, sin los datos que le añade la cámara. Cualquiera con una cuenta puede buscar a los miembros por nombre de usuario.",
      ],
    },
    {
      heading: "Tus carreras y sus recorridos GPS",
      blocks: [
        "Con una cuenta, cuando tocas «Guardar» al final de una carrera, la carrera entera va a nuestro servidor: cada posición con su hora, las pausas, la ruta que seguiste, distancia, duración, puntuación y el nombre del lugar. Con «Descartar» no se envía nada.",
        "Una carrera guardada es privada: solo la ve tu cuenta. Se queda hasta que la eliminas de «Mis actividades» o eliminas tu cuenta.",
        "Una carrera a menudo empieza y termina en tu puerta. Por eso una carrera solo es visible para los demás miembros cuando activas «Pública», y entonces ven el recorrido sin sus primeros y últimos 200 m, con el título que le diste, y sin tiempos, pausas ni la ruta prevista.",
      ],
    },
    {
      heading: "Favoritos, comentarios, reacciones y seguimientos",
      blocks: [
        {
          bullets: [
            "Una ruta que guardas en «Favoritos» se almacena entera, con su línea, que a menudo empieza cerca de tu casa. Solo la ve tu cuenta, hasta que la quitas o eliminas la cuenta.",
            "Tus comentarios y reacciones bajo un dibujo los ven los miembros que ven ese dibujo. Puedes eliminar tus propios comentarios.",
            "A quién sigues, quién te sigue y las solicitudes para seguir se guardan con tu cuenta.",
          ],
        },
      ],
    },
    {
      heading: "Rutas que pides",
      blocks: [
        "Para dibujar una ruta, la app envía a nuestro servidor el inicio, la forma o la palabra y la distancia. Cuando el teléfono tiene el mapa sin conexión de la zona, dibuja la ruta por sí mismo.",
        "Los mapas sin conexión vienen de nuestro servidor: el de tu alrededor y, con antelación, los de los pueblos cercanos. Para limitar estas descargas, el servidor las cuenta por día, según un número anónimo que la app crea para el teléfono; la cuenta se guarda solo en memoria.",
        "Las palabras que describen una forma se leen en nuestro servidor y no se envían a ningún servicio de IA externo.",
        "Una foto que eliges para un dibujo va una vez a nuestro servidor, para encontrar su contorno: el servidor no la guarda ni la registra.",
        "Para mejorar la búsqueda guardamos un evento por cada búsqueda y por algunos usos de la app (una ruta elegida, un archivo GPX exportado, una carrera puntuada): el texto en minúsculas, como máximo 200 caracteres, con los correos y los números largos ocultos; las posiciones solo como cuadrados de alrededor de 1 km; nada que diga quién eres ni qué teléfono era. Estos eventos se guardan sin límite de tiempo.",
      ],
    },
    {
      heading: "Tu posición",
      blocks: [
        "La posición del teléfono se usa en el teléfono, para empezar una ruta donde estás y para seguir tu carrera. Va a nuestro servidor como inicio de una ruta que pides, dentro de una carrera que guardas, y con la búsqueda de un lugar, para poner primero los lugares cercanos.",
        "Como cualquier servicio de internet, nuestro servidor ve la dirección de internet (IP) de la que viene una petición mientras la responde. El registro del servidor no escribe posiciones, y la base de datos no guarda direcciones IP.",
        "Existe un registro de las peticiones de rutas, con su inicio, para reproducir un fallo. Está apagado en nuestro servidor; encendido, guarda como máximo 10 MB, y después se pierden las líneas más antiguas.",
      ],
    },
    {
      heading: "Publicidad",
      blocks: [
        "MuW muestra anuncios de Google AdMob entre los dibujos de «Feed». La primera vez que abres «Feed», el formulario de consentimiento de Google te pide tu elección donde hace falta; mientras no se puedan pedir anuncios, no se muestra ninguno. En el iPhone la app no pide rastrearte a través de otras apps y los anuncios se piden sin el identificador de publicidad.",
        "Google trata lo que recoge su software de publicidad según su propia política de privacidad.",
      ],
    },
    {
      heading: "Strava",
      blocks: [
        "Una carrera va a Strava solo cuando lo pides, y solo después de que hayas conectado tu perfil de Strava. Mientras está conectado, nuestro servidor guarda tu nombre de Strava y las claves que Strava nos dio para tu perfil. Luego enviamos a Strava el recorrido con sus tiempos, el nombre y una línea de descripción. A Strava solo le pedimos permiso para añadir actividades, nunca para leer las tuyas. En Strava la actividad sigue tus ajustes de privacidad de Strava, no los de MuW.",
      ],
    },
    {
      heading: "Otros que reciben datos",
      blocks: [
        {
          bullets: [
            "Hetzner aloja nuestro servidor y sus copias de seguridad, en Alemania.",
            "Geoapify recibe las búsquedas de lugares y de los pueblos cercanos, con la posición, y, para nombrar el lugar de una carrera guardada, su inicio redondeado a alrededor de 1 km: nunca tu puerta, la carrera ni quién eres. Si nuestro servidor no responde, la búsqueda de un lugar va entonces a Photon (komoot).",
            "OpenFreeMap sirve el mapa: como cualquier servicio de mapas, ve qué zona miras.",
            "Nuestro servidor pide al servicio Overpass de datos de OpenStreetMap el mapa de una zona que aún no tiene: ve qué zona, no quién la pidió.",
            "unpkg sirve la biblioteca del mapa cuando arranca la app.",
            "Expo sirve las actualizaciones de la app.",
            "Google AdMob y Strava, como se ha dicho arriba.",
          ],
        },
        "Una imagen de tu carrera hecha con «Compartir» se crea en el teléfono y solo sale de él por el menú de compartir, hacia donde la envíes.",
      ],
    },
    {
      heading: "Dónde están tus datos y durante cuánto tiempo",
      blocks: [
        {
          bullets: [
            "En nuestro servidor en Alemania, mientras tengas la cuenta.",
            "Cuando eliminas tu cuenta, todo lo que es tuyo se elimina al momento: perfil, foto, número de teléfono, carreras, dibujos, favoritos, comentarios, reacciones y seguimientos.",
            "Cada noche se hace una copia de seguridad de la base de datos y se guarda 13 días: una cuenta eliminada sale de todas las copias en 14 días como máximo.",
            "En tu teléfono: la sesión, tus elecciones (idioma, deporte), los mapas sin conexión y las carreras que aún esperan para enviarse.",
          ],
        },
        "La conexión entre la app y nuestro servidor está cifrada (HTTPS).",
      ],
    },
    {
      heading: "Por qué podemos usar tus datos",
      blocks: [
        "[bases jurídicas: por completar antes de que este texto sea definitivo]",
      ],
    },
    {
      heading: "Tus derechos",
      blocks: [
        "Puedes, en cualquier momento:",
        {
          bullets: [
            "ver y corregir tus datos: nombre de usuario, biografía y foto en «Perfil», correo y número de teléfono en «Ajustes»;",
            "eliminar una carrera de «Mis actividades», un favorito, un comentario o la cuenta entera desde «Ajustes», «Eliminar cuenta»;",
            "pedirnos una copia de tus datos, o que dejemos de usarlos o limitemos un uso;",
            "retirar un consentimiento que hayas dado;",
            "presentar una reclamación ante la autoridad de protección de datos de tu país (en Italia, el Garante per la protezione dei dati personali).",
          ],
        },
        "Para lo que no puedas hacer desde la app, escribe a [contact email].",
      ],
    },
    {
      heading: "Menores",
      blocks: [
        "Las cuentas de MuW son para personas de al menos 16 años. Si crees que alguien más joven tiene una cuenta, escríbenos y la eliminaremos.",
      ],
    },
    {
      heading: "Cambios en este texto",
      blocks: [
        "Cuando este texto cambie, cambiaremos la fecha de arriba; si un cambio es importante, lo daremos a conocer antes de que se aplique.",
      ],
    },
    {
      heading: "Contacto",
      blocks: ["[name] · [contact email]"],
    },
  ],
};

export const ES: AboutContent = { help, terms, privacy };
