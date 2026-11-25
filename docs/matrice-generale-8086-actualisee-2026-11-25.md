# Matrice générale 8086 — actualisation sur la branche d'audit

**Dépôt :** `GLLR-Spirit/Intel-8086`  
**Branche et commit contrôlés :** `audit/niveau-3-chapitres-12-17`, `a25dc8c2cfe832dfa525fd2c1b32714c5d40ab91`  
**Date :** 25 novembre 2026  
**Périmètre :** les 93 entrées canoniques de l'inventaire existant, hors alias, directives, préfixes et instructions postérieures au 8086.

> Cette version actualise les statuts d'implémentation visibles dans le code et les suites de test du commit indiqué. Elle reste une matrice **au niveau des mnémoniques** : elle ne certifie pas chaque forme d'opérande, chaque combinaison ModR/M ni chaque interaction de préfixes. Les pourcentages ci-dessous sont donc des indicateurs de présence/couverture de test, pas un pourcentage de conformité matérielle complète.

## 1. Convention

- **Oui** : une voie de traitement existe dans le composant concerné.
- **Partiel** : la voie existe, mais le modèle ou les formes couvertes ont une limite connue.
- **Non / À faire** : voie absente ou non confirmée dans le code audité.
- **Tests indépendants — Partiel** : une suite dédiée ou des vecteurs indépendants existent, mais la validation exhaustive de toutes les formes et conditions n'est pas démontrée.
- Les balayages structurels de 256 opcodes et de 17 152 combinaisons ModR/M ne prouvent pas la sémantique de toutes les instructions.

## 2. Matrice des 93 entrées

| Instruction | Simulateur | Assembleur | Désassembleur | Tests indépendants |
|---|---|---|---|---|
| MOV | Oui | Oui | Partiel | Partiel |
| XCHG | Oui | Oui | Oui | Partiel |
| LEA | Oui | Oui | Oui | Partiel |
| LES | Oui | Oui | Oui | Partiel |
| LDS | Oui | Oui | Oui | Partiel |
| XLAT | Oui | Oui | Oui | Partiel |
| PUSH | Oui | Oui | Oui | Partiel |
| POP | Oui | Oui | Partiel | Partiel |
| PUSHF | Oui | Oui | Oui | Partiel |
| POPF | Oui | Oui | Oui | Partiel |
| LAHF | Oui | Oui | Oui | Partiel |
| SAHF | Oui | Oui | Oui | Partiel |
| MOVSB | Oui | Oui | Oui | Non |
| MOVSW | Oui | Oui | Oui | Non |
| CMPSB | Oui | Oui | Oui | Non |
| CMPSW | Oui | Oui | Oui | Non |
| SCASB | Oui | Oui | Oui | Non |
| SCASW | Oui | Oui | Oui | Non |
| LODSB | Oui | Oui | Oui | Non |
| LODSW | Oui | Oui | Oui | Non |
| STOSB | Oui | Oui | Oui | Non |
| STOSW | Oui | Oui | Oui | Non |
| ADD | Oui | Oui | Partiel | Partiel |
| ADC | Oui | Oui | Partiel | Partiel |
| SUB | Oui | Oui | Partiel | Partiel |
| SBB | Oui | Oui | Partiel | Partiel |
| INC | Oui | Oui | Oui | Partiel |
| DEC | Oui | Oui | Oui | Partiel |
| NEG | Oui | Oui | Oui | Partiel |
| CMP | Oui | Oui | Partiel | Partiel |
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
| AND | Oui | Oui | Partiel | Partiel |
| OR | Oui | Oui | Partiel | Partiel |
| XOR | Oui | Oui | Partiel | Partiel |
| NOT | Oui | Oui | Oui | Oui |
| TEST | Oui | Oui | Partiel | Partiel |
| ROL | Oui | Oui | Oui | Partiel |
| ROR | Oui | Oui | Oui | Partiel |
| RCL | Oui | Oui | Oui | Partiel |
| RCR | Oui | Oui | Oui | Partiel |
| SHL | Oui | Oui | Oui | Partiel |
| SHR | Oui | Oui | Oui | Partiel |
| SAR | Oui | Oui | Oui | Partiel |
| JMP | Oui | Partiel | Partiel | Partiel |
| CALL | Oui | Partiel | Partiel | Partiel |
| RET | Oui | Partiel | Partiel | Partiel |
| INT | Oui | Oui | Oui | Partiel |
| INTO | Oui | Oui | Oui | Non |
| IRET | Oui | Partiel | Oui | Partiel |
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
| IN | Oui | Oui | Oui | Non |
| OUT | Oui | Oui | Oui | Non |
| NOP | Oui | Oui | Oui | Oui |
| HLT | Oui | Oui | Oui | Oui |
| WAIT | Partiel | Oui | Oui | Non |
| ESC | Partiel | Oui | Oui | Partiel |

## 3. Décompte actualisé

