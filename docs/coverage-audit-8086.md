# Audit de couverture du jeu d'instructions Intel 8086

**Dépôt audité :** `GLLR-Spirit/Intel-8086`  
**Branche :** `main`  
**Date de l'audit statique :** 24 novembre 2026  
**Périmètre :** Intel 8086 original uniquement ; aucune instruction 80186 ou ultérieure n'est comptée.  
**Nature :** audit statique du code, de la documentation et des tests existants. Ce document ne prétend pas certifier le comportement électrique ou matériel du processeur.

## 1. Méthode et règle de comptage

Le dénominateur principal est de **93 entrées canoniques**. Il comprend les mnémotechniques 8086 de base, les formes byte/word distinctes des instructions de chaîne et les 16 conditions de saut. Les synonymes sont regroupés séparément afin de ne pas gonfler artificiellement le nombre d'instructions.

Sont exclus du dénominateur :
- les alias de syntaxe ou de condition (par exemple `JC` / `JB`, `JZ` / `JE`, `SAL` / `SHL`) ;
- les préfixes, traités dans une section séparée ;
- les directives d'assembleur et les extensions pédagogiques (`VECTOR`) ;
- les modes d'adressage, qui sont des formes d'opérandes et non des instructions.

**Sens des colonnes :**
- **Documentation = Oui** signifie que l'entrée est présente dans l'inventaire canonique du dépôt. Cela ne signifie pas que toutes ses formes, tous ses cycles et tous ses effets FLAGS ont une fiche complète.
- **Simulateur** décrit la présence d'une branche d'exécution dans l'interpréteur. `Partiel` signifie que certaines formes ou le comportement matériel complet ne sont pas modélisés.
- **Assembleur** et **Désassembleur** évaluent le code de génération et de décodage machine, pas la seule acceptation syntaxique par le parseur.
- **Tests = Partiel** signifie qu'il existe au moins des tests de simulation ou des vecteurs ciblés, mais pas une validation indépendante de toutes les formes et des deux sens d'encodage. `À faire` signifie qu'aucun test dédié suffisant n'a été identifié dans la suite actuelle.

Les statuts ont été confrontés aux éléments suivants de `index.html` : `specs` et `validateInstruction` (acceptation syntaxique), `execute` / `executeString` / `executeMultiplyDivide` (simulation), `encodingBytes` (assembleur) et `disassembleBytes` (désassembleur). Les tableaux `instructionMeta.support` sont informatifs et ne sont pas utilisés seuls comme preuve.

## 2. Matrice de couverture — 93 entrées canoniques

| Instruction | Documentation | Simulateur | Assembleur | Désassembleur | Tests |
|---|---|---|---|---|---|
| MOV | Oui | Oui | Partiel | Partiel | Partiel |
| XCHG | Oui | Oui | Oui | Oui | Partiel |
| LEA | Oui | Oui | Oui | Oui | À faire |
| LES | Oui | Oui | Oui | Oui | À faire |
| LDS | Oui | Oui | Oui | Oui | À faire |
| XLAT | Oui | Oui | Oui | Oui | Partiel |
| PUSH | Oui | Oui | Oui | Oui | Partiel |
| POP | Oui | Oui | Partiel | Partiel | Partiel |
| PUSHF | Oui | Oui | Oui | Oui | Partiel |
| POPF | Oui | Oui | Oui | Oui | Partiel |
| LAHF | Oui | Oui | Oui | Oui | Partiel |
| SAHF | Oui | Oui | Oui | Oui | Partiel |
| MOVSB | Oui | Oui | Non | Non | Partiel |
| MOVSW | Oui | Oui | Non | Non | Partiel |
| CMPSB | Oui | Oui | Non | Non | Partiel |
| CMPSW | Oui | Oui | Non | Non | Partiel |
| SCASB | Oui | Oui | Non | Non | Partiel |
| SCASW | Oui | Oui | Non | Non | Partiel |
| LODSB | Oui | Oui | Non | Non | Partiel |
| LODSW | Oui | Oui | Non | Non | Partiel |
| STOSB | Oui | Oui | Non | Non | Partiel |
| STOSW | Oui | Oui | Non | Non | Partiel |
| ADD | Oui | Oui | Partiel | Partiel | Partiel |
| ADC | Oui | Oui | Partiel | Partiel | Partiel |
| SUB | Oui | Oui | Partiel | Partiel | Partiel |
| SBB | Oui | Oui | Partiel | Partiel | Partiel |
| INC | Oui | Oui | Oui | Oui | Partiel |
| DEC | Oui | Oui | Oui | Oui | Partiel |
| NEG | Oui | Oui | Oui | Oui | Partiel |
| CMP | Oui | Oui | Partiel | Partiel | Partiel |
| MUL | Oui | Oui | Oui | Oui | Partiel |
| IMUL | Oui | Oui | Oui | Oui | Partiel |
| DIV | Oui | Oui | Oui | Oui | Partiel |
| IDIV | Oui | Oui | Oui | Oui | Partiel |
| AAA | Oui | Non | Non | Non | À faire |
| AAS | Oui | Non | Non | Non | À faire |
| AAM | Oui | Non | Non | Non | À faire |
| AAD | Oui | Non | Non | Non | À faire |
| DAA | Oui | Non | Non | Non | À faire |
| DAS | Oui | Non | Non | Non | À faire |
| CBW | Oui | Non | Non | Non | À faire |
| CWD | Oui | Non | Non | Non | À faire |
| AND | Oui | Oui | Partiel | Partiel | À faire |
| OR | Oui | Oui | Partiel | Partiel | À faire |
| XOR | Oui | Oui | Partiel | Partiel | À faire |
| NOT | Oui | Oui | Oui | Oui | Partiel |
| TEST | Oui | Oui | Partiel | Partiel | À faire |
| ROL | Oui | Non | Non | Non | À faire |
| ROR | Oui | Non | Non | Non | À faire |
| RCL | Oui | Non | Non | Non | À faire |
| RCR | Oui | Non | Non | Non | À faire |
| SHL | Oui | Oui | Non | Non | Partiel |
| SHR | Oui | Oui | Non | Non | Partiel |
| SAR | Oui | Non | Non | Non | À faire |
| JMP | Oui | Partiel | Partiel | Partiel | Partiel |
| CALL | Oui | Partiel | Partiel | Partiel | Partiel |
| RET | Oui | Partiel | Partiel | Partiel | Partiel |
| INT | Oui | Partiel | Non | Non | Partiel |
| INTO | Oui | Non | Non | Non | À faire |
| IRET | Oui | Partiel | Oui | Oui | Partiel |
| JCXZ | Oui | Non | Non | Non | À faire |
| LOOP | Oui | Oui | Oui | Oui | Partiel |
| LOOPE | Oui | Non | Non | Non | À faire |
| LOOPNE | Oui | Non | Non | Non | À faire |
| JO | Oui | Oui | Oui | Oui | À faire |
| JNO | Oui | Oui | Oui | Oui | À faire |
| JB | Oui | Oui | Oui | Oui | À faire |
| JAE | Oui | Oui | Oui | Oui | À faire |
| JE | Oui | Oui | Oui | Oui | À faire |
| JNE | Oui | Oui | Oui | Oui | À faire |
| JBE | Oui | Oui | Oui | Oui | À faire |
| JA | Oui | Oui | Oui | Oui | À faire |
| JS | Oui | Oui | Oui | Oui | À faire |
| JNS | Oui | Oui | Oui | Oui | À faire |
| JP | Oui | Oui | Oui | Oui | À faire |
| JNP | Oui | Oui | Oui | Oui | À faire |
| JL | Oui | Oui | Oui | Oui | À faire |
| JGE | Oui | Oui | Oui | Oui | À faire |
| JLE | Oui | Oui | Oui | Oui | À faire |
| JG | Oui | Oui | Oui | Oui | À faire |
| CLC | Oui | Oui | Oui | Oui | Partiel |
| STC | Oui | Oui | Oui | Oui | Partiel |
| CMC | Oui | Oui | Oui | Oui | Partiel |
| CLD | Oui | Oui | Oui | Oui | Partiel |
| STD | Oui | Oui | Oui | Oui | Partiel |
| CLI | Oui | Oui | Oui | Oui | Partiel |
| STI | Oui | Oui | Oui | Oui | Partiel |
| IN | Oui | Non | Non | Non | À faire |
| OUT | Oui | Non | Non | Non | À faire |
| NOP | Oui | Oui | Oui | Oui | À faire |
| HLT | Oui | Partiel | Oui | Oui | À faire |
| WAIT | Oui | Non | Non | Non | À faire |
| ESC | Oui | Non | Non | Non | À faire |

