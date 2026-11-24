# Audit du chargement et de l'exécution d'un flux binaire 8086

Date : 24 novembre 2026

## Portée de cette phase

Le laboratoire dispose maintenant d'un chemin distinct pour charger un flux d'octets et lancer son exécution depuis une adresse initiale `CS:IP`. Cette voie ne dépend pas de l'assembleur source pour produire les octets : elle reçoit un tableau d'octets, le désassemble avec le décodeur existant, puis prépare un programme exécutable à partir des instructions décodées.

## Fonctionnement

1. Validation de la taille du flux (1 à 65 536 octets), des octets et des registres initiaux CS/IP.
2. Décodage linéaire du flux avec `disassembleBytes`.
3. Construction de la correspondance entre chaque offset du flux et l'offset IP chargé : `(IP_initial + offset) mod 65536`.
4. Résolution des destinations relatives vers des étiquettes internes uniquement si elles correspondent à un début d'instruction décodé.
5. Écriture des octets dans `cpu.mem` à l'adresse physique `((CS << 4) + IP) mod 1 048 576`, avec bouclage du registre IP sur 16 bits.
6. Exécution des instructions décodées, avec CS/IP initiaux, pile, mémoire et FLAGS du simulateur.

L'état retourné expose `execution.mode = "loaded-binary"`, `codeSize`, `loadCS`, `loadIP` et `decodedInstructions`.

## Interface

Dans l'atelier, saisir des octets hexadécimaux ou charger un fichier `.bin` dans le désassembleur, renseigner CS et IP initiaux, puis utiliser **Exécuter le flux binaire**. Les valeurs de segment et d'offset sont des mots 16 bits.

## Validation

La suite `tests/byte-offset-execution.cjs` couvre :
- chargement à une adresse CS:IP choisie et vérification de la mémoire physique ;
- exécution de MOV/INC/HLT depuis les octets chargés ;
- branchement conditionnel vers une frontière d'instruction décodée ;
- refus d'une cible au milieu d'une instruction ;
- refus explicite d'opcodes/formes restés DB dans le décodeur ;
- validation de CS/IP ;
- CALL/RET et adresse de retour binaire ;
- chargement traversant IP=FFFFh ;
- comparaison des registres et FLAGS entre l'exécution source assemblée et l'exécution binaire.

## Limites explicites

Cette version est un premier chargeur pédagogique, pas encore un moteur de décodage à la demande :
- le flux est décodé linéairement une fois au chargement ;
- les cibles de branchement doivent être des frontières d'instructions de ce décodage linéaire ;
- un branchement vers des octets non décodés linéairement ou au milieu d'une instruction est refusé ;
- les octets sont copiés en mémoire, mais le moteur d'exécution utilise encore les lignes décodées préparées au chargement, pas un fetch/décode de chaque opcode depuis `cpu.mem` à chaque étape ;
- le sous-ensemble du décodeur/interpréteur reste limité ; les instructions rendues sous forme DB ne sont pas exécutées ;
- les transferts FAR et le chargement de plusieurs segments de code indépendants restent à traiter.

La prochaine étape technique doit donc être un décodeur incrémental `fetch → decode → execute` qui lit directement la mémoire à CS:IP, avec un cache de décodage facultatif mais invalidable lors des écritures dans le code.
