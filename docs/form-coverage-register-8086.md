# Registre des formes d'encodage — première tranche

**Date :** 24 novembre 2026  
**Périmètre vérifié dans cette tranche :** `MOV`, `ADD`, `ADC`, `SUB`, `SBB`, `CMP`.  
**Référence de base :** Intel, *8086 Family User's Manual*, octobre 1979, chapitre 4 (formats d'instructions et codage), descriptions des instructions et table 2-21 pour les formes et temps indiqués. Le manuel d'assemblage MCS-86 de septembre 1979 sert à contrôler la syntaxe et les opérandes.  
**Statut :** registre de travail détaillé, pas une certification de toutes les formes du processeur.

Sources :
- [Intel 8086 Family User's Manual (octobre 1979)](https://www.inf.pucrs.br/~calazans/undergrad/orgcomp_EC/mat_microproc/intel-8086_family_Users_Manual.pdf)
- [Intel MCS-86 Macro Assembly Language Reference Manual (septembre 1979)](https://mark-ogden.uk/files/intel/publications/9800640-02%20MCS-86%20Macro%20Assembly%20Language%20Reference%20Manual-Sep79.pdf)

## 1. Convention de statut

- **Implémenté** : une branche de génération ou de décodage existe pour cette forme.
- **Absent** : le générateur ou le décodeur ne traite pas cette forme.
- **Test ciblé** : au moins un vecteur indépendant porte sur cette forme ou sur une variante représentative. Cela ne prouve pas toutes les valeurs ModR/M, tous les modes d'adressage ni tous les déplacements.
- Les statuts sont établis par inspection de `encodingBytes`, `disassembleBytes` et de `tests/instruction-vectors.cjs`. Ils ne sont pas déduits du seul parseur ni des métadonnées des fiches.

## 2. MOV — 14 formes distinguées

| # | Forme Intel | Opcode | Assembleur | Désassembleur | Test indépendant ciblé |
|---:|---|---|---|---|---|
| 1 | r/m8, r8 | 88 /r | Implémenté | Implémenté | Oui |
| 2 | r/m16, r16 | 89 /r | Implémenté | Implémenté | Oui |
| 3 | r8, r/m8 | 8A /r | Implémenté | Implémenté | Oui |
| 4 | r16, r/m16 | 8B /r | Implémenté | Implémenté | Oui |
| 5 | r/m16, Sreg | 8C /r | Implémenté | Implémenté | Oui |
| 6 | Sreg, r/m16 | 8E /r | Implémenté | Implémenté | Oui |
| 7 | AL, moffs8 | A0 | Implémenté | Implémenté | Oui |
| 8 | AX, moffs16 | A1 | Implémenté | Implémenté | Oui |
| 9 | moffs8, AL | A2 | Implémenté | Implémenté | Oui |
| 10 | moffs16, AX | A3 | Implémenté | Implémenté | Oui |
| 11 | r8, imm8 | B0–B7 | Implémenté | Implémenté | Oui |
| 12 | r16, imm16 | B8–BF | Implémenté | Implémenté | Oui |
| 13 | r/m8, imm8 | C6 /0 | Implémenté | Implémenté | Oui |
| 14 | r/m16, imm16 | C7 /0 | Implémenté | Implémenté | Oui |

**Restrictions à conserver dans les tests négatifs :**
- `MOV CS,r/m16` via `8E /1` n'est pas une forme autorisée par la référence Intel ASM86 ; `MOV r/m16,CS` via `8C /1` reste une lecture valide de CS. Les sélecteurs `/4` à `/7` sont non utilisés, pas des alias à compter comme formes canoniques.
- `C6` et `C7` exigent l'extension ModR/M `/0`.
- Les transferts immédiats vers un registre de segment ne sont pas une forme 8086 valide.
- Les formes moffs utilisent une adresse directe 16 bits ; elles ne sont pas équivalentes à une forme ModR/M avec registre de base. L’assembleur les sélectionne pour les formes directes non qualifiées avec AL/AX ; une qualification BYTE/WORD PTR explicite conserve la voie ModR/M.
- Les préfixes de segment doivent être testés séparément des opcodes de base.

## 3. ADD, ADC, SUB, SBB et CMP — 9 formes par instruction

Les cinq instructions partagent la même structure d'encodage. Le champ `reg` du ModR/M identifie l'opération dans les groupes immédiats.

| Forme | ADD | ADC | SBB | SUB | CMP |
|---|---:|---:|---:|---:|---:|
| r/m8, r8 | 00 /r | 10 /r | 18 /r | 28 /r | 38 /r |
| r/m16, r16 | 01 /r | 11 /r | 19 /r | 29 /r | 39 /r |
| r8, r/m8 | 02 /r | 12 /r | 1A /r | 2A /r | 3A /r |
| r16, r/m16 | 03 /r | 13 /r | 1B /r | 2B /r | 3B /r |
| AL, imm8 | 04 ib | 14 ib | 1C ib | 2C ib | 3C ib |
| AX, imm16 | 05 iw | 15 iw | 1D iw | 2D iw | 3D iw |
| r/m8, imm8 | 80 /digit ib | 80 /digit ib | 80 /digit ib | 80 /digit ib | 80 /digit ib |
| r/m16, imm16 | 81 /digit iw | 81 /digit iw | 81 /digit iw | 81 /digit iw | 81 /digit iw |
| r/m16, imm8 sign-extended | 83 /digit ib | 83 /digit ib | 83 /digit ib | 83 /digit ib | 83 /digit ib |

Extensions ModR/M :
- ADD : `/0`
- ADC : `/2`
- SBB : `/3`
- SUB : `/5`
- CMP : `/7`

| Forme | Assembleur | Désassembleur | État des vecteurs indépendants |
|---|---|---|---|
| Quatre formes ModR/M directionnelles (8/16 bits) | Implémenté | Implémenté | Vecteurs ajoutés pour les deux directions en mot ; les deux directions octet restent à ajouter |
| AL/AX, immédiat | Implémenté | Implémenté | Vecteurs ciblés présents, couverture à compléter par largeur et instruction |
| Groupe 80h, r/m8 + imm8 | Implémenté | Implémenté | Quelques cas ciblés ; matrice complète à faire |
| Groupe 81h, r/m16 + imm16 | Implémenté | Implémenté | Vecteurs ajoutés pour les cinq extensions, couverture mémoire/registre à compléter |
| Groupe 83h, r/m16 + imm8 signé | Implémenté | Implémenté | Vecteurs indépendants ajoutés pour les cinq extensions |

Le décompte de cette tranche est de **9 formes par instruction**, soit **45 formes arithmétiques/comparaison**. Les neuf formes de chacune des cinq instructions disposent maintenant d’une branche de génération et de décodage.

## 4. Vecteurs indépendants ajoutés

Le fichier `tests/instruction-vectors.cjs` a été étendu avec :
- six cas MOV supplémentaires : immédiat octet, mémoire directe vers registre, registre vers mémoire octet, immédiat vers mémoire mot, registre de segment vers ES et DS vers mémoire ;
- dix cas directionnels pour ADD/ADC/SBB/SUB/CMP avec opérandes mémoire ;
- quatre cas d'immédiat mot en mémoire couvrant ADD, ADC, SUB et CMP.

Les vecteurs du désassembleur utilisent des octets fixes écrits dans le test. Ils ne réutilisent pas la sortie de l'assembleur comme oracle. La suite comprend maintenant **114 vecteurs indépendants** ; le run CI 238 valide les 114/114 vecteurs ainsi que les 354/354 tests de fumée. Les cas ajoutés couvrent les cinq extensions 83h, les quatre opcodes moffs A0h–A3h, les overrides de segment, les déplacements disp8/disp16 et des cas de FLAGS. Ils ne couvrent toujours pas toutes les combinaisons de champs ModR/M, toutes les valeurs de déplacement ni l’ensemble des cas limites du simulateur.

## 5. Couverture calculable à ce stade

Le taux de couverture doit être calculé sur des unités explicites et ne pas mélanger présence du code et validation indépendante.

| Périmètre | Formes recensées | Génération assembleur | Décodage | Validation indépendante exhaustive |
|---|---:|---|---|---|
| MOV | 14 | 14 implémentées | 14 implémentées | Non |
| ADD | 9 | 9 implémentées | 9 implémentées | Non |
| ADC | 9 | 9 implémentées | 9 implémentées | Non |
| SBB | 9 | 9 implémentées | 9 implémentées | Non |
| SUB | 9 | 9 implémentées | 9 implémentées | Non |
| CMP | 9 | 9 implémentées | 9 implémentées | Non |
| **Total** | **59** | **59 implémentées** | **59 implémentées** | **Non** |

La présence de branches (59/59) n’est **pas** un taux de validation exhaustive. Une forme peut être implémentée mais insuffisamment testée. Inversement, un test isolé ne certifie pas tous les modes d'adressage et toutes les valeurs des champs ModR/M.

## 6. Travail restant sur cette tranche

1. Décliner les vecteurs sur les combinaisons ModR/M registre-direct, base/index, disp8, disp16 et adresse directe.
2. Ajouter des tests négatifs systématiques pour les extensions ModR/M invalides et les tailles incompatibles ; vérifier le rejet de `MOV CS` comme destination et conserver les sélecteurs 4..7 comme non utilisés.
3. Compléter les cas limites simulateur pour AF, CF, OF, PF, SF et ZF en 8 et 16 bits, sans attribuer de valeur aux indicateurs indéfinis.
4. Confirmer les restrictions et timings forme par forme dans les tableaux primaires Intel avant de clôturer les fiches.

## 7. Portée de cette tranche

Cette tranche couvre la décomposition documentaire de six mnémotechniques, soit une petite partie de l'inventaire de 93 entrées. Elle ne vérifie pas encore tous les alias ni les autres familles d'instructions. Les modes d'adressage décrits ici sont des champs de forme ; le nombre réel d'encodages machine est bien plus élevé que le nombre de lignes du tableau.

Le simulateur reste un interpréteur pédagogique. Les vecteurs de cette tranche ne constituent pas une preuve de fidélité matérielle complète du 8086.


### Validation automatisée du premier lot

**Run CI 221 — 24 novembre 2026** : [résultats GitHub Actions](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45441788838), commit `62f6ad45b146ede7168b76dab21c507352c668dd`.

- Tests de fumée : **354/354 réussis**.
- Vecteurs indépendants : **80/80 réussis**.
- Détail : 34 assemblage, 32 désassemblage, 1 flux tronqué, 13 simulation.
- Aucun changement du moteur CPU, de l'assembleur ou du désassembleur dans ce lot ; seules les suites de tests et les documents ont été étendus.

Ce résultat valide les cas ajoutés, pas toutes les combinaisons d'opérandes des 59 formes recensées.


## Mise à jour — implémentation des formes 83h et MOV moffs

Le groupe `83h` est bien présent dans le codage 8086 : le champ `S:W = 11` indique un immédiat de 8 bits étendu en signe vers 16 bits (table 4-7 du manuel Intel 8086 Family, octobre 1979). L’assembleur sélectionne désormais `83h` pour les opérandes mot dont l’immédiat est compris entre −128 et +127 ; hors de cette plage, il conserve `81h`. Le désassembleur lit l’octet immédiat comme une valeur signée.

Les quatre formes `MOV moffs` (`A0h`–`A3h`) sont maintenant encodées et décodées. Pour préserver les cas ModR/M explicites déjà utilisés dans le laboratoire, l’assembleur choisit moffs pour les formes directes non qualifiées avec AL/AX ; une qualification BYTE/WORD PTR explicite conserve la forme ModR/M.

**Validation CI 238** : [354/354 tests de fumée et 114/114 vecteurs indépendants réussis](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45443738198). Cela valide les cas ajoutés, mais ne certifie pas toutes les combinaisons d’adressage et de FLAGS.
