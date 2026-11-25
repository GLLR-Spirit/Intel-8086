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


---

## 7. Deuxième passe — résultats attendus et questions (25 novembre 2026)

### 7.1 Exemples : oracles individuels

Le test `tests/learning-quality.cjs` ne se limite plus à lancer les 108 exemples :

- chaque exemple possède maintenant un contrôle d'état attendu ou un contrôle d'encodage/désassemblage indépendant ;
- les assertions contrôlent les registres et, selon le cas, la mémoire, la pile, les FLAGS, les octets machine et les limites de l'instruction ;
- les exemples dont la propriété enseignée est théorique ou non mesurable dans le simulateur sont explicitement marqués comme tels au lieu de prétendre mesurer un comportement matériel.

La couverture des oracles est de **108/108 exemples**, avec deux chemins de contrôle pour les cas d'encodage et de désassemblage. La suite vérifie aussi les 108 exécutions source sans erreur. Le CI a précédemment confirmé le passage de la nouvelle batterie d'oracles ; les modifications pédagogiques de cette passe restent soumises au dernier run de validation avant clôture.

**Réserve :** ces oracles sont des assertions indépendantes du résultat annoncé, mais ils s'exécutent encore sur le moteur du laboratoire pour les états dynamiques. Ils ne remplacent pas une comparaison de chaque instruction avec le silicium ni les références Intel pour les bits indéfinis.

### 7.2 Questions : revue sémantique individuelle

Revue de la totalité du jeu de questions, et pas uniquement de sa structure :

- **324/324 questions intermédiaires** : énoncé, réponse indexée et explication contrôlés ;
- **360/360 questions finales** : énoncé, réponse indexée, explication et catégorie contrôlés ;
- **684/684 items** examinés dans le contexte du chapitre et de sa progression ;
- les propositions distractrices ont été relues en complément des contrôles automatiques de non-duplication et de distinction.

Corrections apportées à la suite de cette revue :

1. **Chapitre 10** : « quelle instruction demande le mode pas à pas » est remplacé par « quel indicateur active le mode pas à pas » ; la réponse correcte est TF, un indicateur, pas une instruction.
2. **Chapitre 11** : la formulation « instruction courante » est remplacée par « prochaine instruction à exécuter » pour décrire précisément IP.
3. **Chapitre 26** : la question de correction d'un décalage qui doit préserver le signe citait à tort `SAR` comme instruction erronée ; elle vise maintenant `SHR`, à remplacer par `SAR`.
4. **Chapitre 34 — LOCK** : les questions ne présentent plus `LOCK INC AX` comme une forme architecturalement interdite. Le manuel Intel 8086 indique que le préfixe LOCK active le signal pendant l'instruction suivante en mode maximum ; il peut donc être présent même si une opération sur registre n'apporte pas de protection à une donnée mémoire partagée. Les questions distinguent désormais l'encodage du préfixe de son utilité pour protéger une donnée partagée.

Les assertions de régression dans `tests/learning-quality.cjs` figent les réponses et explications des formulations corrigées.

### 7.3 Point technique à conserver ouvert : LOCK et préfixes combinés

La référence Intel 8086 précise que le signal LOCK reste actif pendant l'instruction qui suit le préfixe et mentionne le cas d'une instruction de chaîne répétée verrouillée. Le parseur du laboratoire rejette actuellement LOCK devant une instruction de chaîne. Cette divergence entre la portée architecturale du préfixe et la restriction du modèle doit être auditée en phase 2, notamment pour les séquences LOCK+REP et leurs effets sur le flux source et binaire. Elle ne doit pas être masquée par la correction du cours.

### 7.4 Statut pédagogique à ce stade

- Présence et structure des 36 chapitres : contrôlées.
- 108 exemples : exécution et oracles de résultats présents.
- 684 questions : revue sémantique effectuée et corrections ciblées enregistrées.
- Progression et qualité rédactionnelle des 108 leçons : revue approfondie à poursuivre.
- Illustrations, animations et interactions : inventaire et test d'interaction chapitre par chapitre à poursuivre.
- Séparation Cours / Exercices / Atelier : présence contrôlée dans l'interface ; audit UX détaillé à poursuivre.

