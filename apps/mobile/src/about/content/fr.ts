import type { AboutContent, AboutDocument } from "../documents";

/**
 * «Help», «Terms» and «Privacy» in French (TASK-210 F): the same sections
 * as `en.ts`, in the same order (a test compares them). The names of
 * buttons are the ones the app shows in French; the pages as
 * TASK-210 G names them: «Fil», «Dessiner», «Explorer». «Terms» and «Privacy» are
 * drafts, as in English, with the same places to fill (the user's choice
 * of 2026-10-07).
 */

const UPDATED = "10 novembre 2026";
/** «Privacy» is final since the user approved it (TASK-237 D; without ads, TASK-267 B); dated the day Apple Health and Health Connect entered (TASK-321 B); redated for the whole drawing (TASK-390). Redated for the MuW app on Apple Watch (TASK-370). Redated for the prizes of the game shown on the profile (TASK-423 E2b). */
const PRIVACY_UPDATED = "12 novembre 2026";

const help: AboutDocument = {
  title: "Comment fonctionne MuW",
  draft: false,
  updated: null,
  sections: [
    {
      heading: "Ce qu'est MuW",
      blocks: [
        "MuW dessine de vrais parcours qui tracent une forme sur la carte. Tu choisis la forme, la distance et le point de départ ; tu obtiens un parcours sur de vraies rues, avec son fichier GPX.",
        "En bas, il y a cinq onglets : «Fil», «Dessiner», «Messages», «Explorer» et ton profil, le cercle avec ta photo. Touche un onglet pour y aller, touche-le encore pour revenir en haut. Les «Réglages» sont sous l'engrenage en haut à droite de ton profil.",
      ],
    },
    {
      heading: "Dessiner un parcours",
      blocks: [
        {
          bullets: [
            "Choisis une forme : un cœur, une étoile, un chat et d'autres, un mot de A à Z, ou le contour de ta propre photo.",
            "Règle la distance : jusqu'à 21 km à pied, en partant d'où tu es ou d'un lieu que tu cherches.",
            "Touche «Dessiner le parcours». MuW dessine jusqu'à trois parcours sur de vraies rues, A, B et C : garde celui qui te plaît.",
            "«Exporter le GPX» te donne le fichier pour ta montre ou pour une autre app.",
          ],
        },
        "Un parcours prend en général quelques secondes ; les plus longs peuvent prendre jusqu'à une minute.",
      ],
    },
    {
      heading: "Explorer",
      blocks: [
        "Des parcours déjà dessinés dans ta ville, prêts à partir : pas d'attente, il suffit d'en choisir un.",
        "Choisis «Près de moi», une ville proche ou cherche une ville, puis touche un parcours pour le voir sur la carte.",
      ],
    },
    {
      heading: "Courir un parcours",
      blocks: [
        {
          bullets: [
            "«Démarrer» lance la course après un court compte à rebours.",
            "Une voix t'annonce chaque virage à l'avance. La carte montre la partie déjà courue et celle qui reste devant toi.",
            "«Pause» arrête le chrono et «Reprendre» le relance.",
            "Pour terminer la course, maintiens le bouton stop : un appui court ne la termine pas.",
          ],
        },
        "«Courir sans parcours» enregistre quand même ta course, sans forme à suivre.",
        "Un parcours est une suggestion tirée des données de la carte : garde les yeux sur la route et respecte le code de la route.",
      ],
    },
    {
      heading: "Garder tes courses et tes parcours",
      blocks: [
        "Avec un compte, «Enregistrer» à la fin d'une course la garde dans «Mes activités», dans «Profil» ; «Ignorer» la jette. Sans connexion, la course attend sur le téléphone et part plus tard.",
        "Le cœur sur un parcours de la carte le garde dans «Favoris».",
      ],
    },
    {
      heading: "Publier et partager",
      blocks: [
        "Une course enregistrée est privée : toi seul la vois. Les autres membres voient sur ton profil les totaux de toutes tes courses enregistrées, distance et dénivelé, et tes records (le 5K, le 10K et tes autres distances les plus rapides, à pied et à vélo) avec le temps et la date. Une course privée reste fermée même quand elle contient un record. Choisis «Tout le monde» ou «Abonnés» sous «Qui peut la voir», à la fin de la course ou sur une course de «Mes activités», et ils la voient comme un dessin sur ton profil, entière. La prochaine course que tu termines part de ton dernier choix enregistré : tu le vois avant «Enregistrer» et tu peux le changer. Une activité ajoutée depuis un fichier dans «Mes activités» part de «Moi seulement» ; une activité ajoutée avec le «+» du Feed part de «Tout le monde», et tu peux le changer avant «Enregistrer».",
        "Une course que tu publies peut avoir jusqu'à 9 photos et le dessin. Maintiens-en une et fais-la glisser pour changer l'ordre : la première est celle qu'on voit dans le Feed. Choisis une mise en page pour mettre le dessin sur une photo.",
        "Sur une photo que tu publies, tu peux identifier ce que tu portes : ce que c'est, la marque et, si tu veux, le modèle et un lien vers la boutique. Les autres touchent la photo pour voir les articles et ouvrir la boutique. Sous ton post, toi seul vois combien de fois ils ont été ouverts.",
        "«Partager» crée une image de ta course à envoyer où tu veux.",
      ],
    },
    {
      heading: "Fil et amis",
      blocks: [
        "«Fil» montre des dessins pour trouver des idées : touches-en un pour ouvrir son parcours et le démarrer.",
        "La recherche en haut de «Explorer» trouve les autres membres par leur nom. Sur un profil, tu peux toucher «Suivre» ; tes demandes, tes abonnés et les personnes que tu suis sont dans «Profil».",
        "Sur le dessin public d'un membre, tu peux réagir avec un emoji, envoyer un super like et écrire un commentaire. Les commentaires négatifs ne sont pas acceptés.",
      ],
    },
    {
      heading: "Messages",
      blocks: [
        "«Message» sur le profil d'un membre lui écrit. S'il te suit, ton message arrive dans ses «Messages» ; sinon, il arrive comme demande, et tu peux envoyer un seul message tant qu'elle n'est pas acceptée.",
        "Tes conversations sont dans «Messages», l'onglet avec l'avion en papier, avec «Demandes de message» en haut. Accepte une demande pour vous écrire, supprime-la (la personne qui a écrit n'est pas prévenue) ou bloque-la.",
        "Maintiens appuyé un message pour supprimer le tien, pour vous deux, ou pour signaler un message reçu. Personne ne voit si tu as lu un message. Avec le push allumé, MuW te prévient de chaque message et de chaque demande.",
        "Dans une conversation, touche + pour envoyer une photo, une vidéo de 60 secondes au maximum ou un dessin, ou touche Envoyer à des amis sur un parcours ou un dessin. Tu peux les envoyer quand l'autre personne a accepté ton message. Les vidéos sont gardées 30 jours, ou moins quand notre espace pour les vidéos est plein : les plus anciennes partent d'abord. Touche un dessin pour l'ouvrir sur la carte, le lancer, exporter son GPX ou le garder dans tes favoris.",
      ],
    },
    {
      heading: "Course, vélo, pagaie",
      blocks: [
        "Choisis ton sport avec le bouton en haut à droite, ou dans «Réglages».",
        {
          bullets: [
            "Course : jusqu'à 21 km sur de vraies rues, avec la voix virage par virage.",
            "Vélo : de 10 à 30 km, sur les pistes cyclables et les rues ouvertes aux vélos. Les virages sont annoncés à l'avance et l'écran montre ta vitesse.",
            "Pagaie : de 1 à 5 km sur les lacs et la mer, près du rivage, pour ton canoë, ton kayak ou ta planche. Tu suis la ligne sur la carte.",
          ],
        },
        "Sur l'eau, lis l'avis de sécurité avant de partir : porte un gilet de sauvetage, vérifie la météo et le vent, respecte les règles locales. Le parcours reste à moins de 1 km du rivage : cela ne le rend ni sûr ni autorisé.",
      ],
    },
    {
      heading: "Réglages",
      blocks: [
        {
          bullets: [
            "Photo de profil, e-mail et numéro de téléphone. Le numéro est facultatif et toi seul le vois.",
            "Langue : English, Deutsch, Italiano, Español ou Français. La voix la suit.",
            "Cartes hors ligne : le téléphone garde les cartes autour de toi et dessine les parcours tout seul ; «Supprimer» libère l'espace.",
            "Unités : celles de ton téléphone, kilomètres ou miles. Avec les miles, les distances, l'allure et la voix suivent : une annonce à chaque mile, les virages en pieds.",
            "Notifications : trois interrupteurs. «Notifications par e-mail» et «Notifications push» sont éteints jusqu'à ce que tu les allumes ; «E-mail en cas d'absence» est allumé jusqu'à ce que tu l'éteignes. Avec le push allumé, et dès que ton téléphone l'autorise, MuW te prévient tout de suite des demandes de suivi, des demandes acceptées, des réactions, des commentaires et des identifications ; en touchant une notification, tu ouvres la publication ou le profil. Avec l'e-mail allumé, les mêmes nouvelles arrivent dans un e-mail par jour au plus. «E-mail en cas d'absence» : si tu n'ouvres pas MuW pendant 2 semaines, un e-mail avec les nouveautés.",
          ],
        },
      ],
    },
    {
      heading: "Ton compte",
      blocks: [
        "Tu t'inscris avec un e-mail, un nom d'utilisateur et un mot de passe. Tu dois avoir au moins 16 ans.",
        "Il n'est pas encore possible de réinitialiser un mot de passe oublié : garde bien le tien.",
        "«Se déconnecter» et «Supprimer le compte» sont en bas de «Réglages». Supprimer le compte supprime tout ce qui est à toi, tout de suite, et ne peut pas être annulé.",
      ],
    },
    {
      heading: "Questions",
      blocks: ["Écris à [contact email]."],
    },
  ],
};

