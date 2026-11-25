# Audit pédagogique du cours — Intel 8086

**État : première passe automatisée, audit sémantique approfondi en cours.**  
**Périmètre :** 36 chapitres, 108 exemples de leçon, 324 questions intermédiaires et 360 questions finales.

## 1. Contrôle d'exécutabilité des exemples

Le test `tests/learning-quality.cjs` exécute maintenant chaque exemple de la structure canonique `curriculum` à travers le moteur source du laboratoire.

Résultat initial : **106/108** exemples s'exécutaient sans erreur.

Deux cas ont été corrigés :

- **Chapitre 13 — Saut indirect et choix de forme :** `MOV BX, OFFSET CIBLE` n'était pas accepté par l'assembleur du laboratoire. L'exemple utilise désormais une cible d'offset explicite (`0008h`) et précise que cette valeur dépend de l'image assemblée à l'offset initial `0000h`.
- **Chapitre 25 — Erreurs et plage du quotient :** l'exemple provoquait volontairement un dépassement de quotient. Il a été remplacé par le cas frontière valide `AX=00FFh, BL=1`, qui produit `AL=FFh` et `AH=00h`. Le texte explique ensuite que `AX=0100h` avec le même diviseur dépasse la capacité du quotient 8 bits.

La passe suivante a confirmé **108/108 exemples exécutables sans erreur du simulateur**.

**Interprétation du résultat :** cette vérification prouve uniquement que les exemples passent dans le moteur source actuel. Elle ne prouve pas que chaque résultat annoncé, chaque état de FLAGS ou chaque effet mémoire est exact. Les exemples qui dépendent d'un état initial, d'une mémoire préchargée, d'un vecteur ou d'une convention de chargement exigent une vérification dédiée.

## 2. Corrections de précision pédagogique

- Clarification de la distinction entre `BH` (octet fort de `BX`) et `BL` (octet faible de `BX`) dans l'explication des registres.
- Le saut indirect du chapitre 13 explicite désormais l'hypothèse de positionnement de l'image ; un offset codé en dur ne doit pas être présenté comme une adresse universelle.
- La leçon sur la division présente maintenant un cas valide à la limite de capacité, puis distingue ce cas de l'exception de division provoquée par un quotient hors plage.

### Vérifications sémantiques supplémentaires

Une vérification ciblée des états de sortie a révélé une imprécision dans l'exemple ADD/ADC du chapitre 8 : le texte laissait entendre que CF restait à 1 après l'instruction ADC. En réalité, ADD produit d'abord CF=1 ; ADC consomme cette retenue et met à jour les indicateurs à nouveau. Avec les valeurs de l'exemple, le résultat final est AL=00h, BL=02h et CF=0. Le texte et l'oracle de test ont été corrigés.

Six exemples représentatifs disposent maintenant d'oracles d'état qui vérifient les valeurs attendues de registres et, pour ADD/ADC, l'état final de CF. Cette couverture est ciblée : elle ne remplace pas encore un oracle indépendant pour les 108 exemples.

## 3. Contrôles automatiques des questions

Les tests vérifient désormais :

- 3 propositions non vides et distinctes pour chaque question ;
- un index de bonne réponse dans la plage des propositions ;
- une explication non vide et suffisamment développée ;
- aucune répétition exacte de l'énoncé parmi les 10 questions finales d'un même chapitre ;
- aucune répétition exacte entre les questions intermédiaires d'une leçon et l'évaluation finale du chapitre ;
- conservation des 324 questions intermédiaires et des 360 questions finales.

Ces contrôles détectent des défauts structurels. **Ils ne certifient pas la justesse technique de chacune des 360 réponses.** L'audit humain et architectural reste nécessaire pour les conditions FLAGS, les restrictions d'opérandes, les plages numériques, les encodages 8086 et les limites du simulateur.

## 4. Limites du modèle à signaler dans le cours

Les explications doivent distinguer le processeur physique du modèle logiciel du laboratoire. Les audits techniques existants documentent notamment :

- l'absence de simulation des cycles bus, de la prélecture BIU et de l'arbitrage matériel ;
- le modèle logiciel des ports d'entrée-sortie, sans périphériques physiques ;
- l'absence de simulation d'un coprocesseur 8087 pour `ESC` ;
- l'absence d'atomicité observable du bus pour `LOCK` dans le moteur mono-thread ;
- les limites de la modélisation des segments de code FAR et de l'IVT matérielle ;
- le caractère partiel de la validation de nombreuses familles et formes d'encodage.