### Synthèse des statuts

| Composant | Oui | Partiel | Non / à faire |
|---|---:|---:|---:|
| Documentation (inventaire) | 93 | 0 | 0 |
| Simulateur | 62 | 6 | 25 |
| Assembleur | 35 | 15 | 43 |
| Désassembleur | 35 | 15 | 43 |
| Tests | 0 | 39 | 54 |

**Attention :** ces nombres sont des décomptes d'entrées canoniques, pas des pourcentages de formes d'opérandes. Une instruction marquée `Oui` au niveau d'un composant peut encore avoir des restrictions, des cas limites ou des cycles non validés. Les statuts « Oui » ne constituent pas un certificat d'équivalence avec un 8086 physique.

## 3. Constats techniques principaux

### 3.1 Simulateur

Le moteur interprète les principales familles arithmétiques/logiques, les transferts de données, les opérations de pile, les instructions de chaîne et plusieurs contrôles de flux. Il modélise également les interruptions au moyen de la directive pédagogique `VECTOR` et un service DOS limité.

Limites notables :
- `CALL` et `JMP` directs par étiquette et indirects near/far sont exécutés. `RET` et `RETF` restaurent respectivement IP et IP:CS. L'IP de l'interpréteur reste un indice logique d'instruction, pas un offset octet réel ; les cibles indirectes doivent donc viser un indice du programme analysé.
- `INT` est une simulation pédagogique des gestionnaires `VECTOR` et de quelques services ; ce n'est pas le matériel d'interruption complet.
- `HLT` termine l'exécution pédagogique ; il ne modélise pas le réveil matériel par interruption.
- `LOOPE`, `LOOPNE`, `JCXZ`, `IN`, `OUT`, `INTO`, `XLAT`, les ajustements ASCII/BCD, les rotations, `SAR`, `LAHF`, `SAHF`, `WAIT` et `ESC` ne sont pas exécutés. `NEG` est désormais simulé.

### 3.2 Assembleur

Le générateur binaire reste partiel. Il émet notamment MOV, arithmétique/logique, XCHG, LEA/LES/LDS, INC/DEC, pile, les groupes F6/F7 et les formes near indirectes FF /2 et /4.

Limites observées dans le code :
- Les groupes immédiats `80h/81h` sont générés pour l'arithmétique/logique ; la forme signée courte `83h` n'est pas générée.
- `MOV` ne couvre pas toutes les variantes/opcodes, notamment les formes accumulator/moffs dédiées.
- `PUSH MEM16` via FF /6 est généré pour les formes mémoire ; le registre utilise l'encodage compact `50+reg`. `POP r/m16` mémoire est généré via 8F /0 ; /1–/7 sont réservés.
- `JMP` et `CALL` directs restent assemblés en near relatif 16 bits ; les formes near indirectes FF /2 et /4 sont également générées. Les formes far indirectes ne sont pas assemblées.
- `RET` C2/C3 et `RETF` CA/CB sont générés, avec ou sans immédiat. Les formes far indirectes FF /3 et /5 sont assemblées via `FAR PTR [mem]`.
- Les groupes F6/F7 (TEST r/m, immédiat ; NOT, NEG, MUL, IMUL, DIV, IDIV) et FF /6 PUSH sont encodés. Les chaînes, `REP`, les E/S, shifts/rotations et plusieurs instructions fixes restent absents.

### 3.3 Désassembleur

Le décodeur reconnaît un sous-ensemble des familles précédentes, mais ne constitue pas un désassembleur universel 8086.

Limites observées :
- Les opcodes de chaîne et préfixes REP ne sont pas décodés comme instructions.
- Les formes near indirectes FF /2 et /4 sont décodées ; FF /3 et /5 sont décodées uniquement avec un opérande mémoire. Les formes short et directes far restent hors couverture.
- `RET` C2/C3 et `RETF` CA/CB sont désormais décodés, immédiats compris. Les extensions FF /3 et /5 restent décodées uniquement en mémoire.
- Les groupes F6/F7 et FF sont partiellement couverts ; les opcodes E/S, shifts/rotations, ajustements, `INT`, `INTO`, `WAIT`, `ESC`, `XLAT`, `LAHF` et `SAHF` restent hors couverture.
- Le décodage d'un opcode isolé ou d'une extension ModR/M non prise en charge doit rester strictement distingué d'une désassemblage complet : le décodeur peut émettre `DB` pour les octets qu'il ne sait pas interpréter.

## 4. Alias et préfixes — hors dénominateur

Les alias ne créent pas de nouvel opcode et ne sont pas comptés comme des instructions supplémentaires :