const terms: AboutDocument = {
  title: "Conditions d'utilisation",
  draft: true,
  updated: UPDATED,
  sections: [
    {
      heading: "Qui fournit MuW",
      blocks: [
        "MuW est fournie par [name] («nous»). Tu peux nous écrire à [contact email].",
        "Ces conditions sont l'accord entre toi et nous pour l'utilisation de l'app MuW. En créant un compte ou en utilisant l'app, tu les acceptes.",
      ],
    },
    {
      heading: "Ce qu'est MuW",
      blocks: [
        "MuW dessine des parcours qui tracent une forme sur la carte, pour courir, rouler ou pagayer ; elle enregistre ton activité pendant que tu les suis ; et elle permet aux membres de publier leurs dessins, de se suivre, de réagir et de commenter.",
      ],
    },
    {
      heading: "Qui peut l'utiliser",
      blocks: [
        "Tu dois avoir au moins 16 ans pour créer un compte. Dessiner un parcours ne demande pas de compte.",
      ],
    },
    {
      heading: "Ton compte",
      blocks: [
        {
          bullets: [
            "Tu t'inscris avec une adresse e-mail, un nom d'utilisateur et un mot de passe. Le compte est à toi seul : n'utilise pas le compte d'une autre personne et ne te fais pas passer pour quelqu'un d'autre.",
            "Garde ton mot de passe secret. Tu es responsable de ce qui est fait avec ton compte. Il n'est pas encore possible de réinitialiser un mot de passe oublié.",
            "Si tu ajoutes un numéro de téléphone, ajoute seulement un numéro qui est le tien.",
            "Tu peux te déconnecter ou supprimer ton compte à tout moment depuis «Réglages».",
          ],
        },
      ],
    },
    {
      heading: "Comment utiliser MuW",
      blocks: [
        "Utilise l'app dans le respect de la loi et des autres membres. En particulier, tu ne dois pas :",
        {
          bullets: [
            "publier de contenu offensant, haineux, menaçant ou harcelant, ni dans ton nom d'utilisateur, ta bio, ta photo, tes titres ou tes commentaires ;",
            "publier de contenu que tu n'as pas le droit de publier, ni les données personnelles d'autres personnes sans leur permission ;",
            "utiliser les articles que tu identifies pour du spam, pour des liens vers autre chose que ce que tu portes, pour tes propres liens d'affiliation ou pour de la publicité que tu ne déclares pas ;",
            "essayer de casser, de surcharger ou de contourner le service, ni collecter des données sur ses membres par des moyens automatisés.",
          ],
        },
      ],
    },
    {
      heading: "Ce que tu publies",
      blocks: [
        "Tes courses, tes dessins, leurs titres, ton profil et tes commentaires restent à toi. Les articles que tu identifies sur tes photos, avec leurs liens, font partie de ce que tu publies.",
        "En les publiant, tu nous permets de les garder et de les montrer dans l'app aux autres membres, seulement pour faire fonctionner le service : une autorisation gratuite et non exclusive qui prend fin quand tu supprimes le contenu ou ton compte.",
        "L'app n'accepte pas les commentaires contenant des mots offensants : un filtre automatique de mots les refuse. Nous pouvons retirer un contenu contraire à ces conditions. Pour nous signaler un contenu qui ne devrait pas être là, écris à [contact email].",
      ],
    },
    {
      heading: "Sécurité",
      blocks: [
        "Un parcours est une suggestion calculée à partir des données de la carte. Personne ne l'a parcouru pour toi, et la carte peut être incomplète ou dépassée : une rue peut être fermée, privée, sans trottoir ou dangereuse.",
        {
          bullets: [
            "Tu es responsable de l'endroit où tu vas. Respecte le code de la route et la signalisation, même quand le parcours ou la voix disent autre chose.",
            "Vérifie les conditions avant et pendant ton activité : circulation, lumière, météo, le terrain, ta propre santé et ta forme.",
            "Ne regarde pas le téléphone quand tu te déplaces dans la circulation.",
            "Sur l'eau, sois encore plus prudent : porte un gilet de sauvetage, vérifie la météo et le vent, respecte les règles locales (zones de baignade, chenaux, ports). MuW ne les connaît pas. Un parcours près du rivage n'est pas pour autant sûr ni autorisé.",
          ],
        },
        "Les distances, les temps et la vitesse viennent du GPS du téléphone et sont des estimations.",
      ],
    },
    {
      heading: "Pas de garantie, et les limites de notre responsabilité",
      blocks: [
        "Nous travaillons pour que MuW fonctionne et que ses parcours soient bons, mais l'app est fournie telle quelle : nous ne promettons pas qu'elle soit toujours disponible ou sans erreurs, qu'un parcours puisse être terminé, ni que ses mesures soient exactes.",
        "Dans la mesure où la loi le permet, nous ne sommes pas responsables des dommages qui découlent de l'utilisation de l'app ou de ses parcours. Rien dans ces conditions ne limite une responsabilité que la loi ne permet pas de limiter, ni les droits que tu as en tant que consommateur.",
      ],
    },
    {
      heading: "Publicité",
      blocks: [
        "MuW affiche ses propres posts, marqués « Publicité · Liens affiliés », avec des liens vers des boutiques (MuW Style). Si tu achètes via l'un de ces liens, la boutique verse une commission à MuW ; pour toi, le prix ne change pas. La vente se fait entre toi et la boutique : MuW ne vend pas ces produits et ne répond pas de leur prix, de leur disponibilité, de la livraison ni des retours. Les photos de ces posts sont créées par IA et l'indiquent : les personnes qu'on y voit n'existent pas, et les articles montrés ressemblent aux produits sans être les produits eux-mêmes. Tu peux masquer ces posts du Feed dans «Réglages». MuW n'affiche aucune autre publicité.",
        "Les liens que les membres ajoutent aux articles de leurs posts sont les leurs : MuW n'y gagne rien et ne répond ni des produits ni des boutiques. Si une marque te paie ou t'offre ce que tu identifies, dis-le dans la description du post.",
      ],
    },
    {
      heading: "Services d'autres",
      blocks: [
        {
          bullets: [
            "Les cartes viennent d'OpenFreeMap et des données d'OpenStreetMap (© contributeurs d'OpenStreetMap).",
            "Les animaux 3D de la vidéo viennent de Quaternius (CC0) ; l'éléphant est « Elephant Anim » de Shivoahm et SahuAvdhesh sur Sketchfab (CC BY 4.0), animé et adapté par MuW.",
            "Les lieux sont recherchés avec Geoapify.",
            "Si tu connectes Strava, les courses que tu y envoies suivent les conditions et les réglages de confidentialité de Strava.",
            "Une image que tu partages sort par le menu de partage du téléphone : l'app qui la reçoit a ses propres conditions.",
            "Le lien d'un article identifié ouvre le site de la boutique dans ton navigateur : la boutique a ses propres conditions.",
          ],
        },
      ],
    },
    {
      heading: "Modifications",
      blocks: [
        "Nous pouvons modifier l'app, et ajouter ou retirer ce qu'elle fait. Quand nous modifions ces conditions, nous changeons la date en haut ; si une modification est importante, nous la ferons connaître avant qu'elle s'applique.",
      ],
    },
    {
      heading: "Fermer le compte",
      blocks: [
        "Tu peux arrêter d'utiliser MuW et supprimer ton compte à tout moment : «Confidentialité» dit ce qui est supprimé et quand. Nous pouvons suspendre ou fermer un compte contraire à ces conditions.",
      ],
    },
    {
      heading: "Droit applicable",
      blocks: [
        "Ces conditions sont régies par [governing law]. Si tu es un consommateur, tu gardes les protections que la loi du pays où tu vis ne permet pas d'écarter.",
      ],
    },
    {
      heading: "Contact",
      blocks: ["[name] · [contact email]"],
    },
  ],
};

