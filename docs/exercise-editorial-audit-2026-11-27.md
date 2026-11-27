# Audit éditorial et pédagogique des 48 exercices — 2026-11-27

## Portée et méthode

Première passe individuelle sur les 48 entrées du tableau `exercises` : intitulé, consigne, programme de départ, solution guidée, prédicat de validation, métadonnées de difficulté/type et chapitres associés. Les résultats d'exécution source/binaire existants sont conservés comme preuve technique, mais ne sont pas assimilés à une certification éditoriale.

**État de départ vérifié sur `main` :**
- 48 exercices présents sur 48 chapitres couverts.
- 48/48 corrections exécutées en source et en binaire et comparées par le test différentiel.
- 48/48 prédicats de validation satisfaits par leur correction et rejetant au moins une mutation de l'état architectural.
- Ces contrôles ne prouvent pas que le prédicat couvre toutes les exigences de la consigne, ni que l'apprenant peut fournir une réponse non exécutable (explication, justification, analyse d'encodage).

## Registre individuel

« Première passe » signifie que la structure consigne/programme/correction/validateur/métadonnées a été confrontée. « Aucun écart structurel relevé » ne vaut pas certification pédagogique finale.

| ID | Exercice | Chapitre(s) | Résultat de la première passe |
|---|---|---:|---|
| EX01 | Additionner deux nombres | 8 | Aucun écart structurel relevé ; correction guidée présente. |
| EX02 | Échanger deux valeurs | 7 | Aucun écart structurel relevé ; l'usage de DX est expliqué et vérifié par l'état final. |
| EX03 | Somme répétée | 16 | Aucun écart structurel relevé ; CX et AX sont vérifiés. |
| EX04 | Comparer deux valeurs | 12, 14 | Aucun écart structurel relevé ; les deux chemins sont représentés dans la correction. |
| EX05 | Somme de 1 à 6 | 17 | Aucun écart structurel relevé ; somme et compteur final sont vérifiés. |
| EX06 | Architecture : transfert entre registres | 1, 2, 5 | Aucun écart structurel relevé ; objectifs AX/BX et correction concordants. |
| EX07 | Numération : addition en hexadécimal | 3, 4, 8 | Aucun écart structurel relevé ; conversion 2Ah + 06h = 30h cohérente. |
| EX08 | Registres : modifier un octet | 5 | Aucun écart structurel relevé ; AH est préservé et AX vaut 1256h. |
| EX09 | MOV : respecter destination et source | 6, 7 | Aucun écart structurel relevé ; ordre destination/source explicité. |
| EX10 | Pile : vérifier PUSH et POP | 20 | Aucun écart structurel relevé ; valeur récupérée et état de pile contrôlés. |
| EX11 | Logique : appliquer un masque AND | 9 | Aucun écart structurel relevé ; résultat 0Ch cohérent avec le masque. |
| EX12 | Segments : initialiser DS | 18 | Aucun écart structurel relevé ; registres DS/BX vérifiés. |
| EX13 | Soustraction et résultat nul | 8, 10 | Aucun écart structurel relevé ; résultat et ZF contrôlés. |
| EX14 | Branchement signé | 14, 15 | Aucun écart structurel relevé ; distinction signé/non signé explicitée. |
| EX15 | Boucle : somme de 1 à 4 | 16, 17 | Aucun écart structurel relevé ; ordre ADD/INC/LOOP cohérent. |
| EX16 | Pile : ordre LIFO | 20 | Aucun écart structurel relevé ; ordre d'empilement/dépilement cohérent. |
| EX17 | XOR : basculer des bits | 9 | Aucun écart structurel relevé ; résultat 5Ah justifié bit à bit. |
| EX18 | Segments : initialiser SS et BP | 18, 19 | Aucun écart structurel relevé ; relation BP/SS expliquée. |
| EX19 | Débogage : suivre les deux chemins | 11, 12, 14 | Aucun écart structurel relevé ; branchement et chemin pris expliqués. |
| EX20 | Raisonnement : comparaison signée | 14, 15 | Aucun écart structurel relevé ; JL est motivé par l'interprétation signée. |
| EX21 | Programme à compléter : calculer le maximum | 12, 17 | Aucun écart structurel relevé ; cas AX≥BX et cas contraire couverts. |
| EX22 | Débogage : corriger une boucle | 11, 16 | Aucun écart structurel relevé ; l'incrémentation parasite de CX est identifiée. |
| EX23 | Débogage : réparer l’ordre d’un échange | 7, 11 | Aucun écart structurel relevé ; la sauvegarde préalable dans DX est expliquée. |
| EX24 | Problème complet : somme des nombres pairs | 9, 16, 17 | Aucun écart structurel relevé ; TEST/JNZ et accumulation sont cohérents. |
| EX25 | Défi expert : copie de mots en sens décroissant | 18, 27, 28 | Aucun écart structurel relevé ; DF, REP MOVSW et CLD sont explicités. |
| EX26 | Saut direct : vérifier la cible | 13 | Aucun écart structurel relevé ; l'instruction sautée est identifiée. |
| EX27 | Procédure : CALL et RET near | 21 | Aucun écart structurel relevé ; AX, SP et la pile logique sont contrôlés. |
| EX28 | Paramètre sur pile : lire avec BP | 22 | Aucun écart structurel relevé ; [BP+4], cadre BP et RET 2 sont expliqués. |
| EX29 | Programmation modulaire : deux routines | 23 | Aucun écart structurel relevé ; résultat et équilibre de pile sont vérifiés. |
| EX30 | MUL : produit non signé sur 8 bits | 24 | Aucun écart structurel relevé ; produit et CF/OF sont contrôlés. |
| EX31 | DIV : quotient et reste sur 8 bits | 25 | Aucun écart structurel relevé ; AL/AH et quotient/reste concordent. |
| EX32 | Décalage : SHR et retenue | 26 | Aucun écart structurel relevé ; résultat et CF sont cohérents. |
| EX33 | Interruption logicielle : INT et IRET | 29 | Aucun écart structurel relevé ; AX, SP et la pile logique sont contrôlés. |
| EX34 | Entrée-sortie : lire un port | 30 | Aucun écart structurel relevé ; valeur lue et état du port sont contrôlés. |
| EX35 | Encodage : vérifier MOV immédiat | 31 | Écart confirmé : la consigne exige l'encodage B8 34 12 F4, mais le validateur d'exercice ne vérifie que AX=1234h. |
| EX36 | ModR/M : écrire puis relire une donnée | 32 | Aucun écart structurel relevé dans le résultat fonctionnel ; la mémoire little-endian et AX sont contrôlés. |
| EX37 | Assembleur et désassembleur : branchement symbolique | 33 | Écart confirmé : la consigne exige de vérifier les frontières d'instructions au désassemblage, mais le validateur ne contrôle que AX=1234h. |
| EX38 | Préfixe de segment : distinguer DS et ES | 34 | Aucun écart structurel relevé ; les deux adresses physiques et AX sont contrôlés. |
| EX39 | Optimisation : préserver le résultat et reconnaître les limites | 35 | Écart confirmé : la consigne demande une explication sur les cycles physiques, mais l'interface ne recueille aucune réponse textuelle ; le validateur ne contrôle que AX=8. |
| EX40 | Projet de synthèse : somme d'un tableau en mémoire | 36 | Aucun écart structurel relevé ; somme, compteur et écriture mémoire sont contrôlés. |
| EX41 | Procédure : appeler puis retourner | 20, 21, 23 | Écart confirmé : la consigne exige une pile équilibrée, mais le validateur ne contrôle que AX=10. |
| EX42 | Arithmétique : MUL puis DIV sur 8 bits | 24, 25 | Aucun écart structurel relevé ; quotient 8 et reste 2 concordent. |
| EX43 | FLAGS : préserver la retenue avec PUSHF/POPF | 11, 20 | À approfondir : CF est vérifié et la pile logique est vide, mais SP n'est pas contrôlé explicitement. |
| EX44 | Chaînes : copier deux octets avec REP MOVSB | 18, 27, 28 | Aucun écart structurel relevé ; octets, SI, DI et CX sont contrôlés. |
| EX45 | Chaînes : rechercher 42h avec REPNE SCASB | 12, 27, 28 | Aucun écart structurel relevé ; ZF, CX et DI correspondent à l'arrêt sur la valeur trouvée. |
| EX46 | Interruptions : exécuter un gestionnaire logiciel | 29 | À approfondir : AX et pile logique sont contrôlés, mais SP et la reprise exacte après INT ne sont pas affirmés par le prédicat. |
| EX47 | Intégration : copier, vérifier et signaler par interruption | 12, 14, 18, 20, 27, 28, 29 | Écart confirmé : BX vaut implicitement zéro avant PUSH BX, puis le programme le remet à zéro avant POP BX ; le test ne démontre donc pas réellement la préservation d'une valeur non nulle. SP n'est pas vérifié. |
| EX48 | Intégration : parcours inverse et contrôle de mot | 12, 14, 18, 20, 27, 28, 29 | Écart confirmé : même faiblesse de démonstration pour PUSH/POP BX (valeur initiale nulle) ; le test vérifie la pile logique mais pas SP. |

