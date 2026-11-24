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
| XCHG | Oui | Oui | Oui | Oui | À faire |
| LEA | Oui | Oui | Oui | Oui | À faire |
| LES | Oui | Oui | Oui | Oui | À faire |
| LDS | Oui | Oui | Oui | Oui | À faire |
| XLAT | Oui | Non | Non | Non | À faire |
| PUSH | Oui | Oui | Partiel | Partiel | Partiel |
| POP | Oui | Oui | Partiel | Partiel | Partiel |
| PUSHF | Oui | Oui | Oui | Oui | Partiel |
| POPF | Oui | Oui | Oui | Oui | Partiel |
| LAHF | Oui | Non | Non | Non | À faire |
| SAHF | Oui | Non | Non | Non | À faire |
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
| INC | Oui | Oui | Oui | Oui | À faire |
| DEC | Oui | Oui | Oui | Oui | À faire |
| NEG | Oui | Non | Non | Non | À faire |
| CMP | Oui | Oui | Partiel | Partiel | Partiel |
| MUL | Oui | Oui | Non | Non | Partiel |
| IMUL | Oui | Oui | Non | Non | Partiel |
| DIV | Oui | Oui | Non | Non | Partiel |
| IDIV | Oui | Oui | Non | Non | Partiel |
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
| NOT | Oui | Oui | Non | Non | À faire |
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
- `JMP`, `CALL` et `RET` sont limités aux formes proches par étiquette ; les transferts lointains et indirects ne sont pas un modèle complet.
- `INT` est une simulation pédagogique des gestionnaires `VECTOR` et de quelques services ; ce n'est pas le matériel d'interruption complet.
- `HLT` termine l'exécution pédagogique ; il ne modélise pas le réveil matériel par interruption.
- `LOOPE`, `LOOPNE`, `JCXZ`, `IN`, `OUT`, `INTO`, `XLAT`, `NEG`, les ajustements ASCII/BCD, les rotations, `SAR`, `LAHF`, `SAHF`, `WAIT` et `ESC` ne sont pas exécutés.

### 3.2 Assembleur

Le générateur binaire est volontairement partiel. Il émet notamment des formes de MOV, arithmétique/logique, XCHG, LEA/LES/LDS, INC/DEC, pile, sauts conditionnels courts et quelques opcodes fixes.

Limites observées dans le code :
- Les groupes immédiats `80h/81h` sont générés pour l'arithmétique/logique ; la forme signée courte `83h` n'est pas générée.
- `MOV` ne couvre pas toutes les variantes/opcodes, notamment les formes accumulator/moffs dédiées.
- `PUSH r/m16` et `POP r/m16` mémoire ne sont pas générés ; seules les formes registre et certains registres de segment le sont.
- `JMP` et `CALL` sont assemblés en near relatif 16 bits ; les formes short/far et indirectes ne sont pas couvertes.
- `RET` ne génère que le retour proche sans ajustement de pile ; les formes far et avec immédiat manquent.
- Les chaînes, `REP`, les E/S, les opérations MUL/DIV, NOT, shifts/rotations et la plupart des instructions fixes ne sont pas encodés.

### 3.3 Désassembleur

Le décodeur reconnaît un sous-ensemble des familles précédentes, mais ne constitue pas un désassembleur universel 8086.

Limites observées :
- Les opcodes de chaîne et préfixes REP ne sont pas décodés comme instructions.
- Les formes `JMP` short/far/indirect et `CALL` far/indirect ne sont pas décodées.
- Les formes `RET` far et avec ajustement de pile ne sont pas décodées.
- Les opcodes E/S, MUL/DIV, shifts/rotations, ajustements, `INT`, `INTO`, `WAIT`, `ESC`, `XLAT`, `LAHF` et `SAHF` ne sont pas couverts.
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