Les registres de référence à consulter sont `audit-reference-8086.md`, `registre-validation-dynamique-8086.md`, `audit-chargement-binaire-8086.md`, `audit-chain-strings-8086.md` et `audit-groupes-opcodes-8086.md`.

## 5. Étapes suivantes

1. Vérifier les résultats annoncés de chacun des 108 exemples, et pas seulement leur absence d'erreur.
2. Contrôler les effets sur les registres, la mémoire et chaque indicateur FLAGS défini, conservé ou indéfini.
3. Auditer les 360 questions finales individuellement : bonne réponse, distracteurs, niveau, explication et compatibilité 8086.
4. Approfondir les explications théoriques et les démonstrations chapitre par chapitre, en commençant par les niveaux débutants.
5. Conserver la séparation entre Cours, Exercices et Atelier ; aucune fonctionnalité supplémentaire n'est prioritaire à ce stade.

## 6. Règle de validation

Aucun exemple ou item pédagogique ne doit être marqué « vérifié architecturalement » sur la seule base d'une exécution réussie dans le simulateur. La validation finale exige une justification indépendante à partir des règles du 8086 et des capacités effectivement implémentées et testées.


---

# Mise à jour — audit sémantique et banque d'évaluations (25 novembre 2026)

**Branche :** `audit/niveau-3-chapitres-12-17`  
**Commit de référence pour les premiers résultats :** `96064b632f3eaf0e5a354c1a38c45df83d58108c`  
**CI :** [45681543194](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45681543194) — succès  
**Navigateur :** [45681543224](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45681543224) — succès

## 1. Résultats attendus des 108 exemples

La suite `tests/learning-quality.cjs` ne se limite plus à exécuter les exemples. Elle possède maintenant des oracles indépendants sur :
- les registres ;
- les neuf FLAGS modélisés lorsque leur valeur est définie ;
- les octets mémoire et les adresses segment:offset ;
- la pile et le retour des procédures/interruption ;
- les octets assemblés ;
- les séquences désassemblées et les octets inconnus ;
- les calculs d'adresse physique et les règles de codage.

Les contrôles couvrent les 15 exemples des chapitres 1–5, les 18 exemples des chapitres 6–11, les 73 exemples restants des chapitres 12–36, ainsi que deux exemples de contrôle supplémentaires déjà présents dans le banc. Les chevauchements sont dédupliqués par couple chapitre/leçon.

**Couverture unique : 108/108 exemples associés à un oracle de résultat indépendant.** Les 73 nouveaux contrôles supplémentaires sont rapportés par le test sous `Advanced course audit: 73/73`. Le test final vérifie le nombre de clés uniques afin d'éviter qu'un même exemple soit compté deux fois.

Cette couverture est une première validation sémantique du contenu actuel. Elle ne constitue pas une preuve matérielle du 8086 : les cas conceptuels sont validés par calcul ou par octets, et les limites du modèle restent explicites.

## 2. Corrections d'exemples réalisées

- **Chapitre 19 — mémoire et adressage :** les trois exemples lisent désormais des données initialisées. Les valeurs attendues sont déterminées et vérifiables ; le cas BP initialise SS et contrôle le segment par défaut.
- **Chapitre 28 — répétitions :** l'exemple REPE/REPNE utilise effectivement SCASB et vérifie l'arrêt sur ZF. L'exemple REP MOVSB initialise DS, ES, SI, DI, CX et les deux octets source.
- **Chapitre 29 — interruptions :** l'ancien exemple de recherche SCASB ne démontrait pas le cadre d'interruption annoncé. Il a été remplacé par un scénario `VECTOR`, `INT`, gestionnaire et `IRET`, avec vérification de BX et de l'équilibre de pile.
- **Chapitre 31 — encodage :** les exemples MOV immédiat et MOV registre-registre sont maintenant de véritables séquences assembleur ; BX est initialisé avant d'être transféré dans AX.
- **Chapitre 32 — ModR/M :** les exemples utilisent de véritables opérandes mémoire initialisées ; les octets de l'opérande `MOV AX,[BX+SI+4]`, le déplacement et l'adressage direct sont vérifiés séparément.
- **Chapitre 33 — assembleur/désassembleur :** la résolution de `JMP FIN`, le flux `B8 34 12 F4` et la conservation d'un octet inconnu sont vérifiés par des vecteurs d'encodage/décodage.
- **Chapitre 34 — préfixes :** l'override CS lit une donnée initialisée dans le segment concerné ; LOCK INC porte sur une vraie opérande mémoire ; REP MOVSB copie deux octets connus.
- **Chapitre 35 — architecture matérielle :** les affirmations de mesure de cycles et de prélecture ont été corrigées. Le laboratoire ne simule pas la BIU, sa file ni les cycles de bus ; le cours ne doit pas présenter ces phénomènes comme observés dans le simulateur.