| Graphie principale | Alias ou graphies alternatives |
|---|---|
| SHL | SAL |
| JB | JC, JNAE |
| JAE | JNB, JNC |
| JE | JZ |
| JNE | JNZ |
| JBE | JNA |
| JA | JNBE |
| JP | JPE |
| JNP | JPO |
| JL | JNGE |
| JGE | JNL |
| JLE | JNG |
| JG | JNLE |
| LOOPE | LOOPZ |
| LOOPNE | LOOPNZ |
| REPE | REP, REPZ selon la forme et la convention d'assembleur |
| REPNE | REPNZ |
| WAIT | FWAIT (graphie d'assembleur) |
| XLAT | XLATB (graphie d'assembleur) |
| RET far | RETF (graphie d'assembleur) |

Les préfixes matériels sont suivis séparément :
- `LOCK` : préfixe de verrouillage, pas une opération autonome ;
- `REP` / `REPE` : préfixe `F3h` avec sémantique dépendante de l'instruction de chaîne ;
- `REPNE` : préfixe `F2h` ;
- les overrides de segment (`ES:`, `CS:`, `SS:`, `DS:`) sont des préfixes d'encodage, pas des instructions.

Le laboratoire accepte certains préfixes de segment dans ses formes mémoire, mais le désassembleur n'a pas une prise en charge complète de tous les préfixes et de leurs combinaisons.

## 5. Couverture des tests existants

- `tests/smoke.cjs` lance les **354 auto-tests** intégrés au laboratoire et vérifie le résultat global.
- `tests/instruction-vectors.cjs` ajoute maintenant **80 tests indépendants** (34 assemblage, 32 désassemblage, 1 flux tronqué et 13 simulation). Les vecteurs binaires fixes couvrent MOV, ADD, ADC, SUB, SBB et CMP ; les autres tests vérifient des résultats de simulation pour un sous-ensemble de cas.
- Les 80 vecteurs ne valident pas les 93 entrées ni toutes leurs formes. En particulier, l'assembleur et le désassembleur ne disposent pas encore d'une batterie indépendante complète instruction par instruction.
- Dernière validation CI vérifiée avant cet audit : run 214 réussi pour le commit `b3786905ac21d548bff1595b732c5216f26de436`, avec les étapes des tests de fumée et des vecteurs indépendants réussies.

## 6. Ordre recommandé pour la suite

1. **Fixer la référence canonique** : vérifier chaque opcode, alias, préfixe et restriction contre le manuel Intel 8086 Family User's Manual (octobre 1979) et le manuel MCS-86 Macro Assembly Language Reference Manual (septembre 1979).
2. **Construire un registre de formes** : une ligne par forme (direction, taille, r/m, registre, immédiat, implicite, ModR/M, extension /digit, déplacement, préfixe).
3. **Créer les vecteurs assembleur** : octets attendus indépendants pour chaque forme, y compris cas négatifs et encodages compacts.
4. **Créer les vecteurs désassembleur** : flux binaires fixes indépendants de l'assembleur, y compris flux tronqués, opcodes invalides et extensions non prises en charge.
5. **Valider le simulateur** : résultats, registres, mémoire, FLAGS modifiés/conservés/indéfinis et cas limites.
6. **Mesurer la couverture par forme**, pas seulement par mnémotechnique. Un taux global ne sera calculé qu'une fois le nombre total de formes canoniques vérifié et les statuts définis sans ambiguïté.

## 7. Sources de référence

- Intel, *8086 Family User's Manual*, octobre 1979 : https://www.inf.pucrs.br/~calazans/undergrad/orgcomp_EC/mat_microproc/intel-8086_family_Users_Manual.pdf
- Intel, *MCS-86 Macro Assembly Language Reference Manual*, septembre 1979 : https://mark-ogden.uk/files/intel/publications/9800640-02%20MCS-86%20Macro%20Assembly%20Language%20Reference%20Manual-Sep79.pdf
- Code audité : `index.html`, `tests/smoke.cjs`, `tests/instruction-vectors.cjs`, `.github/workflows/ci.yml`.

**Conclusion :** l'inventaire contient 93 entrées canoniques, mais le laboratoire n'offre pas une couverture complète du jeu d'instructions Intel 8086. Le simulateur couvre beaucoup plus de sémantique que l'assembleur et le désassembleur. Le prochain indicateur fiable sera le pourcentage de formes d'encodage testées indépendamment, et non le pourcentage de noms de mnémotechniques simplement présents.


## Mise à jour — premier registre de formes et extension des vecteurs

Le [registre de couverture par forme](form-coverage-register-8086.md) décompose MOV, ADD, ADC, SUB, SBB et CMP en **59 formes documentaires**. L'inspection des branches `encodingBytes` et `disassembleBytes` identifie 50 formes avec une voie de génération/décodage et 9 formes absentes : les quatre formes MOV moffs (A0h–A3h) et la forme 83h pour chacune des cinq opérations arithmétiques/comparaison.

La suite indépendante a été étendue de 40 à **80 tests**. Le run CI 221 du 24 novembre 2026 valide **354/354 tests de fumée et 80/80 vecteurs indépendants** : https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45441788838.

Attention : 50/59 mesure la présence de branches pour les formes recensées, pas le taux de validation. La matrice reste limitée à six mnémotechniques et ne représente pas le jeu d'instructions complet.


## Mise à jour ciblée — MOV, ADD, ADC, SUB, SBB et CMP

Le registre [form-coverage-register-8086.md](form-coverage-register-8086.md) a été actualisé après implémentation des quatre formes `MOV moffs` A0h–A3h et des cinq formes immédiates signées `83h`. Pour ces six mnémotechniques, les 59 formes du registre disposent maintenant d’une voie d’assemblage et de désassemblage. Cela ne signifie pas que toutes les combinaisons ModR/M et tous les déplacements sont exhaustivement validés.

Le champ S:W du manuel Intel 8086 (table 4-7) confirme que S=1 et W=1 étend l’immédiat de 8 bits à 16 bits ; l’opcode résultant du groupe est 83h. Il s’agit bien d’une forme du 8086, et non d’une extension 80186.

**CI 238** : 354/354 tests de fumée et 114/114 vecteurs indépendants réussis : https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45443738198.


## Mise à jour — groupes F6/F7, FF et C6/C7 (24 novembre 2026)

Les groupes ont été intégrés au générateur, au décodeur et, pour les opérations déjà interprétées, au simulateur. La nouvelle suite [tests/group-opcodes.cjs](../tests/group-opcodes.cjs) vérifie les encodages fixes, toutes les valeurs ModR/M pertinentes, les extensions réservées, les restrictions mémoire/registres, les flux tronqués et des résultats d'exécution indépendants.

- **F6/F7** : /0 TEST, /1 réservé, /2 NOT, /3 NEG, /4 MUL, /5 IMUL, /6 DIV, /7 IDIV. Les formes r/m sont générées et décodées ; les opérations prises en charge par l'interpréteur sont exécutées.
- **FF** : /0 INC, /1 DEC, /2 CALL near indirect (registre/mémoire), /3 CALL far indirect (mémoire seulement), /4 JMP near indirect (registre/mémoire), /5 JMP far indirect (mémoire seulement), /6 PUSH MEM16 (mémoire seulement selon la table Intel 8086), /7 réservé. Les formes /2, /4 et /6 mémoire sont générées et décodées ; /3 et /5 sont décodées en mémoire uniquement. L'interpréteur ne simule pas les transferts indirects CALL/JMP ; il les signale explicitement comme non pris en charge.
- **C6/C7** : /0 MOV r/m,imm valide ; /1..7 réservés. Les 256 valeurs ModR/M par opcode sont testées côté décodeur, avec conservation des octets des extensions invalides.

Audit détaillé : [audit-groupes-opcodes-8086.md](audit-groupes-opcodes-8086.md), qui précise les contraintes des extensions FF, y compris les formes mémoire uniquement.

**Validation CI vérifiée** : run 45452066068, commit testé `1b8fc8e8ed19655fba655e33a207e122a035b34f`. La suite de groupes atteint **1 358/1 358** réussites ; le total agrégé du workflow est **8 245 vérifications réussies, 0 échec**.


## Mise à jour — POP, RET et transferts indirects (24 novembre 2026)

Le laboratoire prend maintenant en charge :
- `POP r/m16` via `8F /0`, avec /1–/7 classés comme extensions réservées ;
- `RET` C3/C2 et `RETF` CB/CA, avec ou sans immédiat ;
- `CALL/JMP` indirects near via FF /2 et /4 ;
- `CALL/JMP` indirects far via FF /3 et /5, avec pointeur mémoire m16:16 ;
- la restauration de IP et CS, ainsi que l'ajustement de pile pair par mots suivis.

La suite dédiée comporte **304 vecteurs**. Le workflow CI [45482367409](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45482367409) a réussi sur le commit `04f7ee9c918f42cb7c25d8124ecf983ff0e9bcc4` : **8 549 vérifications réussies, 0 échec** au total.

Limite importante : dans l'interpréteur, IP est un indice logique d'instruction et non un offset octet dans un segment de code chargé. Les transferts indirects sont donc simulés dans ce modèle logique. Les formes RET/RETF avec ajustement impair restent encodées et décodées, mais leur exécution est refusée car le suivi pédagogique de pile travaille par mots.


## Mise à jour — branchements relatifs (24 novembre 2026)

L'assembleur prend maintenant en charge `EB rel8` pour les JMP directs courts, avec relaxation automatique vers `E9 rel16` lorsque la cible sort de l'intervalle court. Les déplacements near CALL/JMP sont normalisés sur 16 bits, et le désassembleur décode explicitement EB. Les 16 conditions Jcc et LOOP bénéficient d'une validation différentielle dédiée.

Nouvelle suite : [`tests/relative-branches.cjs`](../tests/relative-branches.cjs), **187 vecteurs réussis**.

Le workflow CI [45484177621](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45484177621) a réussi sur le commit `aa8b455e9cce132c0c437b2fc1f1ce30306b1f51` : **8 736 vérifications réussies, 0 échec** au total.

Limite maintenue : les offsets octet sont utilisés par l'assembleur et le désassembleur ; l'interpréteur utilise encore un indice logique d'instruction pour l'IP et les branches par étiquette.


## Mise à jour — cohérence des offsets binaires et du modèle d'exécution (24 novembre 2026)

L'interpréteur construit désormais, lorsque le programme entier est encodable, une table bidirectionnelle entre indice logique et offset binaire. IP est exposé en offset octet ; les branches directes, LOOP, CALL, les retours RET/RETF/IRET et les transferts indirects résolvent les cibles par cette table. Les adresses de retour empilées sont des offsets octet. Un segment de code de 65 536 octets permet le bouclage séquentiel FFFFh → 0000h.

Le mode d'exécution est indiqué dans `state.execution.mode` : `binary-offset` lorsque l'image est assemblable, ou `logical-fallback` lorsque le programme contient une forme hors du sous-ensemble encodable.

Nouvelle suite : [`byte-offset-execution.cjs`](../tests/byte-offset-execution.cjs), qui couvre les offsets, les branchements, CALL/RET et le rebouclage d'un segment complet de 64 Kio. Les tests de pile existants ont été adaptés pour utiliser des offsets binaires réels comme cibles des transferts indirects.

Limites : il ne s'agit pas encore d'un chargeur de binaire externe ni d'un émulateur complet. Les transferts FAR ne chargent pas des images de code distinctes par segment CS ; les offsets sont résolus dans l'image source courante. Les transferts indirects doivent viser une frontière d'instruction connue.

## Mise à jour — chargeur et exécution initiale d'un flux binaire (24 novembre 2026)

Ajout d'un chemin `executeBinary(bytes, CS, IP)` et de contrôles d'interface pour charger/exécuter les octets saisis ou importés depuis un fichier `.bin`. Le flux est placé en mémoire à l'adresse physique `((CS << 4) + IP) mod 1 048 576`. Le décodeur existant construit une carte des débuts d'instructions ; les branches relatives sont résolues à travers cette carte et les cibles non alignées sont refusées.

Nouvelle documentation : [audit du chargement binaire](audit-chargement-binaire-8086.md).

La suite `tests/byte-offset-execution.cjs` est étendue pour tester le chargement CS:IP, les branches, CALL/RET, le passage d'IP=FFFFh, les octets en mémoire et la comparaison source/binaire.

Limite fondamentale : cette première version effectue un décodage linéaire préalable. Elle ne lit pas encore chaque opcode depuis la mémoire au moment de son exécution et n'autorise pas encore les branchements vers des frontières découvertes dynamiquement. Ce sera le travail de la prochaine phase.


## Mise à jour — décodage dynamique depuis la mémoire (24 novembre 2026)

Le chemin d'exécution binaire utilise désormais une boucle `fetch → decode → execute`. À chaque instruction, il lit les octets à partir de `CS:IP` dans `cpu.mem`, demande au décodeur une seule ligne, exécute cette instruction, puis recommence au nouvel IP. Les branches relatives ne sont plus contraintes par les frontières d'un balayage linéaire préalable. Les écritures qui modifient les octets du code sont prises en compte lors du fetch suivant.

Nouvelle valeur `execution.mode` : `dynamic-binary`. Le compteur `decodedInstructions` indique les instructions effectivement décodées.

La suite `tests/byte-offset-execution.cjs` vérifie notamment une branche vers un octet qui était un immédiat dans le balayage linéaire, une modification du code par `MOV BYTE PTR` avec préfixe CS, les retours CALL/RET, le bouclage IP et la comparaison avec l'exécution source.

Limites : le décodeur/exécuteur reste un sous-ensemble du 8086 ; les formes non prises en charge sont refusées. La prélecture BIU, les cycles et les interactions bus ne sont pas simulés.

## Audit dynamique de cohérence mémoire — 24 novembre 2026

Le cycle binaire a été renforcé pour ne lire que des octets initialisés à partir de `CS:IP`. Le décodeur reçoit une fenêtre mémoire et ne produit qu'une instruction. Si cette instruction est incomplète, le décodeur signale le flux tronqué ; le fetch ne complète plus les octets manquants par `00h`.

La suite `tests/byte-offset-execution.cjs` ajoute :
- balayage de chacune des 256 valeurs d'opcode ;
- 3 072 combinaisons ModR/M sur 12 groupes d'opcodes ;
- limites IP, traversée de `FFFFh` et repli physique 20 bits ;
- préfixes CS, ES, SS et DS ;
- branchements positifs, négatifs, conditionnels et avec bouclage ;
- CALL/JMP indirects near et FAR ;
- modifications d'un et de deux octets de code ;
- vecteurs binaires indépendants et comparaison source/binaire.

Attention : les matrices attestent le comportement du décodeur sur les octets fournis ; elles ne certifient pas la validité architecturale ni l'exécution de tous les encodages possibles. Les limites de couverture et de modélisation matérielle sont détaillées dans `audit-chargement-binaire-8086.md`.


## Mise à jour — audit différentiel du moteur dynamique (24 novembre 2026)

La suite [`tests/dynamic-differential.cjs`](../tests/dynamic-differential.cjs) a été ajoutée au workflow CI. Elle compare le moteur source et le moteur binaire dynamique sur les registres, FLAGS, la pile, les sorties et des adresses mémoire ciblées. Elle ajoute des oracles indépendants pour ADD/ADC/SUB/SBB et des cas de logique, de branchement, de mémoire, de préfixes, de CALL/RET/RETF et d'IRET.

Résultat historique remplacé par l'audit étendu : **39/39 tests différentiels réussis**, 393 216 vecteurs arithmétiques exhaustifs 8 bits, 800 vecteurs 16 bits aux frontières, 1 350 exécutions binaires ALU sur octets bruts, 768 combinaisons registre-direct, 512 cas Jcc/FLAGS, huit modes d'adressage, quatre overrides de segment et un cycle logiciel INT/IVT/IRET. Run vérifié : [45505775488](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45505775488), commit testé `39b342f1611e5f323c951e02830f8274b7109839`.

Le registre [`registre-validation-dynamique-8086.md`](registre-validation-dynamique-8086.md) distingue les familles partiellement validées et celles non prises en charge. **Aucune instruction n'est classée entièrement validée au niveau de toutes ses formes 8086.** Le différentiel détecte des divergences entre chemins, mais certaines primitives sont partagées ; il ne remplace pas une référence indépendante exhaustive.


## Mise à jour — oracle ALU indépendant et IRET brut (24 novembre 2026)

Le chemin binaire dynamique accepte désormais un état initial explicite facultatif pour les tests : registres, FLAGS et octets mémoire 20 bits. Le schéma est strictement validé. `IRET` dépile les mots IP, CS et FLAGS directement depuis `SS:SP` lorsque la pile ne possède pas de métadonnées pédagogiques ; avec une pile typée, les contrôles de cohérence sont conservés.

Les tests incluent un cadre IRET brut en mémoire, un changement de CS, la restauration des FLAGS et le bouclage de SP sur 16 bits. Cela valide l'exécution de l'opcode IRET dans un environnement préinitialisé ; cela n'implémente pas la gestion complète de l'IVT ni les interruptions matérielles.

La validation arithmétique comprend un oracle indépendant pour ADD/ADC/SUB/SBB, un balayage exhaustif des couples 8 bits, des vecteurs de frontière 16 bits et des octets machine ALU fixes exécutés par le chemin binaire. Les moteurs source et binaire partagent encore certaines primitives ; la référence indépendante réduit cette dépendance pour l'ALU, sans constituer un modèle complet séparé du processeur.

L'IVT doit être initialisée explicitement dans la mémoire binaire ; le moteur ne simule pas les interruptions matérielles ni l'arbitrage du processeur d'interruptions. Les familles absentes restent absentes du moteur binaire. Aucun statut de validation globale ne doit être attribué à un mnémonique tant que toutes ses formes et contraintes 8086 ne sont pas couvertes.

## Extension du sous-ensemble binaire — 25 novembre 2026

Une passe d'implémentation couvre maintenant les familles précédemment absentes : LOOPE/LOOPNE/JCXZ, ajustements ASCII/BCD, CBW/CWD, rotations et décalages, IN/OUT, INTO, XLAT, LAHF/SAHF, WAIT, ESC et les préfixes REP/LOCK.

Les opcodes 8086 concernés sont intégrés à l'assembleur et au désassembleur ; l'exécution source et le fetch/décodage/exécution binaire prennent en charge les formes ciblées. Les chaînes sont répétées dynamiquement par CX et les conditions ZF appropriées ; IN/OUT utilisent une carte de ports logicielle initialisable explicitement.

**Limites qui restent importantes :** les ports ne représentent aucun périphérique matériel ; WAIT ne modélise pas l'entrée TEST ; ESC ne simule pas un coprocesseur 8087 ; LOCK ne produit aucune atomicité observable dans le moteur mono-thread ; les interactions arbitraires de préfixes et tous les vecteurs de FLAGS ne sont pas exhaustivement validés. Les familles nouvellement ajoutées restent donc marquées **partielles**.

Les tests spécialisés source/binaire et les validations CI associées déterminent le périmètre réellement vérifié. Cette extension ne constitue pas une certification d'émulation matérielle 8086 complète.

Le modèle d'E/S est maintenant utilisable dans les deux chemins : directive pédagogique PORT en source et table `initialState.io` en binaire. PORT reste une directive hors ISA ; elle ne doit pas être comptée comme une instruction 8086.

## Validation finale de l'extension des familles — 25 novembre 2026

Le workflow CI [45510201993](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45510201993) a terminé en **success** sur le commit `5386d592b773753b2e23eb3e2340d9279ead2a06`.

- Suite différentielle : **68/68 tests réussis**.
- Vecteurs indépendants : **114 tests réussis**.
- Oracle ALU : 393 216 cas 8 bits et 800 cas 16 bits.
- Décalages/rotations : 20 736 cas 8 bits et 504 cas 16 bits.
- Ajustements : 3 072 cas AAA/AAS/DAA/DAS, 256 AAM et 65 536 AAD.
- Extension de signe : 256 CBW et 65 536 CWD ; SAHF/LAHF : 32 combinaisons ; ESC : 64 codes.
- Les tests de formes comprennent les branches rel8 aux limites, les huit formes IN/OUT, les instructions de chaîne répétées, les overrides de segment, LOCK (y compris avec override ES), aliases LOOPZ/LOOPNZ, SAL et ESC mémoire, et INTO.

Les familles précédemment absentes sont désormais présentes dans les chemins ciblés de l'exécution source, de l'assembleur, du désassembleur et du moteur binaire. Elles restent classées **partielles** dans le registre : le modèle des ports est logiciel, WAIT ne simule pas TEST, ESC ne simule pas le coprocesseur, LOCK ne simule pas l'atomicité du bus, et les matrices exhaustives de toutes les formes/FLAGS/interactions de préfixes ne sont pas achevées.

Ce résultat valide les tests déclarés, pas l'exhaustivité matérielle de l'Intel 8086.


## Extension des tests structurels et correction des sélecteurs segment — 25 novembre 2026

Une batterie supplémentaire `tests/opcode-byte-sweep.cjs` est exécutée par CI. Elle balaie les 256 octets possibles en position d'opcode primaire, puis toutes les 256 valeurs ModR/M pour chacune des 67 familles ModR/M du décodeur, soit 17 152 combinaisons ModR/M et 17 408 flux vérifiés au total. Les assertions portent sur la robustesse du parseur, les frontières des instructions, les offsets continus et la consommation exacte du flux ; elles ne prétendent pas certifier la sémantique de chaque opcode.

Une anomalie de référence a également été corrigée : pour `MOV Sreg` (`8C`/`8E`), le champ segment est `0SR` (`/0` ES, `/1` CS, `/2` SS, `/3` DS) ; `/4` à `/7` ne sont pas utilisés. La référence Intel ASM86 indique que CS n'est pas une destination autorisée pour MOV : `8E /1` est donc rejeté, tandis que `8C /1` (lecture de CS vers r/m16) reste valide. Le décodeur, l'assembleur et les tests sont alignés sur cette distinction.

Le préfixe LOCK est désormais contrôlé de manière cohérente entre le désassembleur et le sous-ensemble de formes accepté par l'analyseur. Le verrouillage réel du bus, les autres maîtres de bus et l'atomicité matérielle ne sont toujours pas simulés.

Validation : run 45512297498 — commit `f0573072cf57ad741a0b6e33165f0ffa61d9cd75`, CI success.


## Audit ciblé des chaînes et interruptions — 25 novembre 2026

La suite différentielle vérifie désormais les dix formes MOVS/LODS/STOS/CMPS/SCAS en octet et en mot, les cas REP avec CX=0 et CX=1, les arrêts REPE/REPNE sur ZF, le parcours DF=1 avec override CS et le maintien de ES comme segment de destination. Deux exercices intégrateurs associent les chaînes, les branchements, la pile et INT/IRET.

Détail des vecteurs, règles de segment, limites restantes et résultats : [audit-chain-strings-8086.md](audit-chain-strings-8086.md).

CI vérifiée sur le commit `a3bb746b158c67e3f2ca8c45ea2df96a0ae4e0e5` : **78/78 tests différentiels**, **17 chapitres**, **34 questions**, **27 exercices** et toutes les corrections guidées validées. Les résultats restent limités aux scénarios explicitement testés ; ils ne certifient pas une émulation matérielle complète.


## Extension de l'audit des chaînes — 25 novembre 2026

Les tests ont été étendus aux bouclages 16 bits de SI/DI, au transfert de mots dont l'octet haut passe de FFFFh à 0000h, à la préservation des FLAGS par MOVS/LODS/STOS, aux FLAGS produits par CMPS/SCAS, aux overrides CS de LODS/CMPS et à la destination ES immuable de SCAS.

L'IVT binaire fait maintenant l'objet d'un contrôle supplémentaire du cadre mémoire réel (IP, CS, FLAGS), ainsi que de l'état IF/TF observé par le gestionnaire avant IRET. Les vecteurs d'encodage/désassemblage couvrent individuellement les dix opcodes de chaîne et les préfixes F2h/F3h, y compris CS + REP.

Résultats CI du commit `217c0a413c937d1248573e1f1f9f879c57d69ba6` : **143 vecteurs indépendants réussis**, **83 tests différentiels réussis, 0 échec**, et **27 corrections pédagogiques exécutables validées**. Détail : [audit-chain-strings-8086.md](audit-chain-strings-8086.md).

La politique de l'analyseur rejette explicitement les préfixes répétés de même catégorie et LOCK sur les instructions de chaîne. Cette politique de validation du laboratoire ne doit pas être confondue avec une modélisation complète de tous les cas de préfixes matériels.


## Audit indépendant de LAHF et SAHF — 25 novembre 2026

La suite dédiée `tests/lahf-sahf-8086.cjs` est maintenant intégrée au workflow CI.

- **LAHF : 32/32 combinaisons** des cinq indicateurs SF/ZF/AF/PF/CF transférées dans AH ; contrôle du bit 1 forcé et de la préservation de FLAGS.
- **SAHF : 256/256 valeurs de AH** ; contrôle des cinq indicateurs restaurés et de la préservation de OF, TF, IF et DF.
- Les deux chemins d'exécution (source assemblée et binaire dynamique) sont comparés sur les registres et les indicateurs.
- Encodages fixes contrôlés sur les octets indépendants `9Fh` (LAHF) et `9Eh` (SAHF), avec désassemblage brut et exécution binaire.
- Quatre formes syntaxiques avec opérandes superflus sont rejetées.

Résultat CI : [run 45592060463](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45592060463), commit `aaa1b499a3147b654a73cad6cbb4dc1b9ad131a0` — **298 réussis, 0 échec** pour la suite dédiée.

Les lignes LAHF/SAHF passent de « non prises en charge » à « présentes » pour le simulateur, l'assembleur et le désassembleur. Le statut de tests reste **Partiel** dans la matrice globale : la suite couvre de manière exhaustive les valeurs d'entrée pertinentes de ces deux instructions dans le modèle logiciel, mais ne constitue pas une comparaison avec un 8086 physique ou un émulateur indépendant complet.


## Audit indépendant de XLAT — 25 novembre 2026

La suite `tests/xlat-8086.cjs` est intégrée au workflow CI. L'inspection préalable a confirmé que XLAT était déjà implémentée dans le moteur source, l'assembleur, le désassembleur et le chemin binaire ; la matrice précédente sous-estimait donc l'état réel du code. La validation indépendante permet maintenant de documenter ce support sans le qualifier d'exhaustif.

- **Encodage/désassemblage : 9 contrôles** — opcode fixe `D7h`, frontières avec HLT et préfixes de segment ES (`26 D7`), CS (`2E D7`), SS (`36 D7`) et DS (`3E D7`).
- **Exécution source : 5 cas** — quatre sélecteurs de segment (DS explicite, ES, SS, CS) et DS par défaut.
- **Exécution binaire : 6 cas** — mêmes quatre sélecteurs, DS par défaut et rebouclage physique sur 20 bits.
- **FLAGS : 8 contrôles** — les neuf indicateurs représentés par le simulateur sont préchargés et vérifiés inchangés dans les chemins source et binaire.
- **Adresses : 3 contrôles** — addition BX+AL avec rebouclage 16 bits, sélection du segment et adresse physique 20 bits.
- **Rejets : 4 contrôles** — lecture d'un octet non initialisé en source et en binaire, et rejet de deux syntaxes avec opérandes superflus.

La suite vérifie notamment que `BX+AL` est ramené sur 16 bits avant la formation de l'adresse physique, que DS est le segment par défaut, que le préfixe explicite sélectionne le segment demandé et qu'une lecture non initialisée provoque une erreur au lieu de retourner implicitement zéro.

Les compteurs par dimension se recouvrent : les contrôles FLAGS et adresses sont inclus dans les cas d'exécution source/binaire et ne doivent pas être additionnés comme des tests distincts.\n\nRésultat : [workflow CI 45593318116](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45593318116), commit `50b982ca58e9b0cd4ae2d7e31c130876eb1f17ab` — **24 réussis, 0 échec** pour la suite XLAT ; workflow global **success**.

La matrice passe à « Oui » pour la présence dans le simulateur, l'assembleur et le désassembleur. Le statut des tests reste **Partiel** : les scénarios indépendants listés sont vérifiés, mais aucune comparaison complète avec un 8086 physique ou un émulateur matériel indépendant n'a été effectuée.


## Audit indépendant XCHG — 25 novembre 2026

La suite indépendante `tests/xchg-8086.cjs` est intégrée au workflow CI. Elle vérifie séparément les encodages, le désassemblage, les exécutions source et binaires, les FLAGS et les contraintes syntaxiques. Les contrôles ne constituent pas une preuve de fidélité électrique ou de comportement sur un processeur physique.

- **Paires registre-registre : 128 contrôles source** — les 8 registres 8 bits et les 8 registres 16 bits, avec les 64 paires ordonnées dans chaque largeur.
- **Encodages registres :** les formes ModR/M `86h` et `87h`, et la famille compacte `90h–97h` ; la génération des octets et le désassemblage sont contrôlés.
- **Mémoire : 18 contrôles de forme** — les huit modes effectifs 8086 en byte et word, le cas spécial `[BP]` encodé avec déplacement nul, ainsi que l'adressage direct `disp16`.
- **Préfixes de segment : 12 contrôles** — DS, ES, SS et CS dans les chemins source, assembleur/désassembleur et binaire. Les cas DS/SS par défaut sont également exercés dans la matrice des adresses effectives.
- **Exécution binaire : 152 contrôles** — les 64 paires 8 bits, les 64 paires 16 bits, les formes mémoire, les sélecteurs de segment et les cas spéciaux.
- **FLAGS : 302 vérifications imbriquées** — CF, PF, AF, ZF, SF, TF, IF, DF et OF sont contrôlés inchangés ; ce compteur recoupe les cas source et binaire.
- **Contraintes : 8 rejets** — mémoire-mémoire, immédiat, registres de segment et incompatibilités de taille.
- **Cas spéciaux :** `XCHG AX,AX` est assemblé en `90h`, dont le désassemblage canonique est `NOP` ; `XCHG AX,registre` utilise la famille compacte `90h–97h`.

Le 8086 active implicitement le verrouillage du bus pour un `XCHG` dont l'un des opérandes est en mémoire. Le laboratoire valide l'échange de données et l'encodage, mais ne simule ni le signal LOCK, ni l'arbitrage du bus, ni l'atomicité face à un autre maître de bus. L'acceptation syntaxique du préfixe explicite `LOCK` ne constitue pas une validation de ces propriétés matérielles.

Les compteurs par dimension se recouvrent : les contrôles FLAGS sont inclus dans les exécutions, et les contrôles d'encodage sont inclus dans les formes testées. Ils ne doivent pas être additionnés pour produire un nombre global de cas distincts.

Résultat : [workflow CI 45597601029](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45597601029), commit `4f78a8417aa1b10002a8a702f77cf933bd38f614` — **471 réussis, 0 échec** pour la suite XCHG ; workflow global **success**.

Le statut des tests passe à **Partiel** : les formes et chemins explicitement énumérés sont testés indépendamment, mais les séquences d'opcodes ne sont pas comparées à un processeur physique ni à un émulateur matériel indépendant. Le verrouillage implicite du bus reste hors du modèle logiciel.


---

# Actualisation de la matrice — 25 novembre 2026

**Branche audit :** `audit/niveau-3-chapitres-12-17`  
**Commit du moteur testé :** `a25dc8c2cfe832dfa525fd2c1b32714c5d40ab91`  
**CI :** [run 45676144779](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45676144779) — succès  
**Navigateur :** [run 45676144619](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45676144619) — succès

Cette section conserve les 93 mnémoniques comme inventaire de travail. Les statuts affichés sont provisoires : ils n'ont pas encore été réconciliés pour toutes les formes d'opérandes, tailles, extensions ModR/M, préfixes et chemins source/binaire. Les tableaux antérieurs restent un instantané historique. L'ancienne synthèse contenait déjà un écart arithmétique : ses lignes donnaient 66/6/21 pour le simulateur, et non 62/6/25.

## Convention de cette actualisation

- **Oui** : une voie de traitement est présente dans le composant.
- **Partiel** : une voie existe, mais le modèle ou la couverture de formes reste incomplet.
- **À faire** : aucune validation indépendante ciblée suffisante n'est établie.
- Une implémentation présente n'est pas une validation exhaustive. Les 17 152 balayages structurels vérifient la robustesse de décodage et la consommation des octets, pas la sémantique de chaque opcode.

## Matrice des 93 entrées

| Instruction | Simulateur | Assembleur | Désassembleur | Tests indépendants |
|---|---|---|---|---|
| MOV | Oui | Partiel | Partiel | Partiel |
| XCHG | Oui | Oui | Oui | Partiel |
| LEA | Oui | Oui | Oui | Partiel |
| LES | Oui | Oui | Oui | Partiel |
| LDS | Oui | Oui | Oui | Partiel |
| XLAT | Oui | Oui | Oui | Partiel |
| PUSH | Oui | Oui | Oui | Partiel |
| POP | Oui | Partiel | Partiel | Partiel |
| PUSHF | Oui | Oui | Oui | Partiel |
| POPF | Oui | Oui | Oui | Partiel |
| LAHF | Oui | Oui | Oui | Partiel |
| SAHF | Oui | Oui | Oui | Partiel |
| MOVSB | Oui | Oui | Oui | Partiel |
| MOVSW | Oui | Oui | Oui | Partiel |
| CMPSB | Oui | Oui | Oui | Partiel |
| CMPSW | Oui | Oui | Oui | Partiel |
| SCASB | Oui | Oui | Oui | Partiel |
| SCASW | Oui | Oui | Oui | Partiel |
| LODSB | Oui | Oui | Oui | Partiel |
| LODSW | Oui | Oui | Oui | Partiel |
| STOSB | Oui | Oui | Oui | Partiel |
| STOSW | Oui | Oui | Oui | Partiel |
| ADD | Oui | Partiel | Partiel | Partiel |
| ADC | Oui | Partiel | Partiel | Partiel |
| SUB | Oui | Partiel | Partiel | Partiel |
| SBB | Oui | Partiel | Partiel | Partiel |
| INC | Oui | Oui | Oui | Partiel |
| DEC | Oui | Oui | Oui | Partiel |
| NEG | Oui | Oui | Oui | Partiel |
| CMP | Oui | Partiel | Partiel | Partiel |
| MUL | Oui | Oui | Oui | Partiel |
| IMUL | Oui | Oui | Oui | Partiel |
| DIV | Oui | Oui | Oui | Partiel |
| IDIV | Oui | Oui | Oui | Partiel |
| AAA | Oui | Oui | Oui | Partiel |
| AAS | Oui | Oui | Oui | Partiel |
| AAM | Oui | Oui | Oui | Partiel |
| AAD | Oui | Oui | Oui | Partiel |
| DAA | Oui | Oui | Oui | Partiel |
| DAS | Oui | Oui | Oui | Partiel |
| CBW | Oui | Oui | Oui | Partiel |
| CWD | Oui | Oui | Oui | Partiel |
| AND | Oui | Partiel | Partiel | Partiel |
| OR | Oui | Partiel | Partiel | Partiel |
| XOR | Oui | Partiel | Partiel | Partiel |
| NOT | Oui | Oui | Oui | Partiel |
| TEST | Oui | Partiel | Partiel | Partiel |
| ROL | Oui | Oui | Oui | Partiel |
| ROR | Oui | Oui | Oui | Partiel |
| RCL | Oui | Oui | Oui | Partiel |
| RCR | Oui | Oui | Oui | Partiel |
| SHL | Oui | Oui | Oui | Partiel |
| SHR | Oui | Oui | Oui | Partiel |
| SAR | Oui | Oui | Oui | Partiel |
| JMP | Partiel | Partiel | Partiel | Partiel |
| CALL | Partiel | Partiel | Partiel | Partiel |
| RET | Partiel | Partiel | Partiel | Partiel |
| INT | Partiel | Oui | Oui | Partiel |
| INTO | Oui | Oui | Oui | À faire |
| IRET | Partiel | Oui | Oui | Partiel |
| JCXZ | Oui | Oui | Oui | Partiel |
| LOOP | Oui | Oui | Oui | Partiel |
| LOOPE | Oui | Oui | Oui | Partiel |
| LOOPNE | Oui | Oui | Oui | Partiel |
| JO | Oui | Oui | Oui | Partiel |
| JNO | Oui | Oui | Oui | Partiel |
| JB | Oui | Oui | Oui | Partiel |
| JAE | Oui | Oui | Oui | Partiel |
| JE | Oui | Oui | Oui | Partiel |
| JNE | Oui | Oui | Oui | Partiel |
| JBE | Oui | Oui | Oui | Partiel |
| JA | Oui | Oui | Oui | Partiel |
| JS | Oui | Oui | Oui | Partiel |
| JNS | Oui | Oui | Oui | Partiel |
| JP | Oui | Oui | Oui | Partiel |
| JNP | Oui | Oui | Oui | Partiel |
| JL | Oui | Oui | Oui | Partiel |
| JGE | Oui | Oui | Oui | Partiel |
| JLE | Oui | Oui | Oui | Partiel |
| JG | Oui | Oui | Oui | Partiel |
| CLC | Oui | Oui | Oui | Partiel |
| STC | Oui | Oui | Oui | Partiel |
| CMC | Oui | Oui | Oui | Partiel |
| CLD | Oui | Oui | Oui | Partiel |
| STD | Oui | Oui | Oui | Partiel |
| CLI | Oui | Oui | Oui | Partiel |
| STI | Oui | Oui | Oui | Partiel |
| IN | Oui | Oui | Oui | À faire |
| OUT | Oui | Oui | Oui | À faire |
| NOP | Oui | Oui | Oui | À faire |
| HLT | Partiel | Oui | Oui | À faire |
| WAIT | Partiel | Oui | Oui | À faire |
| ESC | Partiel | Oui | Oui | Partiel |

## État du décompte — non consolidé

Les 93 mnémoniques canoniques sont conservés comme inventaire de départ, mais les statuts de la matrice n'ont pas encore été réconciliés forme par forme sur la branche courante. Les anciens décomptes statiques sont historiques et ne doivent pas être repris comme chiffres actuels.

**Aucun décompte consolidé et aucun pourcentage global ne sont publiés à ce stade.** Pour chaque instruction, il faut encore distinguer :
- présence du chemin source ;
- formes d'opérandes et tailles acceptées ;
- émission assembleur ;
- désassemblage et consommation exacte des octets ;
- exécution binaire ;
- tests ciblés ;
- oracle indépendant ;
- restrictions architecturales et préfixes.

La matrice actuelle reste un registre de travail, pas un résultat chiffré. Le registre forme-par-forme est le support de la prochaine consolidation.

## Éléments de preuve dans le CI

Le workflow réussi a notamment exécuté :
- 143 vecteurs indépendants d'instructions ;
- 2 352 assertions de matrice ModR/M ;
- 17 152 combinaisons de balayage structurel opcode/ModR/M ;
- 3 412 contrôles différentiels FLAGS ;
- 275 contrôles de contraintes d'opérandes ;
- 1 358 contrôles de groupes F6/F7/FF/C6/C7 ;
- 305 contrôles de pile et de transferts ;
- les suites BCD, décalages/rotations, logique, NEG, LAHF/SAHF, XLAT, XCHG, LEA, LDS/LES, CALL indirect et branches ;
- des oracles indépendants rapportant 393 216 cas arithmétiques 8 bits, 800 cas frontières 16 bits, 1 350 vecteurs ALU binaires, 20 736 cas de décalages/rotations 8 bits, 504 cas 16 bits, 3 072 ajustements AAA/AAS/DAA/DAS, 256 AAM, 65 536 AAD, 256 CBW, 65 536 CWD, 32 cas LAHF/SAHF et 64 codes ESC.

Les nombres de plusieurs suites se recouvrent et ne doivent pas être additionnés comme s'il s'agissait d'entrées uniques.

## Limites qui empêchent encore la clôture de la phase 2

1. Le tableau ci-dessus compte des mnémotechniques, pas toutes les formes d'opérandes.
2. Les instructions de chaîne nécessitent encore une matrice indépendante DS:SI / ES:DI, DF, CX, préfixes REP et effets FLAGS, en source et en binaire.
3. IN/OUT sont simulés via un état de ports configurable, pas par un périphérique matériel.
4. WAIT et ESC n'émulent ni le coprocesseur 8087 ni ses signaux ; leur prise en charge reste partielle côté modèle.
5. CALL/JMP/RET ont des chemins testés, mais le moteur source utilise un IP logique et n'est pas un processeur matériel.
6. Les extensions ModR/M, tailles, formes invalides, préfixes, limites de déplacement et flux tronqués doivent être consignés forme par forme avant le calcul pondéré définitif.

**Conclusion :** cette matrice actualisée fournit un premier score traçable au niveau des 93 entrées. La phase 2 n'est pas clôturée : le registre forme-par-forme et le recalcul pondéré par formes restent obligatoires.


---

## Préfixe LOCK — actualisation du 25 novembre 2026

Le préfixe F0h est maintenant traité selon la documentation du 8086 : il peut précéder l'instruction suivante, et le verrouillage reste actif pendant tout le bloc d'une instruction de chaîne répétée. Le modèle logiciel ne simule pas le signal LOCK électrique ni l'arbitrage entre maîtres de bus.

Couverture ajoutée :
- `LOCK INC AX` : source, assemblage, désassemblage et exécution binaire ; le préfixe est accepté même si l'instruction ne protège aucune donnée mémoire partagée.
- `LOCK MOVSB` et `LOCK REP MOVSB` : assemblage, désassemblage, exécution source et binaire.
- `LOCK REP MOVSB` : vérification de CX, SI, DI, octets copiés et préservation des neuf FLAGS modélisés.
- `LOCK ADD`, `LOCK CMP`, `LOCK MOV` et `LOCK XCHG` : le désassembleur accepte le préfixe sur des formes mémoire et registre.
- `LOCK` combiné à un override de segment mémoire : contrôle différentiel existant.
- Préfixes REP répétés et overrides de segment répétés : toujours rejetés par les tests de contraintes.

Nouveaux contrôles :
- `tests/lock-prefix-8086.cjs`
- mise à jour de `tests/instruction-vectors.cjs`, `tests/xchg-8086.cjs` et `tests/dynamic-differential.cjs`
- étape CI dédiée « Run 8086 LOCK prefix and repeated string tests ».

**Limite :** cette actualisation valide l'acceptation et les effets fonctionnels du préfixe, pas le signal LOCK sur le bus. Les interactions exhaustives entre F0h, F2h/F3h, overrides de segment, flux tronqués et ordre de préfixes restent à inscrire dans le registre forme-par-forme. Aucun pourcentage global n'est calculé.


## Vérification CI des ajouts de transferts far et préfixes

Sur le commit de code `7c8f356771848c797825b78498d02438886976d2` :
- CI `45688448342` : succès ;
- audit navigateur `45688448597` : succès.

Le CI inclut désormais les tests dédiés `LOCK REP MOVSB`, `JMP FAR` direct et `JMP FAR` indirect sur huit modes mémoire, ainsi que la comparaison GNU as pour les formes far directes et les formes indirectes [BX]/[BX+SI]. La matrice générale reste provisoire et aucun pourcentage global n'est publié.


## Transferts de contrôle indirects — nouvelle validation

La passe de tests sur JMP complète la couverture précédente de CALL :
- `JMP r/m16` — `FF /4` : huit registres 16 bits et huit modes d'adressage mémoire, source et binaire.
- `JMP ptr16:16` — `EA` : far direct, CS:IP vérifiés en source et binaire.
- `JMP m16:16` — `FF /5` : huit modes mémoire, override ES, exécution vers un segment distinct.
- GNU as : comparaisons near indirect registre/mémoire, far direct et far indirect [BX]/[BX+SI].
- Les tests contrôlent SP, absence de cadre de retour pour JMP et neuf FLAGS modélisés.

Run CI `45689117952` : succès, y compris les tests directs et indirects JMP, les tests LOCK et la suite différentielle.

Cela ferme une tranche importante des transferts indirects, mais ne clôt pas la matrice des 93 instructions : les autres familles, formes et préfixes restent à réconcilier. Aucun pourcentage global n'est publié.

## Actualisation du registre des formes — 25 novembre 2026

Les 93 mnémoniques de cette matrice disposent maintenant d'un index de rapprochement vers leur famille de formes dans `docs/form-coverage-register-8086.md` (§15). La matrice par mnémonique ne constitue pas un score de couverture : ses statuts décrivent uniquement la présence ou le caractère partiel d'un chemin de base. La validation de toutes les formes, tailles, préfixes et restrictions reste suivie séparément.

Corrections et preuves nouvelles :
- Le groupe FF est décomposé extension par extension ; /0 INC MEM16, /1 DEC MEM16, /6 PUSH MEM16 et /3,/5 far sont mémoire uniquement ; /2 et /4 near acceptent registre ou mémoire ; /7 est non utilisé.
- Le désassembleur ne présente plus FF C0, FF C8 ou FF F0 comme INC AX, DEC AX ou PUSH AX : ces formes registre-direct sont conservées comme DB. Les formes registre utilisent les opcodes compacts 40–47, 48–4F et 50–57.
- Les tests group-opcodes, modrm-matrix, addressing-displacement et push-pop-forms contrôlent ces restrictions.
- CALL indirect et JMP indirect sont suivis séparément : FF /2 et FF /4 near r/m16 ; FF /3 et FF /5 far MEM16 ; les huit formes d'adressage, les overrides de segment et les neuf FLAGS modélisés sont vérifiés par les suites dédiées.

**Décision :** aucun pourcentage global n'est calculé. Le calcul pondéré attend la clôture des registres de formes pour les 93 entrées, y compris les interactions de préfixes et les chemins source/binaire.