# Audit des groupes d'opcodes F6/F7, FF et C6/C7 — 8086

**Date :** 24 novembre 2026  
**Périmètre :** encodage, décodage, contraintes ModR/M, extensions réservées et exécution pédagogique des formes prises en charge.

## 1. Référence architecturale

La classification est établie à partir du *Intel 8086 Family User's Manual*, octobre 1979, table 4-13 (guide de décodage machine), notamment les lignes F6/F7, C6/C7 et FF. La table indique explicitement les extensions « not used » et les formes FF à opérande mémoire ou registre/mémoire.

- [Intel 8086 Family User's Manual — PDF, table 4-13, pages imprimées 4-33 à 4-35](https://www.inf.pucrs.br/~calazans/undergrad/orgcomp_EC/mat_microproc/intel-8086_family_Users_Manual.pdf)
- [Intel ASM86 Assembly Language Reference Manual, juin 1985 — sections MOV et PUSH](https://mark-ogden.uk/files/intel/publications/122385-001%20ASM86%20Assembly%20Language%20Reference%20Manual-Jun85.pdf)

## 2. Groupe F6/F7 — opérations unaires et TEST

| Extension | Instruction 8 bits | Instruction 16 bits | Statut 8086 |
|---|---|---|---|
| /0 | TEST r/m8, imm8 | TEST r/m16, imm16 | Valide |
| /1 | — | — | Réservée / non utilisée |
| /2 | NOT r/m8 | NOT r/m16 | Valide |
| /3 | NEG r/m8 | NEG r/m16 | Valide |
| /4 | MUL r/m8 | MUL r/m16 | Valide |
| /5 | IMUL r/m8 | IMUL r/m16 | Valide |
| /6 | DIV r/m8 | DIV r/m16 | Valide |
| /7 | IDIV r/m8 | IDIV r/m16 | Valide |

### Couverture du laboratoire

- Génération F6/F7 pour NOT, NEG, MUL, IMUL, DIV et IDIV, en 8 et 16 bits.
- TEST r/m,imm utilise /0 ; les formes accumulateur AL/AX peuvent être optimisées vers A8/A9.
- Décodage de toutes les extensions /0 et /2 à /7.
- /1 est conservée comme donnée brute ; elle n'est pas confondue avec une instruction valide non prise en charge.
- L'interpréteur exécute NOT, NEG, MUL, IMUL, DIV et IDIV. TEST utilise la logique d'exécution déjà présente.
- Les vecteurs d'exécution vérifient le résultat de NEG, le produit implicite de MUL/IMUL et les quotient/reste de DIV/IDIV. Les indicateurs indéfinis ne sont pas utilisés comme critères de réussite.

## 3. Groupe FF — INC, DEC, transferts indirects et PUSH

| Extension | Forme 8086 | Contrainte d'opérande | Couverture |
|---|---|---|---|
| /0 | INC MEM16 | Mémoire | Décodée ; encodage mémoire déjà présent |
| /1 | DEC MEM16 | Mémoire | Décodée ; encodage mémoire déjà présent |
| /2 | CALL near | Registre 16 bits ou mémoire 16 bits | Assemblage et désassemblage |
| /3 | CALL far | Mémoire uniquement (pointeur intersegment) | Désassemblage mémoire |
| /4 | JMP near | Registre 16 bits ou mémoire 16 bits | Assemblage et désassemblage |
| /5 | JMP far | Mémoire uniquement (pointeur intersegment) | Désassemblage mémoire |
| /6 | PUSH MEM16 | Mémoire uniquement dans la table 8086 utilisée ici | Assemblage, désassemblage et exécution |
| /7 | — | — | Réservée / non utilisée |

### Restrictions importantes

- /2 et /4 acceptent le mode registre-direct (mod=11) et les formes mémoire.
- /3 et /5 sont des transferts far indirects : un opérande registre-direct est invalide.
- /6 est traité comme mémoire uniquement conformément à la forme MEM16 de la table Intel 8086 ; PUSH d'un registre utilise l'encodage compact 50h+reg.
- /7 reste invalide pour les quatre modes ModR/M.
- Pour /0 et /1, le décodeur traite les formes FF mémoire ; les variantes registre utilisent les opcodes compacts INC/DEC. Les formes registre-direct FF /0 et /1 sont rendues comme données brutes dans cette version.

### Limite d'exécution assumée

Les formes near indirectes CALL/JMP sont assemblées et désassemblées, mais l'interpréteur pédagogique ne simule pas encore leur transfert de contrôle. Il émet une erreur explicite « non encore prise en charge » au lieu de traiter le registre ou l'opérande mémoire comme une étiquette. Les formes far indirectes sont décodées, mais ne sont pas assemblées ni exécutées.

PUSH MEM16 via FF /6 est exécuté et vérifié avec un cycle PUSH mémoire / POP registre.

## 4. Groupes C6/C7 — MOV immédiat vers r/m

| Opcode | Extension /digit | Forme | Statut |
|---|---|---|---|
| C6 | /0 | MOV r/m8, imm8 | Valide |
| C6 | /1 à /7 | — | Réservées / non utilisées |
| C7 | /0 | MOV r/m16, imm16 | Valide |
| C7 | /1 à /7 | — | Réservées / non utilisées |

Les modes registre et mémoire de /0 sont décodés. L'assembleur produit les formes mémoire C6/C7 ; les transferts immédiats vers les registres généraux utilisent leurs encodages dédiés B0h–BFh. Pour /1 à /7, le décodeur conserve l'ensemble des octets de l'instruction invalide sous forme DB, immédiat compris.

## 5. Batterie de tests

Fichier principal : [tests/group-opcodes.cjs](../tests/group-opcodes.cjs)

| Domaine | Vecteurs |
|---|---:|
| F6/F7 — matrices ModR/M et encodages fixes | 544 |
| FF — matrices ModR/M, encodages et contraintes | 273 |
| C6/C7 — matrices ModR/M et encodages | 516 |
| Exécution indépendante | 10 |
| Flux tronqués | 15 |
| **Total** | **1 358** |

La suite vérifie notamment :
- toutes les combinaisons ModR/M des deux opcodes F6/F7 ;
- les huit valeurs d'extension et les formes mémoire pour chaque mode d'adressage ;
- les 256 valeurs ModR/M de FF, y compris les restrictions registre/mémoire ;
- les 256 valeurs ModR/M de C6 et les 256 de C7 ;
- les octets exacts pour des vecteurs assembleur indépendants ;
- les extensions réservées, les formes invalides et les flux tronqués ;
- les résultats d'exécution et les limites explicitement non simulées.

## 6. Résultat CI

Workflow : [Validate Intel 8086 Lab — run 45452066068](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45452066068)  
Commit testé : 1b8fc8e8ed19655fba655e33a207e122a035b34f  
Statut : **success**.

| Suite | Vérifications réussies |
|---|---:|
| Smoke | 354 |
| Vecteurs indépendants | 114 |
| Matrice ModR/M | 2 352 |
| Adressage mémoire | 54 |
| Déplacements | 35 |
| Extensions de groupes existantes | 98 |
| FLAGS différentiel | 3 412 |
| Contraintes d'opérandes | 274 |
| Sélecteurs segment historiques | 194 |
| Nouveaux groupes F6/F7, FF, C6/C7 | 1 358 |
| **Total agrégé** | **8 245** |

Aucun échec dans ce workflow.

## 7. Ce que cette phase ne certifie pas

- Elle ne transforme pas le laboratoire en émulateur matériel complet.
- Elle ne valide pas l'exécution des CALL/JMP indirects ou far.
- Elle ne prétend pas que chaque forme mémoire a été exécutée avec tous les états possibles.
- Les résultats de division sont testés sur des cas valides ; les scénarios de dépassement et de division par zéro nécessitent une phase distincte sur les interruptions et les exceptions pédagogiques.
- Les effets FLAGS indéfinis des opérations MUL/IMUL/DIV/IDIV ne sont pas comparés comme s'ils avaient une valeur architecturale définie.

**Règle de maintenance :** chaque extension doit être classée d'après la référence 8086 avant de choisir entre assemblage, décodage, exécution, conservation en DB ou rejet.