**Conclusion :** les exemples et le jeu de questions ont franchi une étape de vérification beaucoup plus stricte, mais la phase 3 n'est pas clôturée. Les leçons, les visualisations et les interactions doivent encore être évaluées individuellement, et les limites du modèle doivent rester explicites.


### 7.5 Illustrations, animations et séparation des espaces

L'inventaire du rendu `courseVisual(i)` donne maintenant onze chapitres avec une visualisation dédiée :

| Chapitre | Visualisation | Nature |
|---:|---|---|
| 2 | Chaîne BIU → EU → ALU et bus | Schéma animé |
| 5 | Décomposition AX en AH/AL | Interactive |
| 11 | Trace binaire AX/BX/CX/IP/SP/FLAGS | Interactive, états pré-calculés |
| 12 | Comparateur et FLAGS | Interactive |
| 18 | Segment:offset et adresse physique | Interactive |
| 20 | Calcul d'adresse effective | Interactive |
| 21 | Pile LIFO | Interactive |
| 27 | Transfert de chaîne DS:SI → ES:DI | Schéma |
| 29 | Cadre d'interruption | Schéma |
| 31 | Opcode et champs d'encodage | Schéma |
| 32 | Décodeur ModR/M | Interactive |

Le test navigateur vérifie les sept interactions (AX, trace binaire, FLAGS, segment:offset, adresse effective, pile et ModR/M) et l'animation BIU. L'animation est schématique, ne représente pas des cycles matériels et respecte `prefers-reduced-motion`.

**Limite identifiée :** la nouvelle trace du chapitre 11 est interactive mais pré-calculée ; elle n'avance pas le moteur binaire réel et ne suit pas les modifications mémoire. Le mode pas à pas de l'atelier reste distinct. Vingt-cinq chapitres ne possèdent pas de diagramme spécifique dans `courseVisual`; leur texte et leurs exemples restent consultables, mais la couverture visuelle demeure inégale.

La séparation d'interface est maintenant contrôlée par le test navigateur :
- **Cours** : `view-learn` ;
- **Exercices** : `view-exercises`, avec recherche, chapitre, difficulté et type ;
- **Atelier** : `view-editor`.

Le test vérifie la navigation entre ces vues, le filtrage de la liste et la remise à zéro des filtres. Cette séparation est conservée : les exercices pratiques ne sont pas réintroduits dans les leçons du cours.

### 7.6 Corrections techniques complémentaires des leçons

La revue des 108 leçons a aussi conduit aux clarifications suivantes :

- **C11 L3** : l'exemple d'INC commence maintenant par STC ; il démontre réellement que CF reste à 1 après l'incrémentation de FFh vers 00h.
- **C17 L1** : le texte explique les variantes JA/JAE et JB/JBE et la politique choisie pour l'égalité.
- **C21 L3** : le résultat numérique de MUL AX est explicité : DX:AX=0000:0009h.
- **C24 L3** : la distinction CF/OF entre MUL (moitié haute non nulle) et IMUL (résultat non représentable sur la largeur signée) est explicitée.
- **C30 L1** : l'espace de ports est décrit comme 16 bits ; le numéro immédiat est encodé sur 8 bits et DX fournit 16 bits. AL/AX définissent la largeur du transfert.
- **C30 L3** : NOP est décrit précisément : aucun changement des registres généraux, de la mémoire ou de FLAGS, tandis que IP avance normalement.
- **C33 L2–L3** : le cours distingue maintenant un flux réellement assemblé/désassemblé d'un octet externe fourni au désassembleur.
- **C35 L2–L3** : l'exemple LOOP précise quel branchement est pris ; l'exemple d'optimisation ne prétend plus démontrer un gain de cycles.

Le CI de la branche doit confirmer ces oracles et les tests navigateur avant que cette passe soit considérée comme stabilisée.


### 7.7 Cohérence des prérequis et notions anticipées

La revue des 36 objectifs et de leurs prérequis confirme une progression générale cohérente : architecture et numération, registres et syntaxe, arithmétique/FLAGS, branchements et boucles, mémoire/pile/procédures, opérations avancées, puis encodage et limites matérielles.