## 3. Révision des 684 questions

L'inspection de la construction de `chapterLearning` a mis au jour un défaut de conception : pour les chapitres 18–36, les questions intermédiaires et finales étaient générées à partir de formulations génériques et de distracteurs sans rapport avec l'architecture étudiée.

Ces questionnaires ont été remplacés par des banques spécifiques aux chapitres 18–36 :
- **171 questions intermédiaires** rédigées par leçon, avec catégories compréhension, application et vérification ;
- **190 questions finales** propres aux 19 chapitres, organisées selon les dix catégories demandées : définition, compréhension, syntaxe, restrictions, prédiction, calcul/prédiction, analyse de programme, analyse de résultat, débogage et raisonnement.

Les tests vérifient maintenant pour les 36 chapitres :
- trois questions de leçon dans l'ordre des catégories ;
- dix questions finales dans l'ordre des dix catégories ;
- trois choix distincts et non vides ;
- une réponse correcte valide et une explication substantielle ;
- l'absence d'énoncés génériques de remplissage et de distracteurs génériques dans les chapitres 18–36 ;
- l'absence de répétition exacte dans les finales et entre leçons et finale.

**Les 324 questions intermédiaires et 360 questions finales existent maintenant sous forme de banques spécifiques, et leurs contrôles structurels passent.** La revue technique exhaustive de chaque distracteur et de chaque explication dans les banques des chapitres 1–17 reste à poursuivre ; le succès structurel ne doit pas être confondu avec cette revue individuelle.

## 4. Illustrations et démonstrations — constat

L'inspection du rendu `courseVisual` relève actuellement neuf visuels intégrés :
- architecture BIU/EU/ALU ;
- décomposition AX/AH/AL ;
- calcul segment:offset ;
- calcul d'adresse effective ;
- pile LIFO ;
- transfert de chaîne ;
- cadre d'interruption ;
- structure générale d'encodage ;
- champs ModR/M.

Le détail AX/AH/AL possède un bouton d'affichage interactif. Les autres visuels sont principalement statiques. Il n'existe pas encore d'animation BIU/file de prélecture ni de démonstration pas-à-pas intégrée au cours qui mette en parallèle AX, BX, CX, IP, SP, FLAGS et la mémoire.

**Ce point reste ouvert.** Une illustration statique ne doit pas être décrite comme une animation ou comme un simulateur interactif.

## 5. Séparation des espaces pédagogiques

La page Cours présente les leçons, les exemples commentés et les quiz. Les exercices guidés sont servis par la page Exercices et les projets par l'espace Atelier. Le lien de navigation depuis une leçon vers les exercices est présent. La revue complète des parcours utilisateur, des filtres, des retours détaillés et des transitions entre les trois espaces reste à effectuer sur navigateur.

## 6. Statut exact

| Contrôle | État |
|---|---|
| Présence des 36 chapitres | Vérifiée |
| Exécutabilité des 108 exemples | 108/108 |
| Oracles indépendants des 108 exemples | 108/108 clés uniques dans le banc de test |
| 324 questions intermédiaires | Banques spécifiques et structure contrôlée |
| 360 questions finales | Banques spécifiques et structure contrôlée |
| Exactitude technique individuelle des questions 1–17 | Revue approfondie restante |
| Visuels statiques | 9 recensés |
| Interactivité et animations de cours | Insuffisantes ; approfondissement restant |
| Parcours Cours / Exercices / Atelier | Structure présente ; audit navigateur détaillé restant |

**Conclusion :** la validation des exemples a franchi un seuil important : chaque leçon a maintenant un oracle de résultat. La qualité des questionnaires des chapitres 18–36 a été améliorée en supprimant les questions génériques. Le cours ne peut cependant pas être déclaré totalement validé tant que la revue technique individuelle des questions 1–17, l'audit visuel/interactif et le parcours navigateur des trois espaces ne sont pas terminés.
