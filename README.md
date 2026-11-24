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
- Une suite de 97 tests rapides intégrée à la page pour contrôler des cas de calcul, FLAGS, sauts, boucles et pile
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

## Simulateur : périmètre actuel

Le moteur JavaScript est un interpréteur pédagogique, pas un émulateur matériel complet du 8086. Il prend actuellement en charge un sous-ensemble comprenant notamment :

- Transferts et calculs : `MOV`, `ADD`, `SUB`, `INC`, `DEC`
- Logique : `AND`, `OR`, `XOR`, `NOT`, `TEST`
- Décalages : `SHL`, `SAL`, `SHR`
- Comparaison et branchements : `CMP`, `JMP`, `JE/JZ`, `JNE/JNZ`, `JC/JNC`, `JS/JNS`, `JO/JNO`, `JG/JGE/JL/JLE`, `JA/JAE/JB/JBE`
- Multiplication et division : `MUL`, `IMUL`, `DIV`, `IDIV` (opérandes implicites `AX` et `DX:AX`, vérification du quotient et division par zéro)
- Boucles et pile : `LOOP`, `PUSH`, `POP`, `PUSHF`, `POPF`, `CALL`, `RET` (mots stockés en little-endian dans la mémoire simulée à l'adresse physique calculée depuis `SS:SP`, avec métadonnées de contrôle pour les retours)
- Manipulation des indicateurs : `CLI`, `STI`, `CLC`, `STC`, `CMC`, `CLD`, `STD` ; `PUSHF`/`POPF` sauvegardent et restaurent le mot FLAGS simulé
- Contrôle : `NOP`, `HLT`
- Interruptions : `INT n`, `IRET` et directive pédagogique `VECTOR n, ETIQUETTE` ; empilement/restauration de `FLAGS`, `CS`, `IP`, effacement de `IF`/`TF` à l'entrée et prise en charge des interruptions imbriquées
- Compatibilité DOS limitée : `INT 21h` avec `AH=02h` affiche le caractère contenu dans `DL` lorsqu'aucun gestionnaire `VECTOR 21h` n'est déclaré

Les instructions non implémentées doivent produire une erreur explicite. Pour `MUL` et `IMUL`, le résultat est placé dans `AX` (opérande 8 bits) ou `DX:AX` (opérande 16 bits). `DIV` et `IDIV` utilisent `AX` ou `DX:AX` comme dividende et placent quotient/reste dans les registres prévus par le 8086. Les divisions par zéro et dépassements de quotient produisent une erreur explicite. Pour la multiplication, seuls `CF` et `OF` sont définis par le modèle ; les autres FLAGS restent inchangés. Les FLAGS après division sont indéfinis sur le 8086 et sont laissés inchangés par ce simulateur.

Le moteur prend désormais en charge les formes usuelles d'adressage effectif (direct, BX/BP/SI/DI, base+index et déplacement), les overrides CS/DS/ES/SS, le segment SS par défaut avec BP, ainsi que les accès BYTE/WORD en little-endian. L'adresse physique est calculée sur 20 bits avec la formule segment × 16 + offset. Cela reste un modèle pédagogique simplifié : les cycles de bus, la prélecture, les périphériques et une IVT physique ne sont pas émulés. La directive non matérielle `VECTOR n, ETIQUETTE` associe un numéro d'interruption à une étiquette du programme. `INT` empile les mots `FLAGS`, `CS` et l'indice de l'instruction suivante ; `IRET` les restaure dans l'ordre requis. Les adresses de retour correspondent à des indices d'instructions et non à des offsets d'octets machine. Les interruptions imbriquées sont prises en charge par la pile simulée. `CALL`/`RET` utilisent également des indices d'instructions. La pile écrit désormais les octets des mots empilés dans la mémoire simulée, en little-endian, à l'adresse physique calculée depuis `SS:SP` ; une structure de métadonnées distincte conserve le type des cadres `CALL`/`INT` pour détecter les retours incohérents. `PUSHF`/`POPF` utilisent cette mémoire. Les métadonnées sont contrôlées contre SS:SP et la mémoire à chaque empilement/dépilement ; les incohérences de segment, pointeur ou octets manquants sont signalées. La vue de pile affiche les mots et leurs deux octets avec leurs adresses physiques. La limite de 32 768 mots est une garde pédagogique ; le processeur 8086 matériel ne fournit pas lui-même une détection de débordement de pile. `STI` active immédiatement `IF` dans ce modèle ; le délai matériel d'inhibition de l'interruption après `STI` et l'ordonnancement des IRQ externes ne sont pas simulés.

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

Instructions prises en charge : `MOVSB/MOVSW`, `LODSB/LODSW`, `STOSB/STOSW`, `CMPSB/CMPSW`, `SCASB/SCASW`, avec les préfixes `REP`, `REPE/REPZ` et `REPNE/REPNZ`. Les sources utilisent `DS:SI`, les destinations `ES:DI`; `DF` contrôle l'incrémentation ou la décrémentation de `SI` et `DI`. Pour `CMPS` et `SCAS`, `REP` se comporte comme `REPE` et s'arrête si `ZF` devient nul. Une répétition est limitée à 10 000 itérations par instruction pour protéger le navigateur. Les préfixes doivent être écrits sur la même ligne que l'instruction (ex. `REP MOVSB`). Les overrides de segment pour les instructions de chaîne ne sont pas encore pris en charge.