const privacy: AboutDocument = {
  title: "Politique de confidentialité",
  draft: false,
  updated: PRIVACY_UPDATED,
  sections: [
    {
      heading: "Qui est responsable de tes données",
      blocks: [
        "Le responsable du traitement de tes données personnelles est Luca Pallaoro. Pour tout ce qui concerne tes données, écris à muw2610@gmail.com.",
        "Ce texte dit quelles données MuW traite, pourquoi, où elles sont gardées et combien de temps, et ce que tu peux faire à ce sujet.",
      ],
    },
    {
      heading: "Sans compte",
      blocks: [
        "Tu peux dessiner des parcours, explorer et courir sans compte. La course elle-même ne quitte alors pas le téléphone. Ce qui quitte quand même le téléphone est décrit sous «Les parcours que tu demandes», «Ta position» et «Les autres qui reçoivent des données».",
      ],
    },
    {
      heading: "Ton compte",
      blocks: [
        {
          bullets: [
            "Ton adresse e-mail et ton nom d'utilisateur, pour te laisser entrer et distinguer les comptes.",
            "Ton mot de passe, gardé seulement sous forme de hash (Argon2id) : nous ne gardons ni ne voyons jamais le mot de passe lui-même.",
            "Le jour de ton inscription et le moment où tu as confirmé avoir au moins 16 ans.",
            "La session de chaque téléphone depuis lequel tu t'es connecté : le téléphone garde un jeton dans son stockage sécurisé, le serveur n'en garde qu'un hash. Une session prend fin 90 jours après sa dernière utilisation, ou quand tu te déconnectes.",
            "Tes trois choix de notifications dans «Réglages» : «Notifications par e-mail» et «Notifications push», éteints jusqu'à ce que tu les allumes, et «E-mail en cas d'absence», allumé jusqu'à ce que tu l'éteignes. Avec le push allumé, le jeton push de ton téléphone, s'il s'agit d'un iPhone ou d'un Android, et la langue de l'app, pour t'envoyer des notifications via le service push d'Expo, qui les transmet à Apple ou à Google. Une notification dit qui a fait quoi, avec le début d'un commentaire. Le jeton est supprimé quand tu éteins le push, te déconnectes ou supprimes ton compte.",
            "La liste de la cloche : qui a fait quoi, sur quelle publication, quel défi, quel concours ou quelle course en groupe, et si tu l'as déjà lue, comme te le disent les notifications push, même avec le push éteint. Toi seul la vois. Chaque ligne est gardée 90 jours ; ce qui n'est plus vrai, comme une réaction retirée ou une publication que tu ne vois plus, n'apparaît pas.",
            "La langue de l'app quand tu t'es inscrit, pour t'écrire nos e-mails dans cette langue.",
          ],
        },
        "Ton adresse e-mail n'est jamais montrée aux autres membres.",
      ],
    },
    {
      heading: "Les e-mails de MuW",
      blocks: [
        {
          bullets: [
            "Avec «Notifications par e-mail» allumé, un e-mail par jour au plus, seulement les jours où il y a du nouveau : les demandes de suivi, les demandes acceptées, les réactions, les commentaires et les identifications du jour, comme les disent les notifications push. Jusqu'à son envoi, notre serveur garde qui a fait quoi et sur quelle publication, 7 jours au plus ; ce qui n'est plus vrai au moment de l'écrire reste dehors.",
            "«E-mail en cas d'absence» : si tu n'ouvres pas MuW pendant 2 semaines, un e-mail avec le nombre de nouveaux dessins des personnes que tu suis, avec jusqu'à trois de leurs noms d'utilisateur, ou sinon dans le Feed. Un par absence : le suivant seulement après ton retour puis une nouvelle absence. Il est allumé pour chaque membre, y compris ceux qui se sont inscrits avant ce texte ; tu peux dire non à l'inscription, dans «Réglages» ou avec le lien de l'e-mail.",
            "Chaque e-mail a le lien «Ne plus m'envoyer ces e-mails», qui éteint cet e-mail. Nous les envoyons via Resend, depuis une adresse de getmuw.app.",
            "Les e-mails dont ton compte a besoin, qu'aucun interrupteur n'éteint : un pour confirmer ton adresse quand tu t'inscris ou la changes, un avis à ton ancienne adresse quand tu la changes, et un lien pour un nouveau mot de passe quand tu le demandes.",
          ],
        },
      ],
    },
    {
      heading: "Ton numéro de téléphone (facultatif)",
      blocks: [
        "Tu peux ajouter un numéro de téléphone dans «Réglages». Il est facultatif : l'app fonctionne de la même façon sans lui.",
        "Il est privé : toi seul le vois. Il n'est jamais sur ton profil, dans la recherche ni dans aucune liste. Il sert à ce que les amis qui ont ton numéro dans les contacts de leur téléphone puissent trouver ton compte (voir «Des amis dans tes contacts»).",
        "Nous ne vérifions pas le numéro et nous n'y envoyons aucun message. Tu peux le retirer à tout moment depuis «Réglages» ; il est supprimé avec le compte.",
      ],
    },
    {
      heading: "Des amis dans tes contacts",
      blocks: [
        "Dans «Fil», «Trouver des personnes à suivre» mène à «Trouver des amis dans tes contacts», qui cherche les membres dont le numéro est dans les contacts de ton téléphone. L'app demande les contacts au téléphone seulement quand tu le touches, et n'en lit que les numéros de téléphone : jamais les noms, les e-mails ni les photos.",
        "Chaque numéro quitte le téléphone codé : écrit avec l'indicatif du pays et transformé en hash (SHA-256). Notre serveur compare les codes à ceux des numéros ajoutés par les membres, répond avec les membres trouvés et ne garde rien de ce qu'il a reçu : ni dans la base de données ni dans un journal.",
        "Le hash d'un numéro de téléphone n'est pas un secret : qui aurait les codes pourrait retrouver les numéros en essayant tous les numéros possibles. C'est pourquoi la vraie protection est que notre serveur n'en garde aucun ; ils ne passent que par la connexion chiffrée.",
        "Les numéros de tes contacts sont les données d'autres personnes : ils sont comparés une fois, pour trouver des comptes, puis oubliés. Pour empêcher quiconque d'essayer les numéros un à un, le serveur compte les recherches de chaque compte sur une heure, en mémoire seulement. Seuls les membres qui ont ajouté leur numéro peuvent être trouvés, et jamais quelqu'un que tu as bloqué ou qui t'a bloqué.",
      ],
    },
    {
      heading: "Ton profil",
      blocks: [
        "Ton nom d'utilisateur, ta bio et ta photo de profil sont ce que les autres membres voient de toi. La photo est gardée sous forme d'une petite image carrée, sans les données que l'appareil photo y ajoute. Toute personne ayant un compte peut chercher les membres par nom d'utilisateur.",
      ],
    },
    {
      heading: "Tes courses et leurs traces GPS",
      blocks: [
        "Avec un compte, quand tu touches «Enregistrer» à la fin d'une course, toute la course part vers notre serveur : chaque position avec son heure et son altitude, les pauses, le parcours suivi, la distance, la durée, un score de la fidélité de la trace au parcours (calculé par notre serveur et non affiché dans l'app) et le nom du lieu. Avec «Ignorer», rien n'est envoyé.",
        "Une course enregistrée est privée, sauf si tu choisis autrement : seul ton compte la voit. Une activité ajoutée avec le «+» du Feed fait exception : elle part de «Tout le monde», que tu vois avant «Enregistrer» et que tu peux changer. Les autres membres voient sur ton profil les totaux de toutes tes courses enregistrées, distance et dénivelé, et tes records, à pied et à vélo, avec le temps et la date où tu les as faits : aussi ceux d'une course privée, qui ne s'ouvre pourtant pas. Elle reste jusqu'à ce que tu la supprimes de «Mes activités» ou que tu supprimes ton compte.",
        "Si tu choisis «L'afficher», les autres membres voient aussi ta VO₂ max sur ton profil. En attendant qu'Apple Santé arrive avec une prochaine mise à jour, c'est notre estimation d'après tes records de course des 12 derniers mois, calculée par notre serveur. Désactive-la dans Réglages et elle disparaît de ton profil.",
        "Une séance en salle est enregistrée avec ses exercices, ses séries et ses poids. Sur ton profil, les autres membres voient tes niveaux en salle (la figure, l'exercice et ta meilleure série), comptés sur toutes tes séances, même privées, mais jamais la séance elle-même. Si la publication d'une séance est visible par tout le monde et montre ses exercices, ta meilleure série du mois dans chaque exercice peut apparaître, avec ton nom d'utilisateur, dans le classement mensuel de cet exercice, que les autres membres voient. Masque les exercices de la publication, ou rends-la privée, et elle quitte le classement.",
        "Tes programmes en salle (nom, jours, exercices et valeurs visées) restent sur ton téléphone et sur ton compte : toi seul les vois, et ils sont supprimés avec ton compte. Le calendrier de tes séances, toi seul le vois aussi.",
        "Si tu ajoutes une activité passée depuis un fichier, nous gardons sa trace et ses heures comme pour une course enregistrée avec MuW. Nous ne gardons pas le fichier.",
        "Une course commence et finit souvent devant ta porte. C'est pourquoi une course ne devient visible pour les autres membres que si «Tout le monde» ou «Abonnés» est choisi sous «Qui peut la voir» quand tu l'enregistres, et ils voient alors la trace entière, départ et arrivée compris, avec le titre que tu lui as donné, et sans les temps, les pauses ni le parcours prévu. Ton choix reste sur ce téléphone pour la course suivante : elle part du dernier enregistré, tu le vois avant «Enregistrer» et tu peux le changer. Une activité ajoutée depuis un fichier dans «Mes activités» part de «Moi seulement» ; une activité ajoutée avec le «+» du Feed part de «Tout le monde», et tu peux le changer avant «Enregistrer».",
        "Qui peut voir une de tes courses peut aussi la suivre avec «Démarrer» et enregistrer cette même trace comme fichier GPX, sans les temps.",
        "Une publication pour «Tout le monde» peut aussi s'ouvrir avec un lien. Toi, ou tout membre qui voit la publication, pouvez partager son lien, et qui a le lien voit sur une page web le dessin sur la carte, ton nom d'utilisateur, le titre, le sport et la distance, même sans MuW: jamais tes photos, les commentaires ni tes temps. Il est demandé aux moteurs de recherche de ne pas lister ces pages. Désactive «Liens vers mes publications» dans Réglages et plus aucun lien vers tes publications ne fonctionne. Une publication pour «Abonnés» ou «Moi seulement» n'a jamais de lien.",
        "Une photo que tu publies peut contenir le dessin de ta course dans l'image. C'est le même dessin que celui du Feed.",
        "Pour une journée de ski, notre serveur compare la trace enregistrée aux remontées et pistes d'OpenStreetMap, qu'il garde lui-même, pour noter celles que tu as prises et combien de fois. Les noms apparaissent dans la publication, pour qui peut la voir. Rien ne part vers un autre service.",
        "Sur les photos que tu publies, tu peux identifier les articles que tu portes : ce qu'est chacun, sa marque et, si tu veux, son modèle et un lien vers une boutique. Ceux qui voient la photo les voient. Si la course repasse en «Moi seulement», ils quittent notre serveur avec ses photos et restent sur ce téléphone.",
        "Pour une journée de ski, l'app envoie à notre serveur ta position arrondie à environ 1 km pour trouver la station la plus proche ; la météo, c'est le serveur qui la demande à MET Norway avec la position de la station, jamais la tienne. La station, la neige et l'équipement que tu ajoutes apparaissent sur la publication, pour qui peut la voir, et la neige compte aussi, sans ton nom, dans la neige du jour de la station.",
      ],
    },
    {
      heading: "Favoris, commentaires, réactions et abonnements",
      blocks: [
        {
          bullets: [
            "Un parcours que tu gardes dans «Favoris» est enregistré en entier, avec sa ligne, qui commence souvent près de chez toi. Seul ton compte le voit, jusqu'à ce que tu le retires ou que tu supprimes le compte.",
            "Tes commentaires, tes réponses et tes réactions sous un dessin sont vus par les membres qui voient ce dessin. Une réaction à un commentaire ne leur apparaît que comme un nombre ; le membre qui a écrit ce commentaire lit, dans la cloche, que c'était toi. Tu peux supprimer tes propres commentaires et réponses, et retirer une réaction.",
            "Les personnes que tu suis, celles qui te suivent et les demandes d'abonnement sont gardées avec ton compte.",
          ],
        },
      ],
    },
    {
      heading: "Messages privés",
      blocks: [
        "Tes messages privés sont gardés sur notre serveur : qui a écrit, à qui, le texte et quand, et pour chacun des deux s'il a accepté la conversation, quand il l'a lue pour la dernière fois et jusqu'à quand il l'a retirée de sa vue. Ils ne sont pas chiffrés de bout en bout. Dans l'app, seuls les deux membres d'une conversation la voient, et personne n'est prévenu qu'un message a été lu. Nous les gardons pour te fournir le service que tu demandes (contrat).",
        "Un message peut porter une photo, une vidéo ou un dessin. Une photo est gardée réduite, sans les données que ton téléphone y ajoute, comme le lieu et le moment où elle a été prise. Une vidéo est gardée telle que ton téléphone l'envoie, sans le lieu où elle a été tournée, et elle est supprimée 30 jours après l'envoi, ou plus tôt, les plus anciennes d'abord, quand notre espace pour les vidéos est plein. Un dessin est une copie du parcours et arrive entier, avec son départ : une course que tu envoies, comme dans le Feed, comme un parcours que tu prévois. Les photos et les vidéos ne sont pas chiffrées de bout en bout, ne sont pas dans nos copies de sauvegarde et sont supprimées avec leur message, la conversation ou ton compte. Quand tu signales un message, la personne qui gère MuW voit aussi sa photo, sa vidéo ou son dessin.",
        "Un message à quelqu'un qui ne te suit pas arrive comme demande ; le premier message d'une demande passe par le même filtre de mots que les commentaires.",
        "Tu peux supprimer tes propres messages, pour vous deux. Supprimer une conversation la retire de ta vue ; un message que ni l'un ni l'autre ne voit plus est supprimé. Un blocage supprime la conversation ; supprimer ton compte supprime toutes tes conversations, avec les messages des deux.",
        "Quand tu signales un message, l'e-mail à la personne qui gère MuW ne contient que ce message, jamais le reste de la conversation. Avec le push allumé, la notification d'un message en porte le début, via le service push d'Expo et Apple ou Google, comme pour les commentaires.",
      ],
    },
    {
      heading: "Signalements",
      blocks: [
        "Quand tu signales un dessin, un article identifié, un commentaire ou un profil, nous gardons qui a signalé quoi, la raison et quand. La personne qui gère MuW le reçoit par e-mail et peut masquer ce qui a été signalé aux autres membres. Rien n'est supprimé, et son auteur le voit toujours. Ton signalement n'est jamais montré à l'auteur.",
      ],
    },
    {
      heading: "Courses en groupe",
      blocks: [
        "Si tu crées une course en groupe ou dis que tu y vas, les membres qui peuvent la voir voient ton nom, ta photo et que tu y vas. Quand tu supprimes ton compte, nous supprimons tes courses en groupe et tes réponses.",
      ],
    },
    {
      heading: "Avis",
      blocks: [
        "Quand tu nous écris depuis «Envoie-nous ton avis» dans «Réglages», nous gardons ton message, la version de l'app, le système de ton téléphone (iOS ou Android) et quand tu l'as envoyé. La personne qui gère MuW le reçoit par e-mail avec ton nom d'utilisateur et ton adresse e-mail, pour le lire et, si besoin, te répondre par e-mail. Il n'est jamais montré aux autres membres. Quand tu supprimes ton compte, tes messages sont supprimés avec lui de notre serveur.",
      ],
    },
    {
      heading: "Le jeu des formes",
      blocks: [
        "Avec un compte, notre serveur calcule à partir de tes courses à pied enregistrées combien de kilomètres comptent pour le jeu, tes meilleurs temps sur des distances de 400 m à 50 km, et les formes que tu as collectionnées. Toi seul vois ta collection et tes meilleurs temps. Les récompenses du jeu (éditions, cadres, titres et badges), toi seul les vois, jusqu'à ce que tu choisisses de montrer sur ton profil un cadre, un titre ou jusqu'à 3 badges : à partir de là, les personnes qui peuvent voir ton profil les voient. Sans ton choix, rien n'est montré, et tu peux les retirer quand tu veux. Pour les défis personnels, l'app envoie aussi avec chaque course l'écart entre l'horloge du téléphone et l'heure UTC (le fuseau horaire, par exemple +1 heure), jamais le lieu : il sert à compter les courses faites avant 8 h, le soir ou le week-end, et les semaines selon ton heure. Toi seul vois tes défis personnels et ta série. Si tu rejoins une équipe, ses membres voient ton nom d'utilisateur, ta photo, les pièces d'un défi que tu as prises et les kilomètres que tu as donnés à chacune, jamais tes tracés, les heures de tes courses ni où tu as couru. Une équipe ne se trouve qu'avec son code : elle n'est jamais dans une recherche. Supprimer une course retire ses kilomètres du compte, et les formes déjà collectionnées restent. Quand tu supprimes ton compte, tes données du jeu sont supprimées avec lui ; dans les défis d'une équipe, les pièces que tu as courues restent pour les autres, sans ton nom.",
      ],
    },
    {
      heading: "Les parcours que tu demandes",
      blocks: [
        "Pour dessiner un parcours, l'app envoie à notre serveur le départ, la forme ou le mot et la distance. Quand le téléphone a la carte hors ligne de la zone, il dessine le parcours tout seul.",
        "Les parcours que notre moteur dessine restent sur notre serveur sans qui les a demandés, pour répondre tout de suite à qui demande le même dessin à côté et pour les recommander ; nous comptons combien de courses et de favoris suivent chacun. Un parcours part de là où il a été demandé, souvent près de chez quelqu'un, mais ne dit jamais qui l'a demandé ou couru.",
        "Les cartes hors ligne viennent de notre serveur : celle autour de toi et, à l'avance, celles des villes proches. Pour plafonner ces téléchargements, le serveur les compte par jour, selon un numéro anonyme que l'app crée pour le téléphone ; ce compte n'est gardé qu'en mémoire.",
        "Les mots qui décrivent une forme sont lus sur notre serveur et ne sont envoyés à aucun service d'IA externe.",
        "Une photo que tu choisis pour un dessin va une fois vers notre serveur, pour en trouver le contour : le serveur ne la garde pas et ne l'inscrit pas dans ses journaux.",
        "Une figure dessinée avec le doigt, ou le contour de ta photo, va une fois sur notre serveur, comme l'itinéraire que tu demandes : le serveur ne la garde pas.",
        "Pour améliorer la recherche, nous gardons un événement pour chaque recherche et pour quelques utilisations de l'app (un parcours choisi, un fichier GPX exporté, une course notée) : le texte en minuscules, 200 caractères au plus, avec les e-mails et les longs numéros masqués ; les positions seulement sous forme de carrés d'environ 1 km ; rien qui dise qui tu es ni de quel téléphone il s'agissait. Ces événements sont gardés sans limite de temps.",
      ],
    },
    {
      heading: "Ta position",
      blocks: [
        "La position du téléphone est utilisée sur le téléphone, pour commencer un parcours là où tu es et pour suivre ta course. Elle va vers notre serveur exacte comme départ d'un parcours que tu demandes, comme départ des formes que l'app te prépare à proximité quand le téléphone ne peut pas les dessiner lui-même, et dans une course que tu enregistres. Hors du parcours d'une course, quand le téléphone ne trouve pas lui-même le chemin pour y revenir, elle va exacte vers notre serveur avec le tronçon du parcours devant toi, pour trouver ce chemin par les rues : le serveur ne les garde pas. Elle y va arrondie à environ 1 km pour trouver la carte hors ligne autour de toi, les parcours recommandés, les villes et les dessins proches, et pour montrer d'abord les lieux près de toi dans une recherche ; ainsi arrondie, elle ne reste pas liée à ton compte. Quand tu partages une activité en direct, ta position exacte va à notre serveur et à qui a le lien, comme décrit dans «Partage en direct».",
        "Sur iPhone, pendant une course que tu as lancée, l'app continue de suivre ta position même téléphone verrouillé ou avec une autre app ouverte, jusqu'à ce que tu arrêtes la course ; l'iPhone l'indique par une marque bleue en haut de l'écran. MuW demande la position seulement pendant que tu utilises l'app, jamais « Toujours ».",
        "Comme tout service internet, notre serveur voit l'adresse internet (IP) d'où vient une requête pendant qu'il y répond. Le journal du serveur n'écrit pas de positions, et la base de données ne contient aucune adresse IP.",
        "Un registre des demandes de parcours, avec leur départ, existe pour reproduire un défaut. Il est éteint sur notre serveur ; allumé, il contient 10 Mo au plus, puis les lignes les plus anciennes sont perdues.",
      ],
    },
    {
      heading: "Partage en direct",
      blocks: [
        "Pendant une activité, tu peux toucher «Partager en direct» pour créer un lien. Tant que tu partages, notre serveur reçoit toutes les 15 secondes ta position exacte avec l'heure, les chiffres de l'activité (distance, temps, allure ou vitesse, dénivelé, calories) et ta fréquence cardiaque quand une montre l'envoie. Toute personne qui a le lien les voit sur une page de getmuw.app, sans compte : tu choisis à qui l'envoyer, et qui l'a peut le transmettre. Le lien est aléatoire et impossible à deviner ; notre serveur n'en garde qu'un hash. Il cesse de fonctionner une heure après la fin de l'activité, au plus tard 24 heures après son début, ou dès que tu arrêtes le partage ; les positions et la fréquence cardiaque sont alors supprimées. La fréquence cardiaque est une donnée de santé : elle n'est partagée qu'après que tu l'as lu sur l'écran qui précède le lien. La carte de cette page vient d'OpenFreeMap, qui voit l'adresse internet (IP) de qui l'ouvre, mais ni le lien ni ta position. Pour partager, il faut un compte ; supprimer le compte supprime ses partages.",
      ],
    },
    {
      heading: "Publicité",
      blocks: [
        "MuW affiche ses propres posts Style avec des liens vers des boutiques, marqués « Publicité · Liens affiliés ». MuW n'utilise aucun réseau publicitaire, et l'app ne demande jamais à te suivre à travers d'autres apps. Quand tu ouvres un produit ou touches « Acheter », notre serveur ajoute seulement un au compte de ce jour pour ce produit : il ne sait pas qui tu es ni de quel téléphone il s'agit. « Acheter » ouvre le site de la boutique dans ton navigateur via le lien de notre réseau d'affiliation, Awin : à partir de là, Awin et la boutique enregistrent le clic et l'éventuel achat, avec leurs cookies et selon leurs propres politiques de confidentialité, pour que MuW reçoive sa commission. D'eux, MuW ne reçoit que des totaux de clics, de ventes et de commissions, jamais qui tu es.",
        "Le même comptage, par jour et sans savoir qui tu es, vaut pour les articles que les membres identifient sur leurs posts : celui qui a identifié un article voit combien de fois il a été ouvert et combien de fois quelqu'un est allé à la boutique, jamais qui. Le lien d'un membre va directement à la boutique, sans Awin : à partir de là, la boutique enregistre la visite avec ses cookies, selon sa propre politique de confidentialité.",
      ],
    },
    {
      heading: "Strava",
      blocks: [
        "Une course ne va vers Strava que quand tu le demandes, et seulement après que tu as connecté ton profil Strava. Tant qu'il est connecté, notre serveur garde ton nom Strava et les clés que Strava nous a données pour ton profil. Nous envoyons alors à Strava la trace avec ses temps, le nom et une ligne de description. Nous demandons à Strava seulement l'autorisation d'ajouter des activités, jamais de lire les tiennes. Sur Strava, l'activité suit tes réglages de confidentialité Strava, pas ceux de MuW.",
      ],
    },
    {
      heading: "L'app MuW sur Apple Watch",
      blocks: [
        "Avec l'app MuW sur Apple Watch, pendant une séance que tu lances, la montre enregistre ta position, ta fréquence cardiaque et tes calories actives, et enregistre la séance dans Apple Santé sur la montre.",
        "Le téléphone envoie à la montre les parcours que tu choisis («Envoyer à la montre» et tes favoris). À la fin d'une séance, la montre envoie au téléphone sa trace, qui y reste jusqu'à ce que tu l'enregistres ou la supprimes : une course enregistrée va sur notre serveur comme décrit dans «Tes courses et leurs traces GPS».",
        "Pendant une course, la montre envoie au téléphone ta fréquence cardiaque, pour l'afficher sur l'écran de la course : elle n'arrive pas sur notre serveur. La montre ne demande ta position que pendant une séance.",
      ],
    },
    {
      heading: "Apple Santé et Health Connect",
      blocks: [
        "Dès que tu actives «Enregistrer dans Apple Santé» (iPhone) ou «Enregistrer dans Health Connect» (Android), chaque activité que tu enregistres y est aussi écrite, sur ton téléphone : le sport, quand elle a commencé et fini, la distance, le parcours et, pour une course, les calories actives estimées. Si, à la fin d'une nage en piscine, tu touches «Ajouter la fréquence cardiaque depuis Santé», MuW lit la fréquence cardiaque que ta montre a enregistrée pendant cette nage, et rien d'autre. La moyenne et le maximum restent avec la nage sur notre serveur et s'affichent dans sa publication, sauf si tu désactives «Afficher la fréquence cardiaque» ; le temps dans chaque zone reste sur ton téléphone. Aucune de tes données de santé n'atteint une publicité. Tu peux l'arrêter dans l'app Santé ou dans Health Connect. Ce qui y est déjà reste jusqu'à ce que tu l'y supprimes, même quand tu supprimes la course ou ton compte.",
      ],
    },
    {
      heading: "Les autres qui reçoivent des données",
      blocks: [
        {
          bullets: [
            "Hetzner héberge notre serveur et ses sauvegardes, en Allemagne.",
            "Geoapify reçoit les recherches de lieux, de villes près de toi et de lieux d'un parcours à thème, avec la position arrondie à environ 1 km, et, pour nommer le lieu d'une course enregistrée, son départ arrondi de la même façon : jamais ta porte, la course ni qui tu es. Si notre serveur ne répond pas, une recherche de lieu va à Photon (komoot) à la place.",
            "OpenFreeMap fournit la carte : comme tout service de cartes, il voit quelle zone tu regardes.",
            "Les collines de la carte 3D, et d'une vidéo dans le style «3D», viennent des Terrain Tiles hébergées sur Amazon Web Services : comme tout service de cartes, il voit quelle zone tu regardes.",
            "Apple sur iPhone, ou Google sur Android, via le service d'adresses du téléphone, reçoit la position d'où part «Dessiner», pour écrire le nom de la rue. MuW ne lui envoie rien d'autre et ne garde pas le nom.",
            "Wikimedia fournit à notre serveur les photos des villes : il voit quelle ville, pas qui demande.",
            "Avec la carte « Satellite », Esri fournit les images, et avec la carte « 3D », Amazon Web Services fournit les altitudes : comme tout service de cartes, ils voient quelle zone tu regardes.",
            "Les services Overpass des données OpenStreetMap (overpass-api.de et, quand il ne répond pas, overpass.private.coffee) sont interrogés par notre serveur pour la carte d'une zone qu'il n'a pas encore : ils voient quelle zone, pas qui a demandé.",
            "Pour un parcours en raquettes, notre serveur demande à Amazon Web Services les altitudes d'une zone qu'il n'a pas encore : il voit quelle zone, pas qui a demandé.",
            "unpkg fournit la bibliothèque de la carte au démarrage de l'app.",
            "Expo fournit les mises à jour de l'app.",
            "Google Ireland Limited (Firebase Cloud Messaging), pour livrer les notifications push aux téléphones Android. Quand tu allumes le push, l'app demande à Firebase un jeton d'enregistrement pour ton téléphone ; le service push d'Expo transmet chaque notification (qui a fait quoi, et le début d'un commentaire) à Google, qui la livre à ton téléphone. Google voit le jeton et le contenu de chaque notification, pas ton compte ni ta position. Le jeton est retiré de notre serveur quand tu éteins le push, te déconnectes ou supprimes ton compte ; celui du téléphone disparaît quand tu désinstalles l'app.",
            "Resend, aux États-Unis, envoie les e-mails de MuW : ton adresse e-mail avec l'e-mail lui-même. Pour un signalement, il apporte à la personne qui gère MuW ce qui a été signalé, son texte, la raison et les noms d'utilisateur de qui l'a signalé et de qui l'a écrit. Pour «Envoie-nous ton avis», il apporte ton message, ton nom d'utilisateur et ton adresse e-mail.",
            "Google, avec son service Web Risk, reçoit de notre serveur des morceaux de l'empreinte (hash) de certains liens que les membres ajoutent à leurs articles, pour vérifier qu'ils ne mènent pas à des sites dangereux : jamais le lien entier, ni qui l'a ajouté ou qui l'ouvre.",
            "Strava, comme dit plus haut.",
          ],
        },
        "Une image ou une vidéo de ta course faites avec «Partager» sont créées sur le téléphone et ne le quittent que par le menu de partage, vers l'endroit où tu les envoies. La vidéo montre la carte autour de ta course, départ et arrivée compris.",
      ],
    },
    {
      heading: "Où sont tes données et pour combien de temps",
      blocks: [
        {
          bullets: [
            "Sur notre serveur en Allemagne, tant que tu as le compte.",
            "Quand tu supprimes ton compte, tout ce qui est à toi est supprimé tout de suite : profil, photo, numéro de téléphone, courses, dessins, favoris, commentaires, réactions, abonnements, données du jeu et les nouvelles qui attendent ton e-mail. Les parcours que notre moteur a dessinés restent : ils ne disent rien de qui les a demandés.",
            "Une sauvegarde de la base de données est faite chaque nuit et gardée 13 jours : un compte supprimé sort de toutes les sauvegardes en 14 jours au plus.",
            "Sur ton téléphone : la session, tes choix (langue, sport, lacs ou mer), les cartes hors ligne, les courses qui attendent encore d'être envoyées et, avec un compte, la zone d'où partent d'habitude tes activités, pour te suggérer des lacs et la mer à proximité ; elle est effacée quand tu te déconnectes.",
          ],
        },
        "La connexion entre l'app et notre serveur est chiffrée (HTTPS).",
      ],
    },
    {
      heading: "Pourquoi nous pouvons utiliser tes données",
      blocks: [
        {
          bullets: [
            "Pour te fournir le service que tu demandes (contrat) : ton compte, ton profil, les parcours que tu demandes, et les courses, favoris, commentaires, réactions et abonnements que tu enregistres, les e-mails des notifications que tu as allumées, et le jeu des formes.",
            "Notre intérêt légitime à faire fonctionner MuW, à la garder sûre et à l'améliorer : les courts journaux du serveur, les comptages qui limitent les téléchargements de cartes et les événements de recherche, qui ne disent rien de qui tu es ; la comparaison des numéros de tes contacts, dont aucun n'est gardé ; l'e-mail en cas d'absence, que tu peux refuser à l'inscription, dans «Réglages» ou dans chaque e-mail ; les e-mails des signalements, pour garder MuW sûre ; l'archive des parcours dessinés, qui ne dit rien de qui tu es ; les messages de «Envoie-nous ton avis», pour les lire et te répondre.",
            "Ton consentement : le numéro de téléphone que tu choisis d'ajouter, la connexion à Strava, l'enregistrement de tes activités dans Apple Santé ou Health Connect et la lecture de ta fréquence cardiaque depuis Apple Santé. Tu peux retirer un consentement à tout moment ; ce qui a été fait avant reste licite.",
            "Une obligation légale, quand une loi nous demande de conserver ou de remettre des données.",
          ],
        },
      ],
    },
    {
      heading: "Tes droits",
      blocks: [
        "Tu peux, à tout moment :",
        {
          bullets: [
            "voir et corriger tes données : nom d'utilisateur, bio et photo dans «Profil», e-mail et numéro de téléphone dans «Réglages» ;",
            "supprimer une course de «Mes activités», un favori, un commentaire, ou le compte entier depuis «Réglages», «Supprimer le compte» ;",
            "nous demander une copie de tes données, ou d'arrêter ou de limiter une utilisation ;",
            "retirer un consentement que tu as donné ;",
            "éteindre n'importe quel e-mail dans «Réglages» ou avec son lien ;",
            "porter plainte auprès de l'autorité de protection des données de ton pays (en Italie, le Garante per la protezione dei dati personali).",
          ],
        },
        "Pour tout ce que tu ne peux pas faire depuis l'app, écris à muw2610@gmail.com.",
      ],
    },
    {
      heading: "Enfants",
      blocks: [
        "Les comptes MuW sont pour les personnes d'au moins 16 ans. Si tu penses qu'une personne plus jeune a un compte, écris-nous et nous le supprimerons.",
      ],
    },
    {
      heading: "Modifications de ce texte",
      blocks: [
        "Quand ce texte change, nous changeons la date en haut ; si une modification est importante, nous la ferons connaître avant qu'elle s'applique.",
      ],
    },
    {
      heading: "Contact",
      blocks: ["Luca Pallaoro · muw2610@gmail.com"],
    },
  ],
};

export const FR: AboutContent = { help, terms, privacy };