## Écarts confirmés à traiter

### E1 — Encodage non couvert par le validateur (EX35)

La correction exécute correctement MOV et HLT, mais le prédicat ne compare pas les octets assemblés à `B8 34 12 F4`. Ajouter un oracle d'encodage indépendant, distinct du prédicat d'état final.

### E2 — Désassemblage non évalué (EX37)

Le prédicat exécute le programme et vérifie AX ; il n'appelle pas le désassembleur. Ajouter un oracle qui vérifie les octets, les frontières, les tailles et les instructions décodées, y compris le saut et l'instruction située sur le chemin non exécuté.

### E3 — Réponse conceptuelle impossible à soumettre (EX39)

L'énoncé contient une demande rédactionnelle, alors que l'interface n'offre qu'un éditeur assembleur et un prédicat d'état machine. Soit retirer la demande d'explication de la consigne et la déplacer dans la correction, soit ajouter une réponse réflexive textuelle avec critères de correction.

### E4 — Critère de pile incomplet (EX41)

La consigne demande un retour équilibré, mais le validateur de EX41 n'exige que AX=10. Ajouter des assertions de pile adaptées à l'état initial : SP restauré et pile logique vide.

### E5 — Préservation de BX non démontrée (EX47 et EX48)

BX n'est pas initialisé à une sentinelle non nulle avant sa sauvegarde. La valeur implicite initiale est zéro, et le programme réécrit zéro avant le dépilage : le test peut donc réussir sans démontrer la conservation d'une valeur utile. Initialiser BX avec une valeur sentinelle (par exemple BEEFh), la sauvegarder, la modifier, la restaurer, puis vérifier BX et SP.

