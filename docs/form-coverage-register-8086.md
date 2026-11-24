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
| 7 | AL, moffs8 | A0 | Absent | Absent | Non |
| 8 | AX, moffs16 | A1 | Absent | Absent | Non |
| 9 | moffs8, AL | A2 | Absent | Absent | Non |
| 10 | moffs16, AX | A3 | Absent | Absent | Non |
| 11 | r8, imm8 | B0–B7 | Implémenté | Implémenté | Oui |
| 12 | r16, imm16 | B8–BF | Implémenté | Implémenté | Oui |
| 13 | r/m8, imm8 | C6 /0 | Implémenté | Implémenté | Oui |
| 14 | r/m16, imm16 | C7 /0 | Implémenté | Implémenté | Oui |

**Restrictions à conserver dans les tests négatifs :**
- `MOV Sreg,r/m16` ne permet pas CS comme destination.
- `C6` et `C7` exigent l'extension ModR/M `/0`.
- Les transferts immédiats vers un registre de segment ne sont pas une forme 8086 valide.
- Les formes moffs utilisent une adresse directe 16 bits ; elles ne sont pas équivalentes à une forme ModR/M avec registre de base.
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
| Groupe 83h, r/m16 + imm8 signé | Absent | Absent | À faire |

Le décompte de cette tranche est donc de **9 formes par instruction**, soit **45 formes arithmétiques/comparaison**. Huit formes sur neuf disposent d'une branche de génération et de décodage dans le sous-ensemble actuel ; la forme 83h reste absente pour les cinq instructions.

## 4. Vecteurs indépendants ajoutés

Le fichier `tests/instruction-vectors.cjs` a été étendu avec :
- six cas MOV supplémentaires : immédiat octet, mémoire directe vers registre, registre vers mémoire octet, immédiat vers mémoire mot, registre de segment vers ES et DS vers mémoire ;
- dix cas directionnels pour ADD/ADC/SBB/SUB/CMP avec opérandes mémoire ;
- quatre cas d'immédiat mot en mémoire couvrant ADD, ADC, SUB et CMP.

Les vecteurs du désassembleur utilisent des octets fixes écrits dans le test. Ils ne réutilisent pas la sortie de l'assembleur comme oracle. La suite ne couvre toujours pas toutes les variantes de ModR/M, tous les modes d'adressage, les déplacements signés, les préfixes, les opcodes moffs ni les groupes 83h.

## 5. Couverture calculable à ce stade

Le taux de couverture doit être calculé sur des unités explicites et ne pas mélanger présence du code et validation indépendante.

| Périmètre | Formes recensées | Génération assembleur | Décodage | Validation indépendante exhaustive |
|---|---:|---|---|---|
| MOV | 14 | 10 implémentées, 4 absentes | 10 implémentées, 4 absentes | Non |
| ADD | 9 | 8 implémentées, 1 absente | 8 implémentées, 1 absente | Non |
| ADC | 9 | 8 implémentées, 1 absente | 8 implémentées, 1 absente | Non |
| SBB | 9 | 8 implémentées, 1 absente | 8 implémentées, 1 absente | Non |
| SUB | 9 | 8 implémentées, 1 absente | 8 implémentées, 1 absente | Non |
| CMP | 9 | 8 implémentées, 1 absente | 8 implémentées, 1 absente | Non |
| **Total** | **59** | **50 implémentées, 9 absentes** | **50 implémentées, 9 absentes** | **Non** |

Ces pourcentages de présence de branches (50/59) ne sont **pas** des taux de validation. Une forme peut être implémentée mais insuffisamment testée. Inversement, un test isolé ne certifie pas tous les modes d'adressage et toutes les valeurs des champs ModR/M.

## 6. Travail restant sur cette tranche

1. Ajouter les cinq formes 83h avec extension de signe correcte, sans les confondre avec les formes 81h.
2. Ajouter les quatre formes moffs MOV (A0h–A3h) dans l'assembleur et le désassembleur.
3. Décliner les vecteurs sur registres, adresses effectives, disp8, disp16, adresse directe et préfixes de segment.
4. Ajouter les tests négatifs des extensions ModR/M invalides, des tailles incompatibles et des restrictions sur CS.
5. Étendre les tests simulateur pour AF, CF, OF, PF, SF et ZF avec cas limites 8 et 16 bits, sans attribuer une valeur aux indicateurs déclarés indéfinis par Intel.
6. Confirmer les restrictions et les timings forme par forme dans les tableaux primaires Intel avant de clôturer les fiches.

## 7. Portée de cette tranche

Cette tranche couvre la décomposition documentaire de six mnémotechniques, soit une petite partie de l'inventaire de 93 entrées. Elle ne vérifie pas encore tous les alias ni les autres familles d'instructions. Les modes d'adressage décrits ici sont des champs de forme ; le nombre réel d'encodages machine est bien plus élevé que le nombre de lignes du tableau.

Le simulateur reste un interpréteur pédagogique. Les vecteurs de cette tranche ne constituent pas une preuve de fidélité matérielle complète du 8086.
