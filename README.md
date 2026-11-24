# Intel 8086 Lab

**Un laboratoire interactif, gratuit et sans compte pour apprendre et pratiquer l'assembleur Intel 8086.**

## Objectif

Intel 8086 Lab rassemble dans une seule page :
- Un parcours d'apprentissage libre ou guidé, du niveau débutant au niveau avancé
- Des leçons progressives avec exemples modifiables
- Un éditeur de code assembleur
- Un moteur pédagogique avec exécution complète et pas à pas
- L'observation des registres, des indicateurs FLAGS et d'une mémoire segmentée pédagogique
- Une référence d'instructions, des exercices et des idées de projets
- Une suite de 168 tests rapides intégrée à la page pour contrôler des cas de calcul, FLAGS, sauts, boucles et pile
- Un convertisseur binaire, décimal, hexadécimal et octal
- Une sauvegarde locale dans le navigateur, sans compte ni serveur

## Utiliser le laboratoire

Ouvre simplement **[Intel 8086 Lab](https://gllr-spirit.github.io/Intel-8086/)** après activation de GitHub Pages.

Pour activer GitHub Pages :
1. Ouvre **Settings** dans le dépôt.
2. Va dans **Pages**.
3. Dans **Build and deployment**, choisis **Deploy from a branch**.
4. Sélectionne la branche **main** et le dossier **/(root)**.
5. Enregistre. GitHub publiera ensuite le site à l'adresse ci-dessus.

## Validation sémantique

L'analyseur contrôle notamment les restrictions 8086 des registres de segment : `CS` ne peut pas être modifié par `MOV`, les constantes immédiates ne peuvent pas être transférées directement vers un registre de segment, les transferts segment/segment sont rejetés, et les opérations arithmétiques/logiques sur ces registres sont interdites. Les transferts entre registre de segment et registre général 16 bits ou mémoire `WORD` sont contrôlés. `POP CS` est également refusé. Cette validation reste un sous-ensemble pédagogique et ne constitue pas une compatibilité complète MASM/TASM.

## Simulateur : périmètre actuel

Le moteur JavaScript est un interpréteur pédagogique, pas un émulateur matériel complet du 8086. Il prend actuellement en charge un sous-ensemble comprenant notamment :

- Transferts et calculs : `MOV`, `ADD`, `SUB`, `INC`, `DEC`
- Logique : `AND`, `OR`, `XOR`, `NOT`, `TEST`
- Décalages : `SHL`, `SAL`, `SHR`
- Comparaison et branchements : `CMP`, `JMP`, `JE/JZ`, `JNE/JNZ`, `JC/JNC`, `JS/JNS`, `JO/JNO`, `JP/JNP`, `JG/JGE/JL/JLE`, `JA/JAE/JB/JBE`
- Multiplication et division : `MUL`, `IMUL`, `DIV`, `IDIV` (opérandes implicites `AX` et `DX:AX`, vérification du quotient et division par zéro)
- Boucles et pile : `LOOP`, `PUSH`, `POP`, `PUSHF`, `POPF`, `CALL`, `RET` (mots stockés en little-endian dans la mémoire simulée à l'adresse physique calculée depuis `SS:SP`, avec métadonnées de contrôle pour les retours)
- Manipulation des indicateurs : `CLI`, `STI`, `CLC`, `STC`, `CMC`, `CLD`, `STD` ; `PUSHF`/`POPF` sauvegardent et restaurent le mot FLAGS simulé
- Contrôle : `NOP`, `HLT`
- Interruptions : `INT n`, `IRET` et directive pédagogique `VECTOR n, ETIQUETTE` ; empilement/restauration de `FLAGS`, `CS`, `IP`, effacement de `IF`/`TF` à l'entrée et prise en charge des interruptions imbriquées
- Compatibilité DOS limitée : `INT 21h` avec `AH=02h` affiche le caractère contenu dans `DL` lorsqu'aucun gestionnaire `VECTOR 21h` n'est déclaré

Les erreurs sont exposées sous forme de diagnostics structurés : catégorie (syntaxe, instruction, opérande, sémantique, préfixe ou exécution), numéro de ligne lorsqu'il est disponible, instruction source, explication et indication de correction. Les erreurs de validation sont distinguées des erreurs qui ne peuvent apparaître qu'au moment de l'exécution. Cette classification est pédagogique et ne prétend pas couvrir toutes les règles d'un assembleur MASM/TASM.

L'analyse préalable utilise une table centralisée des instructions prises en charge et contrôle le nombre d'opérandes, les catégories registre/mémoire/immédiat, les destinations interdites, les opérations mémoire-mémoire, les incompatibilités de tailles explicites et certaines plages de valeurs immédiates. La validation mémoire distingue les tailles déductibles par un registre de celles qui doivent être explicites : `BYTE PTR` ou `WORD PTR` est exigé pour une destination mémoire avec immédiat (`MOV`, opérations arithmétiques/logiques), les opérandes mémoire des opérations unaires, `MUL`/`IMUL`/`DIV`/`IDIV`, les décalages et les accès mémoire de pile. Les transferts registre/mémoire conservent l'inférence de taille depuis le registre. `PUSH` et `POP` sont limités aux mots 16 bits (les immédiats et registres 8 bits sont refusés), conformément au jeu d'encodage 8086. `INT` exige un vecteur immédiat sur 8 bits. `SHL`/`SAL`/`SHR` acceptent `1` ou `CL`, comme sur le 8086. `XCHG` prend en charge les échanges registre-registre et registre-mémoire de même taille ; les immédiats, les paires mémoire-mémoire et les registres de segment sont refusés. Les instructions inconnues et les références d'étiquettes non définies sont rejetées avant l'exécution. Cette validation reste limitée au sous-ensemble pédagogique décrit ci-dessous ; elle ne constitue pas un assembleur MASM/TASM complet. Les instructions non implémentées doivent produire une erreur explicite. Pour `MUL` et `IMUL`, le résultat est placé dans `AX` (opérande 8 bits) ou `DX:AX` (opérande 16 bits). `DIV` et `IDIV` utilisent `AX` ou `DX:AX` comme dividende et placent quotient/reste dans les registres prévus par le 8086. Les divisions par zéro et dépassements de quotient produisent une erreur explicite. Pour la multiplication, seuls `CF` et `OF` sont définis par le modèle ; les autres FLAGS restent inchangés. Les FLAGS après division sont indéfinis sur le 8086 et sont laissés inchangés par ce simulateur.

Le moteur valide les formes d'adressage effectif 8086 : BX, BP, SI ou DI seuls ; BX+SI, BX+DI, BP+SI et BP+DI ; adressage direct et formes avec déplacement. Il refuse AX/CX/DX/SP, les doublons, les combinaisons base-base ou index-index, plus de deux registres et les déplacements hors plage représentable sur 16 bits (-32768 à 65535). Les overrides CS/DS/ES/SS sont acceptés sur les opérandes mémoire et les instructions de chaîne prévues ; FS/GS sont refusés. Le segment SS est sélectionné par défaut lorsqu'une adresse utilise BP, DS sinon. Les validations d'adressage sont distinguées des incompatibilités de taille BYTE/WORD. L'adresse physique est calculée sur 20 bits avec la formule segment × 16 + offset. Cela reste un modèle pédagogique simplifié : les cycles de bus, la prélecture, les périphériques et une IVT physique ne sont pas émulés. La directive non matérielle `VECTOR n, ETIQUETTE` associe un numéro d'interruption à une étiquette du programme. `INT` empile les mots `FLAGS`, `CS` et l'indice de l'instruction suivante ; `IRET` les restaure dans l'ordre requis. Les adresses de retour correspondent à des indices d'instructions et non à des offsets d'octets machine. Les interruptions imbriquées sont prises en charge par la pile simulée. `CALL`/`RET` utilisent également des indices d'instructions. La pile écrit désormais les octets des mots empilés dans la mémoire simulée, en little-endian, à l'adresse physique calculée depuis `SS:SP` ; une structure de métadonnées distincte conserve le type des cadres `CALL`/`INT` pour détecter les retours incohérents. `PUSHF`/`POPF` utilisent cette mémoire. Les métadonnées sont contrôlées contre SS:SP et la mémoire à chaque empilement/dépilement ; les incohérences de segment, pointeur ou octets manquants sont signalées. La vue de pile affiche les mots et leurs deux octets avec leurs adresses physiques. La limite de 32 768 mots est une garde pédagogique ; le processeur 8086 matériel ne fournit pas lui-même une détection de débordement de pile. `STI` active immédiatement `IF` dans ce modèle ; le délai matériel d'inhibition de l'interruption après `STI` et l'ordonnancement des IRQ externes ne sont pas simulés.

## Architecture et confidentialité

- HTML, CSS et JavaScript natifs
- Aucun backend, aucune inscription et aucune dépendance obligatoire
- Les préférences, la progression, le code et les notes sont stockés dans le stockage local du navigateur
- Effacer les données du navigateur peut supprimer ces sauvegardes
- Le dépôt étant public, le code source de la page est consultable

## Développement

Le projet privilégie la précision pédagogique. Toute nouvelle instruction ou extension mémoire doit être accompagnée de tests portant sur les résultats, les registres et les FLAGS avant d'être présentée comme prise en charge. Les tests rapides sont également exécutables depuis la section **Outils et références**.

## Licence

Aucune licence open source n'est déclarée pour le moment. Ne présume pas d'une autorisation de réutilisation ou de redistribution avant qu'une licence soit ajoutée.


## Instructions de chaînes 8086

Instructions prises en charge : `MOVSB/MOVSW`, `LODSB/LODSW`, `STOSB/STOSW`, `CMPSB/CMPSW`, `SCASB/SCASW`, avec les préfixes `REP`, `REPE/REPZ` et `REPNE/REPNZ`. Les sources utilisent `DS:SI`, les destinations `ES:DI`; `DF` contrôle l'incrémentation ou la décrémentation de `SI` et `DI`. Pour `CMPS` et `SCAS`, `REP` se comporte comme `REPE` et s'arrête si `ZF` devient nul. Une répétition est limitée à 10 000 itérations par instruction pour protéger le navigateur. Les préfixes `REP`, `REPE/REPZ`, `REPNE/REPNZ` et les overrides `CS:`, `DS:`, `ES:`, `SS:` peuvent être placés sur la même ligne ou sur des lignes séparées avant l'instruction de chaîne. Un override de segment modifie la source mémoire lorsque l'instruction en possède une ; la destination des instructions de chaîne reste `ES:DI`. Chaque pas d'exécution d'une instruction REP traite au plus une itération, en conservant l'instruction courante tant que la répétition continue.