### E6 — Reprise d'interruption à mieux certifier (EX46)

Les prédicats doivent rendre explicites les invariants de retour d'interruption : SP restauré, pile logique vide, exécution reprise à l'instruction attendue après INT et état FLAGS/CS:IP conforme au modèle testé. Les assertions actuelles ne couvrent pas toutes ces dimensions.

## Filtres : défaut confirmé et renforcement

Le champ de recherche annonce « Titre, instruction ou notion… », mais le texte recherché avant correction ne contenait que le titre, la consigne, le type et les noms de chapitres. Le programme de départ, l'indice, les étapes et la solution guidée étaient absents de l'index de recherche. La recherche d'une instruction présente dans le code pouvait donc ne pas retrouver l'exercice.

Correction proposée sur la branche d'audit : indexer aussi le programme de départ, l'indice, les étapes et la solution guidée.

Le test navigateur précédent ne comparait qu'une combinaison difficulté + chapitre + type. Il est remplacé sur la branche d'audit par une matrice exhaustive des 1 554 combinaisons des trois filtres structurés (37 valeurs de chapitre incluant « tous », 6 valeurs de difficulté incluant « toutes », 7 types incluant « tous »), avec contrôle de la liste réelle et du compteur. Il ajoute aussi la recherche dans le code source, une recherche combinée avec les trois filtres et la réinitialisation.

## Grille de validation éditoriale obligatoire

Chaque exercice doit être évalué indépendamment sur les critères suivants. Un contrôle automatique réussi ne remplace pas la revue éditoriale.

| Critère | Preuve attendue | Statut possible |
|---|---|---|
| Alignement consigne / solution | Chaque exigence explicite de la consigne possède une étape correspondante dans la correction. | Conforme / À corriger / Bloqué |
| Alignement solution / validateur | Le validateur contrôle toutes les exigences observables, pas seulement un résultat partiel. | Conforme / À corriger / Non automatisable |
| Préconditions | Registres, segments, mémoire, pile, FLAGS et ports initiaux sont explicités ou déterministes. | Conforme / À corriger |
| Résultat attendu | Valeurs exactes, largeur, signé/non signé, mémoire et indicateurs sont précisés sans ambiguïté. | Conforme / À corriger |
| Explication de la démarche | La correction explique pourquoi chaque instruction est utilisée et comment l'état évolue. | Conforme / À corriger |
| Erreurs typiques | Au moins une erreur plausible est expliquée avec son symptôme et sa correction. | Conforme / À compléter |
| Choix techniques | Les choix d'instructions et les alternatives pertinentes sont justifiés au niveau annoncé. | Conforme / À compléter |
| Progression | Prérequis, charge cognitive et difficulté réelle correspondent au niveau attribué. | Conforme / À reclasser |
| Portée pédagogique | Les exercices de synthèse mobilisent réellement plusieurs chapitres et leurs dépendances. | Conforme / À reclasser |
| Source / binaire | Quand applicable, résultats architecturaux identiques et oracle indépendant. | Réussi / Échec / Non applicable |
| Encodage / désassemblage | Quand explicitement demandé, comparaison indépendante des octets et des frontières d'instruction. | Réussi / Échec / Non applicable |
| Filtres | Recherche, chapitre, difficulté et type composent correctement ; compteur et réinitialisation sont exacts. | Réussi / Échec |

## Décision de certification