| Domaine | Oui | Partiel | Non / à faire | Couverture d'implémentation pondérée* |
|---|---:|---:|---:|---:|
| Simulateur | 91 | 2 | 0 | 98.9 % |
| Assembleur | 89 | 4 | 0 | 97.8 % |
| Désassembleur | 79 | 14 | 0 | 92.5 % |
| Tests indépendants | 3 | 76 | 14 | 44.1 % |

\* **Score indicatif** : Oui = 1 ; Partiel = 0,5 ; Non/À faire = 0. Chaque entrée canonique a le même poids à ce niveau. Ce score ne pondère pas encore la complexité des formes d'opérandes ; il ne doit donc pas être présenté comme le score global final du laboratoire.

**Moyenne provisoire des quatre composants :** 83.3 %.

Cette moyenne est volontairement qualifiée de **provisoire**. Le futur indicateur final devra être recalculé après le registre forme-par-forme (opcodes, largeurs, opérandes, extensions ModR/M, déplacements, préfixes, limites et validation indépendante). Les poids seront alors fondés sur le nombre de formes architecturales recensées, et non sur le seul nombre de noms d'instructions.

## 4. Preuves exécutées sur le commit

Workflow CI [45676144779](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45676144779) : succès. Workflow navigateur [45676144619](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45676144619) : succès.

Le CI a notamment exécuté :
- 143 vecteurs indépendants d'instructions ;
- 2 352 assertions de matrice ModR/M ;
- 17 152 combinaisons de balayage structurel opcode/ModR/M ;
- 3 412 contrôles différentiels FLAGS ;
- 275 contrôles de contraintes d'opérandes ;
- 1 358 contrôles de groupes F6/F7/FF/C6/C7 ;
- 305 contrôles de pile et de transferts ;
- les suites dédiées BCD, décalages/rotations, logique, NEG, LAHF/SAHF, XLAT, XCHG, LEA, LDS/LES, CALL indirect et branches ;
- un audit différentiel indépendant rapportant 393 216 cas arithmétiques 8 bits, 800 cas frontières 16 bits, 1 350 vecteurs ALU binaires, 20 736 cas de décalages/rotations 8 bits, 504 cas 16 bits, 3 072 ajustements AAA/AAS/DAA/DAS, 256 AAM, 65 536 AAD, 256 CBW, 65 536 CWD, 32 cas LAHF/SAHF et 64 codes ESC.

Les totaux des différents fichiers ne doivent pas être additionnés aveuglément : certains vecteurs se recouvrent et certains tests vérifient plusieurs propriétés sur un même cas.

## 5. Corrections de statut notables depuis l'ancienne matrice

- Les ajustements BCD/ASCII, CBW/CWD, rotations et SAR ne sont plus absents du simulateur ; leurs voies d'assemblage et de décodage sont présentes.
- JCXZ, LOOPE, LOOPNE et INTO sont présents dans les chemins audités.
- IN/OUT sont assemblés, désassemblés et simulés au moyen d'un état de ports configurable ; ce n'est pas une interface matérielle réelle.
- WAIT et ESC sont reconnus et encodés/décodés. Le simulateur ne modélise pas le coprocesseur 8087 ni ses signaux TEST ; leur simulation reste donc partielle.
- Les instructions de chaîne sont reconnues par le simulateur et les chemins d'encodage/décodage ; les tests indépendants doivent encore vérifier systématiquement les règles DS:SI / ES:DI, DF, CX et les préfixes REP sur les deux chemins d'exécution.
- CALL/JMP/RET restent partiels au niveau global : les chemins near/far ont des tests dédiés, mais le moteur source reste un modèle logique et ne remplace pas l'exécution matérielle.

## 6. Limites et suite obligatoire

1. Construire le registre de formes architecturales pour les 93 entrées : chaque opcode, largeur, forme registre/mémoire/immédiat, groupe ModR/M, restrictions, préfixes et déplacements.
2. Pour chaque forme, distinguer séparément : présente dans le simulateur, assemblée, désassemblée, exécutée en source, exécutée en binaire, testée avec oracle indépendant, comparée à une référence indépendante.
3. Revoir chaque statut « Oui » à la lumière de tests négatifs et des cas limites. Une branche de code seule n'est pas une validation.
4. Recalculer le score pondéré à partir du nombre de formes et du niveau de validation, puis publier les scores par famille et le score global.
5. Ne pas annoncer une certification 8086 physique : BIU, prélecture, cycles, arbitrage de bus, signaux électriques et coprocesseur restent hors du modèle.

## 7. Références liées

- Inventaire : [instruction-inventory-8086.md](instruction-inventory-8086.md)
- Ancien audit statique : [coverage-audit-8086.md](coverage-audit-8086.md) (à considérer comme historique pour les statuts antérieurs)
- Registre des formes : [form-coverage-register-8086.md](form-coverage-register-8086.md)
- Audit CALL indirect : [audit-call-indirect-8086.md](audit-call-indirect-8086.md)