Deux exemples utilisent toutefois une notion avant sa formalisation complète :
- **C7 L3** utilise `[BX]` pour montrer LDS/LES ;
- **C17 L3** utilise `[SI]` pour une recherche séquentielle.

Ces exemples sont conservés comme aperçus, mais leur théorie précise maintenant que l'adressage indirect simple et l'accès DS:SI sont des prévisualisations ; la segmentation et les huit modes d'adressage sont formalisés aux chapitres 18 et 19. Cela évite de présenter ces notions comme déjà entièrement acquises.


### 7.8 Trace interactive de registres — chapitre 11

Une trace pas à pas pré-calculée a été ajoutée au chapitre 11 sur le programme binaire `MOV AX,2`, `MOV BX,3`, `ADD AX,BX`, `HLT`. Elle affiche les offsets IP en octets, AX, BX, CX, SP et les neuf FLAGS modélisés, avec commandes précédent/suivant/réinitialiser. Les états affichés ont un oracle final exécuté sur le chemin binaire : AX=5, BX=3, IP=9, SP=FFFEh et PF=1.

Cette visualisation est explicitement étiquetée comme pré-calculée : elle n'est pas un pas-à-pas live du moteur et ne prétend pas simuler la BIU, les cycles ou les accès mémoire. Le test navigateur contrôle chaque transition affichée.


### 7.9 Vérification CI de la passe pédagogique

Sur le commit de code `7c8f356771848c797825b78498d02438886976d2`, le workflow de validation a réussi (run `45688448342`) et le test navigateur a réussi (run `45688448597`). Ces runs couvrent notamment les oracles des exemples, les contrôles de questions, les sept démonstrations interactives, la navigation Cours/Exercices/Atelier et les filtres d'exercices.

### 7.10 Contrôles complémentaires — 25 novembre 2026

Les oracles de résultats sont maintenant consolidés dans le test d'apprentissage :
- 108/108 leçons disposent d'au moins un oracle indépendant de résultat attendu ;
- le test vérifie l'identifiant de chaque couple chapitre/leçon et refuse toute leçon sans oracle ;
- les contrôles portent sur les registres, les FLAGS, la mémoire et les valeurs d'adresse quand l'exemple les mobilise ;
- les cas conceptuels sans calcul exécuté par le processeur sont explicitement distingués des résultats calculés par le programme.

Les 684 questions sont figées dans le manifeste de référence `docs/question-semantic-key-8086.json`. Le test compare, pour chaque identifiant, l'énoncé, l'ensemble des choix, la réponse correcte et l'explication avec le manifeste. La vérification du manifeste est un contrôle de non-régression ; la validation technique repose sur la revue sémantique enregistrée dans la section 7.2 et sur les règles Intel citées dans le registre des formes.

Corrections et renforcements d'exemples :
- **C29 L1** : l'exemple calcule maintenant réellement 30h × 4 par MUL et vérifie AX=00C0h, au lieu de ne présenter qu'un commentaire non exécuté.
- **C31 L2** : l'exemple utilise CX=5678h et contrôle B9 78 56, distinct du MOV AX immédiat de la leçon précédente.
- **C32 L1** : l'exemple initialise BX/SI et contrôle le codage ModR/M avec disp8 pour BX+SI+4.
- **C32 L2** : l'exemple initialise et relit les huit formes d'adressage mémoire du 8086 ; il vérifie les valeurs en mémoire et le segment par défaut DS ou SS selon l'emploi de BP.
- **C32 L3** : l'adressage direct disp16 est écrit puis relu, avec contrôle des octets little-endian.
- **C34 L1** : l'override CS est comparé à une donnée initialisée dans le segment choisi.
- **C34 L2–L3** : LOCK INC mémoire et REP MOVSB sont vérifiés sur les états et les octets attendus, sans prétendre simuler l'atomicité électrique du bus.

Le contrôle de la progression rédactionnelle, la qualité de chaque explication, l'exhaustivité des visualisations et le test interactif de chaque chapitre restent à terminer. La phase 3 n'est donc pas déclarée close.