- **48/48** : couverture technique source/binaire établie par le CI existant.
- **48/48** : inventoriés dans cette première passe éditoriale.
- **6 familles d'écarts confirmées** : EX35, EX37, EX39, EX41, EX46, EX47 et EX48 (la famille E5 regroupe deux exercices).
- **Certification éditoriale globale : non accordée** tant que les écarts ne sont pas corrigés et que les 48 exercices n'ont pas passé la grille complète.
- Les corrections de contenu ne doivent pas être considérées comme terminées avant ajout des oracles manquants et nouvelle exécution des contrôles.


## Mise à jour après corrections — 2026-11-27

Les écarts de la première passe ont été corrigés sur cette branche :

- **EX35** : l'oracle assemble le programme soumis et exige exactement les octets `B8 34 12 F4`.
- **EX37** : l'oracle assemble puis désassemble le flux complet ; il vérifie les octets, les quatre frontières d'instructions et les tailles `2, 1, 3, 1`, y compris le NOP sauté à l'exécution.
- **EX39** : l'interface recueille une justification écrite ; le contrôle refuse une réponse vide et exige les notions de cycles, BIU, prélecture, bus et limite de mesure du simulateur.
- **EX33** : le validateur exige AX=1234h, SP=FFFEh, pile logique vide et IP final à 0006h après le retour IRET et l'exécution de HLT.
- **EX41** : le validateur exige AX=10, SP restauré à FFFEh, pile logique vide et IP final égal à la taille assemblée du programme après HLT.
- **EX43** : le validateur exige désormais CF=1, SP restauré à FFFEh et pile logique vide après PUSHF/POPF.
- **EX46** : le validateur exige désormais AX=1234h, SP restauré à FFFEh, pile logique vide et IP final à 0006h. Cette valeur correspond à la reprise après INT, à l'exécution de HLT, puis à l'adresse immédiatement après HLT dans le programme de l'exercice.
- **EX47 et EX48** : les oracles exigent aussi IP final égal à la taille assemblée du programme, en plus des invariants de registres, mémoire, FLAGS et pile.
- **EX47 et EX48** : BX est initialisé à BEEFh, sauvegardé, modifié, puis restauré ; les validateurs vérifient BX=BEEFh, SP=FFFEh et la pile logique vide. Les corrections guidées ont été alignées sur les mêmes programmes.

### Preuves CI après corrections

- CI principal : **simulator-smoke-tests réussi** et **course-browser-audit réussi**.
- Audit navigateur de niveau 3 : **réussi**.
- Corrections guidées : **48/48** chargées, exécutées et acceptées par leur validateur dans l'interface.
- Comparaison source/binaire : **48/48** corrections comparées.
- Oracles complémentaires : **7/7** corrections avancées acceptées ; trois contrôles négatifs rejettent une réponse écrite absente, un encodage différent mais fonctionnel et une pile déséquilibrée.
- Filtres : **1 554/1 554** combinaisons, recherche dans le code, recherche combinée et réinitialisation réussies.

### Statut de certification

Ces preuves lèvent les six familles d'écarts techniques de la première passe. Elles ne remplacent pas la revue éditoriale complète de chacun des 48 exercices sur les critères de progression, prérequis, erreurs typiques, précision des explications et adéquation du niveau. **Le statut global reste donc « certification pédagogique complète en cours »**, et non « 48/48 certifiés ». Aucun changement n'est fusionné dans `main` et aucun déploiement n'a été effectué.


### Contrôle complémentaire des invariants de pile et de reprise

Une seconde vérification du prédicat a relevé deux assertions encore trop faibles dans la première mise à jour :

- **EX43** : une pile logique vide ne suffisait pas à démontrer que SP avait retrouvé sa valeur initiale. L'assertion SP=FFFEh est maintenant explicite.
- **EX46** : l'état AX et la pile vide ne démontraient pas que le flot avait repris après INT. Le prédicat exige maintenant SP=FFFEh et IP=0006h après l'exécution de HLT. Le test sera considéré comme validé uniquement si le CI confirme cette valeur sur l'exécution réelle.

La revue éditoriale des 48 fiches se poursuit séparément : la présence d'une correction et d'un oracle ne suffit pas à prouver que tous les chemins de branchement, toutes les consignes de méthode et toutes les réponses conceptuelles sont évalués.


### Reprise du flot de contrôle : assertions renforcées

La vérification des exercices d'appel et d'interruption ne s'arrête plus à la pile logique :

- EX33 et EX46 vérifient l'IP final après IRET et HLT (0006h).
- EX41 vérifie l'IP final après CALL/RET et HLT par rapport à la taille assemblée.
- EX47 et EX48 vérifient également la fin effective du programme après le retour d'interruption, en comparant IP à la taille du flux assemblé.

Ces assertions sont des invariants du modèle pédagogique exécuté par le simulateur ; elles ne prétendent pas démontrer les timings ou les signaux électriques d'un processeur physique.
