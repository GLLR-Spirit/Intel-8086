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


---

## 8. Deuxième tranche — transferts de contrôle et opérandes indirects (25 novembre 2026)

Cette tranche s'appuie sur les tests ciblés dédiés aux appels, retours, branchements et transferts indirects. Elle distingue les formes encodées de leur profondeur de validation.

| Instruction | Forme Intel | Opcode / extension | Assembleur | Désassembleur | Exécution source et binaire | Preuve ciblée |
|---|---|---|---|---|---|---|
| CALL near | relatif rel16 | E8 cw | Implémenté | Implémenté | Testé | `call-ret-8086`, GNU as |
| CALL near indirect | r/m16 | FF /2 | Implémenté | Implémenté | Testé | Registres et mémoire, formes d'adressage |
| CALL far direct | ptr16:16 | 9A cd | Implémenté | Implémenté | Testé | CS:IP et cadre de pile |
| CALL far indirect | m16:16 | FF /3 | Implémenté | Implémenté | Testé | Mémoire seule, huit modes d'adressage, préfixes |
| JMP short | relatif rel8 | EB cb | Implémenté | Implémenté | Testé | Bornes rel8 |
| JMP near | relatif rel16 | E9 cw | Implémenté | Implémenté | Testé | Déplacement rel16 |
| JMP near indirect | r/m16 | FF /4 | Implémenté | Implémenté | Testé source et binaire | Huit registres et huit modes mémoire ; CS:IP, SP, FLAGS ; GNU as [AX]/[BX]/[BX+SI] |
| JMP far direct | ptr16:16 | EA cd | Implémenté | Implémenté | Testé source et binaire | `jmp-far-8086`, GNU as ; CS:IP, SP et FLAGS |
| JMP far indirect | m16:16 | FF /5 | Implémenté | Implémenté | Testé source et binaire, huit modes | `jmp-far-indirect-8086` ; CS:IP, SP et neuf FLAGS ; GNU as pour [BX] et [BX+SI] |
| RET near | sans immédiat / imm16 | C3 / C2 iw | Implémenté | Implémenté | Testé | Pile, SP et nettoyage impair |
| RETF | sans immédiat / imm16 | CB / CA iw | Implémenté | Implémenté | Testé | CS:IP, SP et nettoyage impair |
| Jcc | rel8, 16 conditions | 70–7F cb | Implémenté | Implémenté | Testé | Conditions et limites |
| LOOP | rel8 | E2 cb | Implémenté | Implémenté | Testé | CX, FLAGS et cible |
| LOOPE / LOOPZ | rel8 | E1 cb | Implémenté | Implémenté | Testé | CX et ZF |
| LOOPNE / LOOPNZ | rel8 | E0 cb | Implémenté | Implémenté | Testé | CX et ZF |
| JCXZ | rel8 | E3 cb | Implémenté | Implémenté | Testé | CX préservé et cible |

**Attention :** la mention « testé » signifie que les chemins concernés ont des vecteurs ciblés dans les suites nommées. Elle ne remplace pas une matrice de toutes les valeurs de déplacement, de tous les modes d'adressage et de toutes les formes invalides.

## 9. Transferts, adresses effectives et pointeurs far

| Instruction | Forme Intel | Opcode / extension | État ciblé |
|---|---|---|---|
| XCHG | r/m8,r8 et r/m16,r16 | 86 /r, 87 /r | Source, assembleur, désassembleur et binaire testés ; formes registre et mémoire |
| XCHG AX,r16 | échange avec AX | 90–97 | Encodages dédiés et round-trip testés |
| LEA | r16,m | 8D /r | Calcul d'offset et absence de lecture mémoire testés |
| LDS | r16,m16:16 | C5 /r | Offset, segment et ordre little-endian testés |
| LES | r16,m16:16 | C4 /r | Offset, segment et ordre little-endian testés |
| XLAT | AL ← DS:[BX+AL] | D7 | Source, binaire, segment override et préservation FLAGS testés |

## 10. Chaînes et préfixes — première matrice fonctionnelle

| Forme | Opcode | État actuel | Limite à conserver |
|---|---|---|---|
| MOVSB / MOVSW | A4 / A5 | Test fonctionnel | Matrice complète DF, segments et limites mémoire à compléter |
| CMPSB / CMPSW | A6 / A7 | Test fonctionnel ciblé | FLAGS, préfixes et parcours inversé à étendre |
| STOSB / STOSW | AA / AB | Test fonctionnel ciblé | Limites et parcours inversé à étendre |
| LODSB / LODSW | AC / AD | Test fonctionnel ciblé | Préfixes et parcours inversé à étendre |
| SCASB / SCASW | AE / AF | Test fonctionnel ciblé | FLAGS, REPE/REPNE et limites à étendre |
| REP / REPE / REPNE | F3 / F2 | Test fonctionnel | Combinaisons et interruptions entre itérations à documenter |
| LOCK | F0 | Source, assembleur, désassembleur et binaire testés | Le signal LOCK et l'arbitrage du bus ne sont pas simulés |

Le préfixe LOCK est accepté devant l'instruction suivante, y compris `LOCK REP MOVSB`. Le test vérifie le flux `F0 F3 A4`, les octets transférés, CX, SI, DI et la préservation des neuf FLAGS modélisés. Cela valide le comportement logiciel observable, pas l'atomicité matérielle du bus.

## 11. Reste à auditer avant tout score global

1. Compléter les formes de toutes les instructions restantes, en distinguant formes implicites, registres, mémoire, immédiats, accumulateur et pointeurs far.
2. Relever chaque extension ModR/M autorisée, non utilisée et invalide pour chaque groupe.
3. Étendre les matrices aux huit modes d'adressage, déplacements absents/disp8/disp16, limites et adresses directes.
4. Auditer les interactions des préfixes F0/F2/F3 et des overrides CS/DS/ES/SS, y compris ordre, répétitions et flux tronqués.
5. Associer chaque forme à des tests source, assembleur, désassembleur, binaire et, lorsque possible, à un oracle indépendant.
6. Ne calculer le score pondéré qu'une fois ces unités recensées et les règles de pondération publiées.

Aucun pourcentage global n'est calculé dans cette tranche.


---

## 12. Troisième tranche — familles arithmétiques, logiques et décalages

Les formes ci-dessous sont les formes architecturales de référence à suivre. La colonne « preuves » nomme des suites existantes ; elle ne signifie pas que chaque combinaison d'opérandes a déjà un oracle indépendant.

| Famille | Formes / opcodes 8086 à inventorier | Preuves présentes | Validation restante |
|---|---|---|---|
| AND | r/m8,r8 ; r/m16,r16 ; r8/r16,r/m ; AL/AX,imm ; r/m8/16,imm (80/81/83) | `logical-ops-8086`, `logical-prefix-interactions-8086.cjs` | Matrice directionnelle, tous modes mémoire, extensions et préfixes |
| OR | mêmes formes directionnelles et immédiates ; groupe 80/81/83 /1 | `logical-ops-8086`, `logical-prefix-interactions-8086.cjs` | Toutes combinaisons source/destination, immédiats et préfixes |
| XOR | mêmes formes directionnelles et immédiates ; groupe 80/81/83 /6 | `logical-ops-8086`, `logical-prefix-interactions-8086.cjs` | Toutes combinaisons, préfixes et AF indéfini |
| TEST | r/m8,r8 (84 /r), r/m16,r16 (85 /r), AL/AX,imm (A8/A9), r/m8/16,imm (F6/F7 /0) | `logical-ops-8086`, `group-opcodes`, `logical-prefix-interactions-8086.cjs` | Toutes formes mémoire, immédiats, overrides et contraintes |
| NOT | r/m8 (F6 /2), r/m16 (F7 /2) | `group-opcodes`, `not-forms-8086.cjs`, balayage ModR/M | 16 formes registre, 48 formes mémoire, préfixes et FLAGS |
| INC / DEC | r16 (40–4F), r/m8 (FE /0,/1), r/m16 (FF /0,/1) | `instruction-vectors`, `group-opcodes`, `unary-arithmetic-prefix-8086.cjs`, FLAGS différentiels | Chaque registre, mémoire, préfixes et limites |
| NEG | r/m8 (F6 /3), r/m16 (F7 /3) | `neg-8086`, `group-opcodes` | Toutes formes mémoire, limites 80h/8000h, FLAGS |
| MUL / IMUL | r/m8 (F6 /4,/5), r/m16 (F7 /4,/5) ; accumulateurs implicites AL/AX et résultats AX/DX:AX | `bcd-multiply-divide`, `mul-div-memory` | Toutes formes registre/mémoire, produits limites et flags indéfinis |
| DIV / IDIV | r/m8 (F6 /6,/7), r/m16 (F7 /6,/7) ; dividendes implicites AX ou DX:AX | `divide-error-interrupt`, `mul-div-memory` | Toutes formes, quotient maximal, signe, division par zéro et retour d'interruption |
| ROL / ROR / RCL / RCR | r/m8/16, compte 1 ou CL ; groupes D0–D3 | `shift-rotate-8086`, vecteurs FLAGS | Tous groupes, registres/mémoire, CF initial et counts CL |
| SHL / SAL / SHR / SAR | r/m8/16, compte 1 ou CL ; groupes D0–D3 | `shift-rotate-8086`, contraintes d'opérandes | Toutes formes et cas CL=0, CL>1 ; pas de C0/C1 sur 8086 |
| AAA / AAS / AAM / AAD / DAA / DAS | opcodes implicites sans ModR/M | `bcd-multiply-divide`, oracles arithmétiques | Cas limites et FLAGS non définis par instruction |
| CBW / CWD | opcodes implicites 98 / 99 | `bcd-multiply-divide` | Vérifier la préservation des autres registres et flags sur les deux chemins |

### Règles de validation à ne pas confondre

- Le balayage des 256 valeurs d'opcode et des octets ModR/M valide la robustesse du décodeur ; il ne remplace pas l'oracle sémantique de chaque instruction.
- Pour les groupes F6/F7, le champ `Reg` est une extension d'opcode : les sélecteurs /0 à /7 doivent être classés par instruction et par taille.
- Les formes de décalage à immédiat 8 bits C0/C1 ne font pas partie du 8086 original ; le compteur est 1 implicite ou CL. Les rejets de C0/C1 doivent être conservés.
- Pour MUL/IMUL/DIV/IDIV, la taille de l'opérande explicite détermine le registre implicite, la largeur du résultat et les destinations quotient/reste.
- Les FLAGS indéfinis ne doivent pas être comparés à une valeur fixe dans les oracles indépendants.

## 13. Familles restantes à décomposer

Les groupes suivants sont recensés, mais leur décompte forme-par-forme reste à faire avant tout score :

- Transferts et pile : PUSH/POP, PUSHF/POPF, MOV segment, LEA, LDS/LES, XCHG, XLAT, LAHF/SAHF.
- Chaînes : MOVS, CMPS, STOS, LODS, SCAS en octet/mot, DF et combinaisons REP/REPE/REPNE.
- Entrées/sorties : IN/OUT avec port immédiat ou DX, octet ou mot.
- Interruptions et contrôle : INT imm8, INT3, INTO, IRET, HLT, WAIT, ESC, NOP, CLI/STI et instructions CLC/STC/CMC/CLD/STD.
- Préfixes : F0, F2, F3 et overrides 26/2E/36/3E, seuls et combinés, y compris ordre, répétitions et flux tronqués.

La phase 2 demeure ouverte : aucune somme de mnémoniques ou de suites exécutées n'est convertie en pourcentage global tant que ces familles ne sont pas décomposées en formes vérifiables.


---

## 14. Quatrième tranche — pile, interruptions, E/S et instructions de contrôle

| Famille | Formes 8086 | Encodages | État des tests |
|---|---|---|---|
| PUSH registre | AX/CX/DX/BX/SP/BP/SI/DI | 50–57 | Tests de pile et contraintes |
| POP registre | AX/CX/DX/BX/SP/BP/SI/DI | 58–5F | Tests de pile et contraintes |
| PUSH segment | ES, CS, SS, DS | 06, 0E, 16, 1E | Tests de pile ciblés |
| POP segment | ES, SS, DS ; pas POP CS | 07, 17, 1F | Tests négatifs et pile |
| PUSH mémoire 16 bits | mémoire uniquement (`MEM16`) | FF /6 | Groupe FF, matrice ModR/M et tests de pile |
| POP r/m16 | registre ou mémoire | 8F /0 | Groupe 8F et tests de pile |
| PUSHF / POPF | FLAGS vers/de la pile | 9C / 9D | Contrôle de FLAGS et pile |
| INT imm8 | vecteur immédiat | CD ib | Tests d'interruption logicielle |
| INT3 | vecteur 3 | CC | Vecteurs ciblés |
| INTO | condition OF | CE | Vecteurs conditionnels |
| IRET | retour IP, CS, FLAGS | CF | Tests de cadre et pile |
| IN AL/AX, imm8 | port immédiat | E4 / E5 | Tests ciblés E/S |
| IN AL/AX, DX | port DX | EC / ED | Tests ciblés E/S |
| OUT imm8, AL/AX | port immédiat | E6 / E7 | Tests ciblés E/S |
| OUT DX, AL/AX | port DX | EE / EF | Tests ciblés E/S |
| CLC / STC / CMC | CF | F8 / F9 / F5 | Vecteurs FLAGS |
| CLD / STD | DF | FC / FD | Vecteurs FLAGS et chaînes |
| CLI / STI | IF | FA / FB | Vecteurs FLAGS et contrôle |
| LAHF / SAHF | AH et FLAGS | 9F / 9E | Suite dédiée et préservation |
| NOP / HLT / WAIT | implicites | 90 / F4 / 9B | Tests ciblés ; WAIT reste partiel |
| ESC | ModR/M | D8–DF | Encodage et décodage ciblés ; aucun 8087 simulé |

**Restrictions 8086 à préserver :**
- Les instructions PUSH immédiat (68/6A) sont postérieures au 8086 original et ne doivent pas être présentées comme formes 8086.
- POP CS n'est pas une forme valide.
- POP r/m16 exige l'extension `8F /0`.
- PUSH r/m16 utilise `FF /6`.
- L'espace de ports reste adressé sur 16 bits ; le champ immédiat des formes E4–E7 ne porte que 8 bits.
- Les instructions ESC transmettent une opération au coprocesseur ; l'existence d'un décodage ne signifie pas qu'un 8087 est émulé.
- WAIT dépend du signal TEST du coprocesseur ; le modèle logiciel n'émule pas ce signal.

Les lignes de ce tableau sont une liste de formes à valider, pas un décompte de formes toutes certifiées. Les tests existants sont ciblés ; il reste à relier chaque ligne à une preuve indépendante propre, en source et en binaire lorsque cela a un sens.


### 14.1 JMP far direct — ajout validé

La forme `JMP FAR ptr16:16` est maintenant implémentée dans le parseur, l'assembleur, le désassembleur et les chemins source/binaire. L'opcode EA encode l'offset puis le segment, chacun little-endian. Le test vérifie :
- encodage `EA offset-low offset-high segment-low segment-high` ;
- désassemblage en `JMP FAR segment:offset` ;
- saut source vers une autre valeur de CS et offset exact ;
- saut binaire vers du code placé dans un segment distinct ;
- absence de cadre de retour sur la pile ;
- préservation des neuf FLAGS modélisés ;
- comparaison octet par octet avec GNU as via `ljmp`.

Preuve dédiée : `tests/jmp-far-8086.cjs` et extension de `tests/call-ret-gnu-crosscheck.cjs`. La validation finale dépend du run CI qui inclut cette extension GNU as.


### 14.2 JMP far indirect — huit modes validés

La forme `JMP FAR PTR m16:16` est testée avec les huit formes d'adressage mémoire du 8086 : `[BX+SI]`, `[BX+DI]`, `[BP+SI]`, `[BP+DI]`, `[SI]`, `[DI]`, `[BP]` et `[BX]`.

Pour chaque forme, le test vérifie :
- l'extension FF /5 et le décodage en pointeur far mémoire ;
- l'exécution source et binaire ;
- le chargement de l'offset puis du segment ;
- le segment cible et l'offset après l'instruction cible ;
- l'absence d'empilement d'une adresse de retour ;
- la préservation des neuf FLAGS modélisés.

Preuve : `tests/jmp-far-indirect-8086.cjs`. Le run CI 45688178373 a réussi les tests directs et indirects, la suite différentielle et la comparaison GNU as du transfert far direct.


### 14.3 JMP near indirect — registres et mémoire validés

La forme `JMP r/m16` (`FF /4`) est maintenant testée sur les huit registres 16 bits et les huit modes d'adressage mémoire. Chaque cas vérifie les octets, le désassemblage, l'exécution source et binaire, la cible IP, CS, SP et les neuf FLAGS modélisés. Les formes registre et mémoire [BX]/[BX+SI] sont également comparées à GNU as.

Preuve : `tests/jmp-near-indirect-8086.cjs` et `tests/call-ret-gnu-crosscheck.cjs`.


### 14.4 Préfixe de segment sur JMP far indirect

Le test `jmp-far-indirect-8086.cjs` couvre aussi un pointeur far placé en ES:0100h, avec `ES: JMP FAR PTR [BX]`. L'override ES est vérifié au désassemblage puis dans les exécutions source et binaire ; le pointeur charge toujours l'offset et le segment dans l'ordre prévu. La cible est exécutée dans un segment distinct, sans empiler d'adresse de retour.

### 14.5 FF — restrictions architecturales vérifiées

La table Intel 4-13 distingue précisément les extensions du groupe FF :

| Extension | Forme 8086 | Mod=11 registre-direct |
|---|---|---|
| `/0` | `INC MEM16` | invalide |
| `/1` | `DEC MEM16` | invalide |
| `/2` | `CALL REG16/MEM16` near | valide |
| `/3` | `CALL MEM16` far | invalide |
| `/4` | `JMP REG16/MEM16` near | valide |
| `/5` | `JMP MEM16` far | invalide |
| `/6` | `PUSH MEM16` | invalide |
| `/7` | non utilisé | invalide |

L'assembleur privilégie les opcodes compacts `40–47` pour `INC r16` et `48–4F` pour `DEC r16`. Cela ne rend pas invalides les formes ModR/M `FF /0` et `FF /1` en registre-direct : le manuel MCS-86 décrit explicitement `INC` comme opérande mémoire ou registre (section INC, pp. 5-53 à 5-54), et la même famille d'encodage s'applique à DEC. En revanche, `FF /6` reste mémoire uniquement ; `PUSH r16` utilise les opcodes compacts `50–57`.

**Correction du 25 novembre 2026 :** le désassembleur reconnaît maintenant `FF C3` comme `INC BX` et `FF CB` comme `DEC BX`. `FF F0` reste invalide (`PUSH` registre-direct via /6) et est conservé comme données brutes (`DB`).

**Tests de régression :**
- `tests/group-opcodes.cjs` : balayage des 256 valeurs ModR/M du groupe FF et exécution binaire de INC/DEC sur les huit registres ;
- `tests/modrm-matrix.cjs` : validation des restrictions /3, /5 et /6 en mode registre-direct ;
- `tests/addressing-displacement.cjs` : distinction registre/mémoire ;
- `tests/push-pop-forms-8086.cjs` : huit registres via opcodes compacts, FF /6 mémoire uniquement ;
- tests intégrés du désassembleur pour les trois encodages registre invalides.

Cette restriction est contrôlée indépendamment de la présence des mnémoniques `INC`, `DEC` et `PUSH` dans le simulateur.
## 15. Index de rapprochement des 93 mnémoniques canoniques

Cet index relie chaque entrée de la matrice générale à son registre de formes. Il ne transforme pas un statut d'implémentation en validation exhaustive. Les contraintes ci-dessous sont les contraintes architecturales structurantes à vérifier dans chaque chemin concerné ; les tableaux précédents détaillent les formes recensées et les tests associés.

| Mnémonique canonique | Registre de formes | Forme / contrainte structurante | Suites de tests indépendants |
|---|---|---|---|
| MOV | §2 | 14 formes répertoriées ; restrictions Sreg, C6/C7 /0 et moffs | `modrm-matrix.cjs`, `legacy-segment-encodings.cjs`, `operand-constraints.cjs`, `gnu-as-crosscheck.cjs |
| XCHG | §9 | 86/87 ModR/M ; 90–97 avec AX ; pas mémoire-mémoire | `xchg-8086.cjs`, `xchg-gnu-crosscheck.cjs`, `xchg-interactive-8086.cjs` |
| LEA | §9 | r16, adresse effective mémoire ; ne lit pas la donnée | `lea-8086.cjs`, `lea-gnu-crosscheck.cjs`, `lea-interactive-8086.cjs` |
| LES | §9 | r16, m16:16 ; pointeur far en mémoire | `lds-les-8086.cjs`, `lds-les-gnu-crosscheck.cjs`, `lds-les-interactive-8086.cjs` |
| LDS | §9 | r16, m16:16 ; pointeur far en mémoire | `lds-les-8086.cjs`, `lds-les-gnu-crosscheck.cjs`, `lds-les-interactive-8086.cjs` |
| XLAT | §9 | AL reçoit DS:[BX+AL] ; override source contrôlé | `xlat-8086.cjs`, `xlat-gnu-crosscheck.cjs`, `xlat-interactive-8086.cjs`, `xlat-state-8086.cjs` |
| PUSH | §14 | 50–57 registres ; 06/0E/16/1E segments ; FF /6 MEM16 uniquement ; pas d'immédiat 8086 | `push-pop-forms-8086.cjs`, `control-stack.cjs` |
| POP | §14 | 58–5F registres ; 07/17/1F segments ; 8F /0 r/m16 ; POP CS invalide | `push-pop-forms-8086.cjs`, `control-stack.cjs` |
| PUSHF | §14 | `9Ch` — aucun opérande ; empile FLAGS via SS:SP ; pas de préfixe REP/LOCK. | `push-pop-forms-8086.cjs`, `control-stack.cjs`, `instruction-vectors.cjs` |
| POPF | §14 | `9Dh` — aucun opérande ; dépile FLAGS via SS:SP ; vérifier les bits réservés et les bits modifiables. | `push-pop-forms-8086.cjs`, `control-stack.cjs`, `instruction-vectors.cjs` |
| LAHF | §14 | `9Fh` — aucun opérande ; copie SF/ZF/AF/PF/CF dans AH, avec bits fixes 1 et 0. | `lahf-sahf-8086.cjs`, `instruction-vectors.cjs` |
| SAHF | §14 | `9Eh` — aucun opérande ; restaure SF/ZF/AF/PF/CF depuis AH ; les autres FLAGS sont préservés. | `lahf-sahf-8086.cjs`, `instruction-vectors.cjs` |
| MOVSB | §10 | `A4h` — `ES:[DI] ← DS:[SI]`, octet ; SI/DI avancent ou reculent selon DF ; override de segment sur la source uniquement ; REP F3. | `string-instructions-8086.cjs`, `lock-prefix-8086.cjs` |
| MOVSW | §10 | `A5h` — `ES:[DI] ← DS:[SI]`, mot ; SI/DI avancent ou reculent de 2 selon DF ; override de segment sur la source uniquement ; REP F3. | `string-instructions-8086.cjs` |
| CMPSB | §10 | `A6h` — compare `DS:[SI]` à `ES:[DI]`, octet ; met à jour FLAGS ; REPE/REPNE (F3/F2) selon ZF ; override source uniquement. | `string-instructions-8086.cjs` |
| CMPSW | §10 | `A7h` — compare `DS:[SI]` à `ES:[DI]`, mot ; met à jour FLAGS ; REPE/REPNE (F3/F2) selon ZF ; override source uniquement. | `string-instructions-8086.cjs` |
| SCASB | §10 | `AEh` — compare AL à `ES:[DI]`, octet ; REPE/REPNE (F3/F2) selon ZF ; destination ES fixe. | `string-instructions-8086.cjs` |
| SCASW | §10 | `AFh` — compare AX à `ES:[DI]`, mot ; REPE/REPNE (F3/F2) selon ZF ; destination ES fixe. | `string-instructions-8086.cjs` |
| LODSB | §10 | `ACh` — `AL ← DS:[SI]`, octet ; SI suit DF ; override source possible ; REP F3. | `string-instructions-8086.cjs` |
| LODSW | §10 | `ADh` — `AX ← DS:[SI]`, mot ; SI suit DF par pas de 2 ; override source possible ; REP F3. | `string-instructions-8086.cjs` |
| STOSB | §10 | `AAh` — `ES:[DI] ← AL`, octet ; DI suit DF ; destination ES fixe ; REP F3. | `string-instructions-8086.cjs` |
| STOSW | §10 | `ABh` — `ES:[DI] ← AX`, mot ; DI suit DF par pas de 2 ; destination ES fixe ; REP F3. | `string-instructions-8086.cjs` |
| ADD | §3 | `00–03h` r/m↔reg ; `04/05h` AL/AX,imm ; `80/81/83 /0` r/m,imm ; LOCK F0 seulement si destination mémoire. | `modrm-matrix.cjs`, `gnu-as-crosscheck.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs`, `dynamic-differential.cjs` |
| ADC | §3 | `10–13h` r/m↔reg ; `14/15h` AL/AX,imm ; `80/81/83 /2` r/m,imm ; LOCK F0 seulement si destination mémoire. | `modrm-matrix.cjs`, `gnu-as-crosscheck.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs`, `dynamic-differential.cjs` |
| SUB | §3 | `28–2Bh` r/m↔reg ; `2C/2Dh` AL/AX,imm ; `80/81/83 /5` r/m,imm ; LOCK F0 seulement si destination mémoire. | `modrm-matrix.cjs`, `gnu-as-crosscheck.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs`, `dynamic-differential.cjs` |
| SBB | §3 | `18–1Bh` r/m↔reg ; `1C/1Dh` AL/AX,imm ; `80/81/83 /3` r/m,imm ; LOCK F0 seulement si destination mémoire. | `modrm-matrix.cjs`, `gnu-as-crosscheck.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs`, `dynamic-differential.cjs` |
| INC | §12 | `40–47h` r16 ; `FE /0` r/m8 ; `FF /0` r/m16 (registre ou mémoire) ; CF préservé ; overrides de segment et LOCK mémoire vérifiés. | `group-opcodes.cjs`, `push-pop-forms-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs`, `unary-arithmetic-prefix-8086.cjs` |
| DEC | §12 | `48–4Fh` r16 ; `FE /1` r/m8 ; `FF /1` r/m16 (registre ou mémoire) ; CF préservé ; overrides de segment et LOCK mémoire vérifiés. | `group-opcodes.cjs`, `push-pop-forms-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs`, `unary-arithmetic-prefix-8086.cjs` |
| NEG | §12 | `F6 /3` r/m8 ; `F7 /3` r/m16 ; CF/OF selon résultat ; overrides de segment et LOCK mémoire vérifiés. | `neg-8086.cjs`, `group-opcodes.cjs`, `instruction-vectors.cjs`, `unary-arithmetic-prefix-8086.cjs` |
| CMP | §3 | `38–3Bh` r/m↔reg ; `3C/3Dh` AL/AX,imm ; `80/81/83 /7` r/m,imm ; FLAGS modifiés, destination non écrite, pas de LOCK. | `modrm-matrix.cjs`, `gnu-as-crosscheck.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| MUL | §12 | `F6 /4` r/m8 ; `F7 /4` r/m16 ; multiplicande implicite AL/AX ; résultat AX ou DX:AX ; FLAGS CF/OF définis, autres indéfinis. | `bcd-multiply-divide-8086.cjs`, `mul-div-memory-8086.cjs`, `instruction-vectors.cjs` |
| IMUL | §12 | `F6 /5` r/m8 ; `F7 /5` r/m16 ; multiplicande implicite AL/AX ; résultat AX ou DX:AX ; FLAGS CF/OF définis, autres indéfinis. | `bcd-multiply-divide-8086.cjs`, `mul-div-memory-8086.cjs`, `instruction-vectors.cjs` |
| DIV | §12 | `F6 /6` r/m8 ; `F7 /6` r/m16 ; dividende implicite AX ou DX:AX ; quotient hors plage ou diviseur nul → INT 0. | `bcd-multiply-divide-8086.cjs`, `mul-div-memory-8086.cjs`, `divide-error-interrupt-8086.cjs` |
| IDIV | §12 | `F6 /7` r/m8 ; `F7 /7` r/m16 ; dividende signé AX ou DX:AX ; quotient signé `−127..+127` (8086 original) ou `−32767..+32767` (8086 original) ; dépassement/diviseur nul → INT 0. | `bcd-multiply-divide-8086.cjs`, `mul-div-memory-8086.cjs`, `divide-error-interrupt-8086.cjs` |
| AAA | §12 | `37h` — aucun opérande ; ajustement ASCII après ADD sur chiffres non signés ; FLAGS non définis hors CF/AF selon l'architecture. | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| AAS | §12 | `3Fh` — aucun opérande ; ajustement ASCII après SUB ; contrôler AL/AH et CF/AF. | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| AAM | §12 | `D4 ib` — base immédiate, valeur 0Ah par défaut (`D4 0A`) ; division de AL par la base vers AH:AL. | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| AAD | §12 | `D5 ib` — base immédiate, valeur 0Ah par défaut (`D5 0A`) ; combine AH:AL avant DIV. | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| DAA | §12 | `27h` — aucun opérande ; ajustement décimal après ADD packed BCD ; contrôler CF/AF et résultat. | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| DAS | §12 | `2Fh` — aucun opérande ; ajustement décimal après SUB packed BCD ; contrôler CF/AF et résultat. | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| CBW | §12 | `98h` — aucun opérande ; extension de signe AL vers AX. | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| CWD | §12 | `99h` — aucun opérande ; extension de signe AX vers DX:AX. | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| AND | §12 | `20–23h` r/m↔reg ; `24/25h` AL/AX,imm ; `80/81/83 /4` r/m,imm ; overrides segment sur mémoire ; LOCK vérifié. | `logical-ops-8086.cjs`, `modrm-matrix.cjs`, `group-opcodes.cjs`, `instruction-vectors.cjs`, `logical-prefix-interactions-8086.cjs` |
| OR | §12 | `08–0Bh` r/m↔reg ; `0C/0Dh` AL/AX,imm ; `80/81/83 /1` r/m,imm ; overrides segment sur mémoire ; LOCK vérifié. | `logical-ops-8086.cjs`, `modrm-matrix.cjs`, `group-opcodes.cjs`, `instruction-vectors.cjs`, `logical-prefix-interactions-8086.cjs` |
| XOR | §12 | `30–33h` r/m↔reg ; `34/35h` AL/AX,imm ; `80/81/83 /6` r/m,imm ; overrides segment sur mémoire ; LOCK vérifié. | `logical-ops-8086.cjs`, `modrm-matrix.cjs`, `group-opcodes.cjs`, `instruction-vectors.cjs`, `logical-prefix-interactions-8086.cjs` |
| NOT | §12 | `F6 /2` r/m8 ; `F7 /2` r/m16 ; FLAGS préservés ; LOCK possible sur mémoire. | `logical-ops-8086.cjs`, `group-opcodes.cjs`, `instruction-vectors.cjs`, `not-forms-8086.cjs` |
| TEST | §12 | `84/85h` r/m,reg ; `A8/A9h` AL/AX,imm ; `F6/F7 /0` r/m,imm ; FLAGS modifiés, opérande non écrit ; overrides mémoire testés. | `logical-ops-8086.cjs`, `modrm-matrix.cjs`, `group-opcodes.cjs`, `instruction-vectors.cjs`, `logical-prefix-interactions-8086.cjs` |
| ROL | §12 | `D0/D1 /0` count=1 ; `D2/D3 /0` count=CL ; r/m8 ou r/m16 ; LOCK possible sur mémoire. | `shift-rotate-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| ROR | §12 | `D0/D1 /1` count=1 ; `D2/D3 /1` count=CL ; r/m8 ou r/m16 ; LOCK possible sur mémoire. | `shift-rotate-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| RCL | §12 | `D0/D1 /2` count=1 ; `D2/D3 /2` count=CL ; r/m8 ou r/m16 ; LOCK possible sur mémoire. | `shift-rotate-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| RCR | §12 | `D0/D1 /3` count=1 ; `D2/D3 /3` count=CL ; r/m8 ou r/m16 ; LOCK possible sur mémoire. | `shift-rotate-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| SHL | §12 | `D0/D1 /4` count=1 ; `D2/D3 /4` count=CL ; alias SAL ; r/m8 ou r/m16 ; LOCK possible sur mémoire ; pas de C0/C1 sur 8086. | `shift-rotate-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| SHR | §12 | `D0/D1 /5` count=1 ; `D2/D3 /5` count=CL ; r/m8 ou r/m16 ; LOCK possible sur mémoire ; pas de C0/C1 sur 8086. | `shift-rotate-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| SAR | §12 | `D0/D1 /7` count=1 ; `D2/D3 /7` count=CL ; r/m8 ou r/m16 ; LOCK possible sur mémoire ; /6 non utilisé. | `shift-rotate-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| JMP | §8–9 | EB short ; E9 near ; EA far direct ; FF /4 near r/m16 ; FF /5 far MEM16 uniquement | `byte-offset-execution.cjs`, `jmp-far-8086.cjs`, `jmp-far-indirect-8086.cjs`, `jmp-near-indirect-8086.cjs`, `instruction-vectors.cjs` |
| CALL | §8–9 | E8 near direct ; 9A far direct ; FF /2 near r/m16 ; FF /3 far MEM16 uniquement | `call-indirect-8086.cjs`, `call-ret-8086.cjs`, `call-ret-stack-boundaries.cjs`, `call-ret-interactive-8086.cjs`, `call-ret-gnu-crosscheck.cjs` |
| RET | §8–9 | C3/C2 near ; CB/CA far | `call-ret-8086.cjs`, `call-ret-stack-boundaries.cjs`, `call-ret-interactive-8086.cjs` |
| INT | §14 | `CCh` INT3 sans immédiat ; `CD ib` INT avec vecteur imm8 ; vecteur 00h pour division ; cadre FLAGS:CS:IP. | `divide-error-interrupt-8086.cjs`, `control-stack.cjs` |
| INTO | §14 | `CEh` — aucun opérande ; déclenche INT 4 si OF=1, sinon continue. | `into-8086.cjs` |
| IRET | §14 | `CFh` — aucun opérande ; dépile IP, CS, FLAGS ; vérification SS:SP et métadonnées de pile. | `divide-error-interrupt-8086.cjs`, `control-stack.cjs` |
| JCXZ | §8–9 | `E3 cb` — branchement relatif signé 8 bits si CX=0 ; CX n'est pas modifié. | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| LOOP | §8–9 | `E2 cb` — décrémente CX puis branche si CX≠0 ; déplacement signé 8 bits. | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| LOOPE | §8–9 | `E1 cb` — décrémente CX puis branche si CX≠0 et ZF=1 ; déplacement signé 8 bits. | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| LOOPNE | §8–9 | `E0 cb` — décrémente CX puis branche si CX≠0 et ZF=0 ; déplacement signé 8 bits. | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JO | §8–9 | `70 cb` — rel8 si OF=1. | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JNO | §8–9 | `71 cb` — rel8 si OF=0. | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JB | §8–9 | `72 cb` — rel8 si CF=1 (alias JC/JNAE). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JAE | §8–9 | `73 cb` — rel8 si CF=0 (alias JNB/JNC). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JE | §8–9 | `74 cb` — rel8 si ZF=1 (alias JZ). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JNE | §8–9 | `75 cb` — rel8 si ZF=0 (alias JNZ). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JBE | §8–9 | `76 cb` — rel8 si CF=1 ou ZF=1 (alias JNA). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JA | §8–9 | `77 cb` — rel8 si CF=0 et ZF=0 (alias JNBE). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JS | §8–9 | `78 cb` — rel8 si SF=1. | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JNS | §8–9 | `79 cb` — rel8 si SF=0. | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JP | §8–9 | `7A cb` — rel8 si PF=1 (alias JPE). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JNP | §8–9 | `7B cb` — rel8 si PF=0 (alias JPO). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JL | §8–9 | `7C cb` — rel8 si SF≠OF (alias JNGE). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JGE | §8–9 | `7D cb` — rel8 si SF=OF (alias JNL). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JLE | §8–9 | `7E cb` — rel8 si ZF=1 ou SF≠OF (alias JNG). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| JG | §8–9 | `7F cb` — rel8 si ZF=0 et SF=OF (alias JNLE). | `byte-offset-execution.cjs`, `instruction-vectors.cjs`, `dynamic-differential.cjs` |
| CLC | §14 | `F8h` — aucun opérande ; CF←0. | `flags-differential.cjs`, `instruction-vectors.cjs` |
| STC | §14 | `F9h` — aucun opérande ; CF←1. | `flags-differential.cjs`, `instruction-vectors.cjs` |
| CMC | §14 | `F5h` — aucun opérande ; CF←¬CF. | `flags-differential.cjs`, `instruction-vectors.cjs` |
| CLD | §14 | `FCh` — aucun opérande ; DF←0. | `flags-differential.cjs`, `string-instructions-8086.cjs` |
| STD | §14 | `FDh` — aucun opérande ; DF←1. | `flags-differential.cjs`, `string-instructions-8086.cjs` |
| CLI | §14 | `FAh` — aucun opérande ; IF←0. | `flags-differential.cjs`, `instruction-vectors.cjs` |
| STI | §14 | `FBh` — aucun opérande ; IF←1. | `flags-differential.cjs`, `instruction-vectors.cjs` |
| IN | §14 | AL/AX depuis port imm8 ou DX | `io-ports-8086.cjs` |
| OUT | §14 | AL/AX vers port imm8 ou DX | `io-ports-8086.cjs` |
| NOP | §14 | `90h` — aucun opérande ; alias XCHG AX,AX ; aucun état architectural modifié. | `smoke.cjs`, `instruction-vectors.cjs` |
| HLT | §14 | `F4h` — aucun opérande ; arrêt pédagogique ; reprise/interruptions matérielles hors périmètre si non simulées. | `smoke.cjs`, `instruction-vectors.cjs` |
| WAIT | §14 | dépend du signal TEST ; pas de coprocesseur matériel simulé | À renforcer : aucun vecteur sémantique dédié identifié ; `opcode-byte-sweep.cjs` est structurel. |
| ESC | §14 | D8–DF + ModR/M ; pas d'émulation 8087 | À renforcer : aucun vecteur sémantique indépendant identifié ; `opcode-byte-sweep.cjs` est structurel. |


## 15.1 Rapprochement des suites indépendantes

Cette table relie les 93 mnémoniques aux suites qui fournissent des contrôles indépendants. Une suite listée confirme l'existence de vecteurs ciblés ; elle ne signifie pas que toutes les formes, tous les préfixes et toutes les interactions sont déjà exhaustifs.

| Famille | Mnémoniques couverts | Suites indépendantes présentes |
|---|---|---|
| Transferts et adresses | MOV, XCHG, LEA, LES, LDS, XLAT | `modrm-matrix.cjs`, `legacy-segment-encodings.cjs`, `operand-constraints.cjs`, `xchg-8086.cjs`, `xchg-gnu-crosscheck.cjs`, `xchg-interactive-8086.cjs`, `lea-8086.cjs`, `lea-gnu-crosscheck.cjs`, `lea-interactive-8086.cjs`, `lds-les-8086.cjs`, `lds-les-gnu-crosscheck.cjs`, `lds-les-interactive-8086.cjs`, `xlat-8086.cjs`, `xlat-gnu-crosscheck.cjs`, `xlat-interactive-8086.cjs`, `xlat-state-8086.cjs` |
| Pile et FLAGS | PUSH, POP, PUSHF, POPF, LAHF, SAHF, IRET | `push-pop-forms-8086.cjs`, `control-stack.cjs`, `call-ret-stack-boundaries.cjs`, `call-ret-interactive-8086.cjs`, `lahf-sahf-8086.cjs`, `instruction-vectors.cjs` |
| Chaînes | MOVSB, MOVSW, CMPSB, CMPSW, SCASB, SCASW, LODSB, LODSW, STOSB, STOSW | `string-instructions-8086.cjs`, `lock-prefix-8086.cjs`, `dynamic-differential.cjs` |
| Arithmétique binaire | ADD, ADC, SUB, SBB, CMP | `modrm-matrix.cjs`, `gnu-as-crosscheck.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs`, `dynamic-differential.cjs` |
| Arithmétique unaire et produits/divisions | INC, DEC, NEG, MUL, IMUL, DIV, IDIV | `group-opcodes.cjs`, `neg-8086.cjs`, `bcd-multiply-divide-8086.cjs`, `mul-div-memory-8086.cjs`, `divide-error-interrupt-8086.cjs`, `instruction-vectors.cjs` |
| Logique et décalages | AND, OR, XOR, NOT, TEST, ROL, ROR, RCL, RCR, SHL, SHR, SAR | `logical-ops-8086.cjs`, `group-opcodes.cjs`, `shift-rotate-8086.cjs`, `instruction-vectors.cjs`, `flags-differential.cjs` |
| Ajustements et conversions | AAA, AAS, AAM, AAD, DAA, DAS, CBW, CWD | `bcd-multiply-divide-8086.cjs`, `instruction-vectors.cjs` |
| Contrôle de flux | JO, JNO, JB, JAE, JE, JNE, JBE, JA, JS, JNS, JP, JNP, JL, JGE, JLE, JG, JCXZ, LOOP, LOOPE, LOOPNE, CALL, RET, JMP | `instruction-vectors.cjs`, `byte-offset-execution.cjs`, `call-indirect-8086.cjs`, `call-ret-8086.cjs`, `call-ret-gnu-crosscheck.cjs`, `jmp-far-8086.cjs`, `jmp-far-indirect-8086.cjs`, `jmp-near-indirect-8086.cjs` |
| Interruptions et contrôle FLAGS | INT, INTO, IRET, CLC, STC, CMC, CLD, STD, CLI, STI | `divide-error-interrupt-8086.cjs`, `into-8086.cjs`, `control-stack.cjs`, `flags-differential.cjs` |
| Divers | NOP, HLT, WAIT, ESC, IN, OUT | `smoke.cjs`, `instruction-vectors.cjs`, `io-ports-8086.cjs`, `opcode-byte-sweep.cjs` |

**Limites à conserver dans l'audit :** les vecteurs GNU `as` sont des comparaisons d'encodage, pas des preuves d'exécution ; les tests navigateur vérifient le parcours UI et le chemin binaire, pas chaque combinaison d'opérandes ; les suites de famille doivent encore être rapprochées d'une liste canonique de cas positifs/négatifs par instruction.

## 15.2 Matrice des préfixes 8086

| Préfixe | Octet | Domaine et règle à vérifier | Suites |
|---|---:|---|---|
| ES override | `26h` | Remplace le segment par défaut d'un opérande mémoire explicite ; pour les chaînes, peut sélectionner la source, jamais remplacer ES:DI destination | `legacy-segment-encodings.cjs`, `string-instructions-8086.cjs`, `call-indirect-8086.cjs`, `xlat-8086.cjs` |
| CS override | `2Eh` | Même règle pour l'accès mémoire ; ne rend pas valide `MOV CS, r/m16` | `legacy-segment-encodings.cjs`, `operand-constraints.cjs`, suites CALL/JMP indirectes |
| SS override | `36h` | Remplace le segment mémoire par défaut, notamment DS pour les formes explicites ; ne change pas le segment implicite de pile | `operand-constraints.cjs`, suites CALL/JMP indirectes |
| DS override | `3Eh` | Force DS sur l'accès mémoire ; peut être redondant si DS est déjà le segment par défaut | `legacy-segment-encodings.cjs`, `string-instructions-8086.cjs`, `xlat-8086.cjs` |
| LOCK | `F0h` | Préfixe conservé dans l'encodage/désassemblage ; tests sur `LOCK INC AX` et `LOCK REP MOVSB`. Le signal électrique de verrouillage du bus n'est pas simulé | `lock-prefix-8086.cjs` |
| REP/REPE | `F3h` | Répétition avec CX ; pour CMPS/SCAS, continuation conditionnée par ZF=1 ; pour MOVS/LODS/STOS, répétition jusqu'à CX=0 | `string-instructions-8086.cjs`, `lock-prefix-8086.cjs` |
| REPNE | `F2h` | Pour CMPS/SCAS, continuation conditionnée par ZF=0 ; vérifier CX=0, arrêt sur égalité/différence et préservation des registres/FLAGS non concernés | `string-instructions-8086.cjs` |

Les préfixes de segment, LOCK et REP sont des octets distincts des champs ModR/M. Les résultats des matrices ModR/M ne doivent donc pas être présentés comme une validation exhaustive de leurs combinaisons. Les combinaisons de préfixes non explicitement testées restent hors couverture certifiée.

## 16. État de réconciliation par famille au 25 novembre 2026

| Famille | Formes principales couvertes par les tests présents | État de validation |
|---|---|---|
| MOV | 14 formes recensées ; ModR/M, moffs, immédiats, segments, mémoire et déplacements | Ciblé ; pas encore toutes les combinaisons opérandes × préfixes |
| ADD/ADC/SUB/SBB/CMP | 9 formes par instruction, extensions 80/81/83 | Vecteurs indépendants ciblés ; couverture exhaustive des directions octet/mot à terminer |
| INC/DEC | FE /0,/1 r/m8 ; FF /0,/1 r/m16 (registre ou mémoire) ; registres aussi via opcodes compacts | FF /0,/1 Mod=11 valides ; restrictions /3,/5,/6 testées |
| PUSH/POP | registres compacts, segments valides, FF /6 MEM16, 8F /0 r/m16, PUSH SP 8086 | Tests source/binaire et contraintes ; FF /6 mémoire uniquement ; PUSH SP empile le SP décrémenté |
| CALL | E8, 9A, FF /2 r/m16, FF /3 MEM16 | Indirect near/far, huit modes mémoire, segment overrides, CS:IP, pile et neuf FLAGS testés |
| JMP | EB, E9, EA, FF /4 r/m16, FF /5 MEM16 | Near/far indirect, huit modes mémoire, source/binaire et neuf FLAGS testés |
| RET | C2/C3/CA/CB, nettoyage immédiat pair/impair | Pile, SP, limites et GNU as ciblés ; pas de modèle processeur physique |
| Jcc et boucles | 16 Jcc courts, LOOP/LOOPE/LOOPNE/JCXZ | Vecteurs de conditions et déplacements ; pas de relâchement vers rel16 pour Jcc sur 8086 |
| Arithmétique et logique | ALU, groupes F6/F7, NEG, MUL/IMUL/DIV/IDIV, BCD, rotations/décalages | Plusieurs oracles indépendants exhaustifs sur domaines numériques bornés ; chaque forme mémoire et préfixe reste à rapprocher |
| Chaînes | Les dix opcodes MOVS/CMPS/SCAS/LODS/STOS byte/word ; source/binaire, DS:SI, ES:DI, DF, REP/REPE/REPNE, segment override, FLAGS et wrap 16 bits | Suite dédiée validée ; interactions de préfixes redondants/interruption et cas matériels encore hors modèle |
| Interruptions | INT/INT3/INTO/IRET, cadre FLAGS/CS/IP | INTO testé source/binaire avec OF=0/1, vecteur 4, IRET et restauration FLAGS/SP ; pas d'interruptions matérielles asynchrones |
| E/S | Les huit formes IN/OUT immédiat8 ou DX, AL/AX ; octets exacts, source/binaire, FLAGS et opérandes invalides | Suite dédiée validée ; état de ports logiciel, aucun périphérique électrique |
| WAIT/ESC | WAIT, D8–DF | Décodage et formes ciblés ; aucun signal TEST ni coprocesseur 8087 simulé |
| FLAGS | CLC/STC/CMC, CLD/STD, CLI/STI, LAHF/SAHF, PUSHF/POPF | Différentiels et oracles ciblés ; les bits indéfinis/non modélisés sont hors garantie |

### Restrictions FF réconciliées avec Intel

Le groupe FF est traité ainsi : /0 INC r/m16, /1 DEC r/m16, /2 CALL near r/m16, /3 CALL far m16:16, /4 JMP near r/m16, /5 JMP far m16:16, /6 PUSH m16, /7 non utilisé. Les formes Mod=11 sont valides pour /0, /1, /2 et /4 ; elles sont invalides pour /3, /5 et /6. Les tests group-opcodes et modrm-matrix balayent les 256 octets ModR/M et distinguent ces restrictions.

### Décision de calcul

Aucun score par mnémonique ni score global n'est publié. La pondération ne sera définie qu'après que chaque ligne aura un inventaire de formes, les contraintes d'opérandes, les préfixes applicables, une preuve de génération/décodage/exécution et un oracle indépendant. Un opcode présent dans le code ne vaut pas une forme validée.

### 16.1 Suites ajoutées pour les formes chaînes et E/S

- `tests/string-instructions-8086.cjs` : les dix instructions de chaîne sont assemblées et désassemblées individuellement ; MOVSB/MOVSW, CMPSB/CMPSW, SCASB/SCASW, LODSB/LODSW et STOSB/STOSW sont exécutées en source et en binaire. Les cas contrôlent les registres implicites, le segment source substitué, la destination ES, DF=0/1, REP/REPE/REPNE, CX=0, FLAGS et le passage de l'offset FFFFh à 0000h.
- `tests/io-ports-8086.cjs` : les huit formes IN/OUT (port imm8 ou DX, AL ou AX) sont vérifiées en encodage, désassemblage et exécution source/binaire. Le test couvre la valeur des ports, les neuf FLAGS préservés et les formes invalides.

Ces suites valident le modèle logiciel du laboratoire ; elles ne prétendent pas simuler le bus électrique, les périphériques ni le minutage matériel.

### 16.3 MOV vers/depuis les registres de segment — extension du contrôle 8C/8E

La règle de destination CS est désormais explicitement réconciliée entre la fiche d'encodage et les tests :

- `8C /0..3` : transfert du registre de segment vers r/m16 ; CS est autorisé comme source (`MOV r/m16,CS`).
- `8E /0, /2, /3` : transfert de r/m16 vers ES, SS ou DS.
- `8E /1` : destination CS ; opération indéfinie dans la description Intel MCS-86, donc non admise par l'assembleur et non désassemblée comme instruction valide.
- `/4..7` : sélecteurs réservés/non utilisés pour les deux opcodes.

**Références primaires :** Intel, *MCS-86 Macro Assembly Language Reference Manual*, septembre 1979, entrée MOV, Type 3 : le manuel indique explicitement que le cas `reg = 01` correspond à une opération indéfinie. Intel, *8086 Family User's Manual*, octobre 1979, table 4-12, décrit les formes de transfert entre registre de segment et opérande r/m. La règle est également contrôlée par `tests/legacy-segment-encodings.cjs`.

**Extension ajoutée à la suite de régression :**
- balayage des sélecteurs /4..7 sur les 4 valeurs `mod` et les 8 valeurs `r/m`, pour 8C et 8E ;
- balayage de `8E /1` sur les 4 valeurs `mod` et les 8 valeurs `r/m`, avec déplacements adaptés ;
- contrôle de la consommation intégrale du flux sans requalifier `8E /1` en `MOV CS` ;
- rejet de `MOV CS` depuis un registre et depuis une mémoire ;
- conservation de `MOV WORD PTR [BX],CS` comme forme valide.

Cette extension est une validation exhaustive des combinaisons de champs pour ce sous-ensemble précis de MOV segment ; elle ne doit pas être extrapolée aux autres opcodes ModR/M.

### 16.2 INTO et comportement PUSH SP

- `tests/into-8086.cjs` vérifie l'opcode CE, le cas OF=0 sans interruption, le cas OF=1 via le vecteur 4, l'IVT physique en exécution binaire et la restauration de CS:IP, FLAGS et SP par IRET.
- `tests/push-pop-forms-8086.cjs` vérifie que sur 8086 PUSH SP empile la valeur après décrémentation de SP. Ce comportement est distinct de celui des générations ultérieures et est documenté dans le cours.


### 16.4 IDIV — limites signées propres au 8086 original

Le manuel Intel 8086 Family User's Manual d'octobre 1979, section IDIV, page 2-37, définit les limites de quotient suivantes :

- r/m8 : `−127..+127` ;
- r/m16 : `−32767..+32767`.

Les valeurs `−128` et `−32768` ne sont donc pas des quotients valides sur le 8086 original : elles déclenchent l'interruption de division de type 0. Cette règle historique diffère des limites adoptées par des générations x86 ultérieures.

Les tests de frontière dans `tests/mul-div-memory-8086.cjs` couvrent désormais :

| Cas | Dividende | Diviseur | Attendu 8086 |
|---|---:|---:|---|
| IDIV byte, limite valide | AX = FF81h (−127) | BL = 1 | AL = 81h, AH = 00h |
| IDIV word, limite valide | DX:AX = FFFF:8001h (−32767) | BX = 1 | AX = 8001h, DX = 0000h |
| IDIV byte, limite invalide | AX = FF80h (−128) | BL = 1 | interruption 0 |
| IDIV word, limite invalide | DX:AX = FFFF:8000h (−32768) | BX = 1 | interruption 0 |

Les FLAGS ne sont pas comparés après IDIV, car AF, CF, OF, PF, SF et ZF sont indéfinis selon le manuel Intel.

### 16.5 Réconciliation des vecteurs IDIV et interruption de division

- `index.html` : la plage de quotient signé de `executeMultiplyDivide` est limitée à `−127..+127` pour byte et `−32767..+32767` pour word.
- `tests/bcd-multiply-divide-8086.cjs` : les vecteurs différentiels utilisent les limites 8086 originales ; les quotients `−128` et `−32768` sont classés comme erreurs, pas comme résultats valides.
- `tests/mul-div-memory-8086.cjs` : les cas mémoire de division par zéro et de dépassement vérifient source et binaire, y compris la non-écriture du quotient/résidu et le retour IRET.
- `tests/divide-error-interrupt-8086.cjs` : les huit cas source et huit cas binaires vérifient le vecteur 00h, le cadre FLAGS/CS/IP, IF/TF, SP et la reprise après l'instruction fautive.

**Validation CI :** le commit `531f1a7ba7c51fcf62fa2ba20e53b9dc864b83a6` passe le workflow principal complet (55 étapes sur 55) et le workflow navigateur associé. Les suites BCD/MUL/DIV totalisent 6 812 réussites ; la suite mémoire MUL/IMUL/DIV/IDIV totalise 1 091 réussites.

### 16.6 WAIT et ESC — vecteurs indépendants et limites du modèle

La suite `tests/wait-esc-8086.cjs` ajoute un contrôle indépendant des deux familles liées au coprocesseur :

- `WAIT` : opcode fixe `9Bh`, désassemblage et rejet des formes avec opérandes.
- `ESC` : les 64 codes d'échappement (`D8h–DFh` et champ `reg`) sont assemblés et désassemblés pour un opérande registre 16 bits et un opérande mémoire.
- Décodage des **2 048 combinaisons** opcode ESC × octet ModR/M ; les déplacements requis par les modes mémoire sont fournis, et la longueur consommée est contrôlée.
- Rejet des codes ESC hors plage, des opérandes immédiats, des arités invalides et des flux ESC tronqués.
- Comparaison de l'état des registres, segments, neuf FLAGS modélisés et d'une sentinelle mémoire avant/après WAIT et ESC, en exécution source et binaire.

**Résultat CI :** [workflow principal réussi](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45707818689), commit `46c4e2e389c23a18d02f71c04593ddb1172e2875`. La suite WAIT/ESC termine avec **6 710 assertions réussies**.

**Limite architecturale explicite :** le laboratoire traite WAIT et ESC comme des no-op pédagogiques. Il ne simule ni le signal TEST, ni un 8087, ni le transfert de commandes/données vers un coprocesseur. Ces vecteurs valident donc le codage, le décodage, les contraintes de syntaxe et la préservation de l'état dans le modèle logiciel ; ils ne certifient pas l'exécution d'un coprocesseur matériel.

### 16.7 ADD, ADC, SBB, SUB et CMP — matrice indépendante des formes

La suite `tests/alu-forms-8086.cjs` complète les cinq familles arithmétiques et de comparaison avec des attentes calculées depuis les champs de l'encodage Intel, indépendamment de la sortie du décodeur :

- **5 120 cas assembleur directionnels** : cinq mnémoniques × quatre opcodes direction/largeur × quatre valeurs de MOD × huit champs REG × huit champs R/M. Les modes mémoire incluent adresse directe, base/index, disp8 et disp16 ; les formes registre-direct couvrent les huit registres octet et mot.
- **480 cas assembleur immédiats** : cinq mnémoniques × trois groupes 80h/81h/83h × quatre MOD × huit R/M. Les extensions sont explicitement fixées : ADD /0, ADC /2, SBB /3, SUB /5 et CMP /7.
- **10 formes accumulateur** : AL/imm8 et AX/imm16 pour chaque opération, avec les opcodes dédiés.
- **8 contraintes négatives** : tailles incompatibles, mémoire-mémoire, arité incorrecte et destination segment non valide.
- **5 vecteurs sémantiques source + binaire** : débordement ADD/ADC, emprunt SBB/SUB et comparaison CMP sans écriture de l'opérande.

**Règles de canonicalisation confirmées par les octets attendus :** pour les opérandes registre-registre, l'assembleur normalise la direction vers les formes r/m,reg (opcodes de base), même lorsque la syntaxe source présente le registre destination en premier. De même, les opérandes AL/AX avec immédiat utilisent les opcodes accumulateur dédiés plutôt que le groupe 80/81/83. Les attentes de test tiennent compte de ces choix canoniques sans réduire les formes que le décodeur doit reconnaître.

**Résultat CI principal :** [workflow réussi](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45709806928), commit `760efc03d6cb139bd4e2d0b854c58d5094108928`. La nouvelle suite est exécutée après la matrice ModR/M existante ; les 11 568 assertions de cette dernière passent également. Les tests de formes ne certifient pas encore toutes les valeurs de données et tous les états de FLAGS ; les interactions de préfixes seront contrôlées séparément par classe d'instruction.

### 16.8 Préfixes appliqués à ADD, ADC, SBB, SUB et CMP

La suite `tests/alu-prefix-interactions-8086.cjs` vérifie les interactions de préfixes pour les cinq instructions arithmétiques/comparaison :

- Les quatre overrides de segment (ES, CS, SS, DS) sont exercés sur une destination mémoire et une source mémoire, pour chacune des cinq instructions : **40 cas source/binaire**.
- Les octets de préfixe et le ModR/M sont contrôlés au désassemblage ; les exécutions source et binaire vérifient que l'accès mémoire utilise bien le segment demandé.
- Un override DS redondant devant `[BX]` est omis canoniquement, puisque DS est déjà le segment par défaut de cette adresse ; ce n'est pas un défaut de génération.
- REP, REPE et REPNE sont rejetés devant les cinq instructions non-chaînes ; les overrides de segment sans opérande mémoire sont rejetés ; les doubles préfixes et les séquences mal ordonnées couvertes par les tests sont rejetés.
- LOCK est vérifié en octets et au désassemblage sur les formes mémoire de ADD, ADC, SBB et SUB. Le modèle ne prétend pas simuler le signal électrique ni l'atomicité du bus.

**Référence matérielle :** le manuel Intel *8086 Family User's Manual* (octobre 1979), §2.5, indique que LOCK maintient le signal actif pendant l'instruction suivante et prévoit explicitement le cas d'une chaîne répétée verrouillée. Le même manuel décrit l'usage de LOCK avec XCHG mémoire pour protéger une mise à jour de sémaphore. Le laboratoire n'émule pas le bus partagé. <Cite ref="turn276112view0"/> <Cite ref="turn508198view0"/>

**Validation :** le workflow principal du commit `184b01b32f9259a8545773106ed78a213c7f65a5` a réussi ; les suites ALU, interactions de préfixes, chaînes, transferts et WAIT/ESC ont toutes passé dans ce run. [Résultats CI](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45710283500).

### 16.9 NOT — formes unaires et préfixes

La suite `tests/not-forms-8086.cjs` isole NOT de la suite générique F6/F7 :

- Les huit registres octet et les huit registres mot sont assemblés et désassemblés : **16 formes registre-directes**.
- Les trois valeurs de MOD et les huit valeurs R/M sont contrôlées pour les deux largeurs : **48 formes mémoire**, avec déplacement direct, disp8 et disp16.
- L'extension `/2` est vérifiée ; `/1` reste réservée et n'est pas interprétée comme NOT.
- Les formes à arité ou classe d'opérande incorrectes sont rejetées.
- Les quatre overrides de segment sont vérifiés ; DS redondant est normalisé. Les préfixes LOCK et les répétitions REP sont testés.
- Les exécutions source et binaire vérifient le complément bit à bit et comparent les neuf FLAGS modélisés à l'état de référence avant NOT. Le test ne suppose pas qu'un bit indéfini ou non restaurable par POPF prenne une valeur particulière.

**Résultat :** **327 assertions réussies** dans la suite NOT ; la CI principale a réussi au commit `7d5914ce7f2be249cd97c7d44435259ebf522d96`. [Workflow CI](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45711153433).

Le désassembleur conserve désormais un override de segment lorsqu'il existe un opérande mémoire explicite, y compris pour les formes unaires dont la représentation textuelle peut varier. Cela ne modélise pas le bus ; cela garantit que le préfixe décodé reste attaché à l'instruction mémoire correspondante.

### 16.10 AND, OR, XOR et TEST — interactions de préfixes

La suite `tests/logical-prefix-interactions-8086.cjs` complète les **68 605 contrôles logiques** déjà présents par les interactions de préfixes :

- **28 cas d'override de segment** : AND, OR et XOR dans les deux directions mémoire/registre ; TEST dans sa forme r/m,reg ; ES, CS, SS et DS ; exécutions source et binaire.
- Vérification des octets de préfixe, du ModR/M et du désassemblage. Le segment DS par défaut sur `[BX]` est omis canoniquement.
- Rejet de REP/REPE/REPNE devant ces quatre instructions et des overrides de segment sans opérande mémoire.
- Vérification de LOCK sur les formes mémoire de AND, OR et XOR.
- Contrôle des doubles préfixes et des séquences dupliquées couvertes par la suite.

**Résultat CI :** la suite passe avec **296 assertions** dans le workflow [Validate Intel 8086 Lab](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45711516325), commit `edcfa404000f4a117a6886c63e139684bab56ca3`. Le résultat valide les interactions dans le modèle assembleur/désassembleur et l'exécution logicielle ; il ne simule pas l'assertion électrique du signal LOCK ni l'arbitrage du bus.

### 16.11 INC, DEC et NEG — préfixes et opérandes mémoire

La suite `tests/unary-arithmetic-prefix-8086.cjs` ajoute une matrice dédiée aux trois opérations unaires :

- **24 cas source/binaire** : INC, DEC et NEG × octet/mot × ES, CS, SS et DS.
- Les formes mémoire sont encodées avec leurs groupes exacts : FE /0 et /1 pour INC/DEC octet, FF /0 et /1 pour INC/DEC mot, F6 /3 et F7 /3 pour NEG.
- Les overrides de segment sont vérifiés jusqu'à l'adresse mémoire réellement modifiée ; DS redondant est omis pour `[BX]`.
- LOCK est contrôlé sur les six formes mémoire octet/mot ; REP/REPE/REPNE et les overrides de segment sans opérande mémoire sont rejetés.
- Les résultats octet/mot, CF et OF sont vérifiés sur des frontières choisies ; les mots mémoire sont contrôlés en deux octets little-endian.

Le premier passage a révélé une erreur dans le test lui-même : il comparait une valeur mot à un seul octet de mémoire. La vérification a été corrigée pour contrôler séparément l'octet bas et l'octet haut.

**État :** les étapes dédiées INC/DEC/NEG, ALU, logique et NOT passent dans la CI du commit `19ccaab8e9315265e1fba1e699c70e7b6c9f4b83`. Le workflow global était encore en cours au moment de cette mise à jour ; ne pas interpréter le seul succès de l'étape comme une CI complète.

### 16.12 MUL, IMUL, DIV et IDIV — matrice des formes et préfixes (26 novembre 2026)

**Périmètre :** quatre instructions à un opérande du 8086 original, deux tailles (byte/word), formes registre et mémoire, contraintes ModR/M, préfixes, interruption de division et exécution source/binaire.

**Formes d'encodage :**

| Instruction | Byte | Word |
|---|---|---|
| MUL | F6 /4 | F7 /4 |
| IMUL | F6 /5 | F7 /5 |
| DIV | F6 /6 | F7 /6 |
| IDIV | F6 /7 | F7 /7 |

**Couverture des formes :**
- Huit registres byte et huit registres word pour chacune des quatre instructions ; encodage et désassemblage ModR/M contrôlés.
- Huit formes d'adressage effectif, adresse directe, disp8, disp16 et limites de déplacement ; exécutions mémoire en source et binaire.
- Qualificateurs BYTE PTR/WORD PTR requis pour les opérandes mémoire ; immédiats, formes multi-opérandes, tailles incohérentes et extension F6/F7 /1 réservée rejetés.
- Les résultats implicites sont vérifiés : AX pour les produits byte, DX:AX pour les produits word ; AL/AH ou AX/DX pour quotient et reste.
- CF/OF sont comparés pour MUL/IMUL ; les autres FLAGS indéfinis ne sont pas artificiellement vérifiés. Tous les FLAGS arithmétiques indéfinis après DIV/IDIV sont exclus des comparaisons.

**Préfixes :**
- ES, CS, SS et DS : 32 combinaisons d'override mémoire (4 instructions × 2 tailles × 4 segments), avec encodage et exécution source/binaire.
- `tests/mul-div-segment-selection-8086.cjs` vérifie les segments implicites DS/SS sur les huit formes d'adressage effectif : 128 assertions source/binaire (4 instructions × 2 tailles × 8 formes × 2 chemins).
- LOCK + override de segment est contrôlé en byte et word pour les quatre instructions : 96 assertions d'encodage, d'exécution source et d'exécution binaire.
- Les cinq graphies REP/REPE/REPZ/REPNE/REPNZ sont rejetées pour les quatre instructions et les opérandes registre/mémoire byte/word : 80 assertions.
- REP, REPE, REPNE et REPZ sont rejetés devant ces instructions non-chaîne.
- Les overrides de segment sur formes registre seules sont rejetés par la syntaxe source car aucune référence mémoire n'existe.
- LOCK est conservé comme préfixe 8086 devant MUL/IMUL/DIV/IDIV, y compris sur source mémoire en lecture seule. Le manuel 8086 indique que LOCK active le signal de bus pendant l'instruction suivante en mode maximum ; le moteur pédagogique n'émule ni le signal physique ni l'arbitrage.

**Résultats mesurés :**

| Suite | Résultat |
|---|---:|
| `bcd-multiply-divide-8086.cjs` | 6 812 réussis, 0 échec |
| `mul-div-memory-8086.cjs` | 1 091 réussis, 0 échec |
| `mul-div-segment-selection-8086.cjs` | 368 réussis, 0 échec ; 192 vecteurs source/binaire |
| Encodages/désassemblages mémoire | 392 |
| Exécutions mémoire source/binaire | 384 |
| Erreurs de division mémoire source/binaire | 16 |
| Overrides de segment | 32 |
| Vecteurs MUL/IMUL | 1 300 |
| Vecteurs DIV/IDIV | 380 |

**Statut de réconciliation :** les quatre lignes correspondantes de `docs/coverage-audit-8086.md` sont marquées Tests = Oui. Cette validation est limitée à ces quatre instructions et à leurs formes documentées ; elle ne certifie pas la matrice complète des 93 entrées ni l'équivalence matérielle du simulateur avec un 8086 physique.


**Validation CI sur `main` :** run [45729004989](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45729004989), commit `28d680d26d0311ce81a672d81daf9d59184562e4`, **56/56 étapes réussies**. La matrice étendue des segments par défaut inclut maintenant BX+SI, BX+DI, BP+SI, BP+DI, SI, DI, BP et BX.

### 16.13 Branchements relatifs et famille LOOP — actualisation du 26 novembre 2026

La suite `tests/relative-branches.cjs` rapporte **209 assertions réussies, 0 échec** dans le CI du commit `faef6b83c1e5aba2626148bb6b341fc0079031f5`.

- Les 16 Jcc disposent des encodages et désassemblages canoniques 70h–7Fh ; les huit couples d'opérandes couvrent les 16 conditions dans les chemins source et binaire, avec comparaison des six FLAGS définis par CMP.
- LOOP, LOOPE, LOOPNE et JCXZ disposent chacun de tests d'encodage et de désassemblage.
- Les scénarios source/binaire contrôlent les branches prises et non prises, CX=0/1/2, le bouclage à FFFFh, la préservation des neuf FLAGS et l'absence de décrémentement de CX pour JCXZ.
- Les déplacements rel8 des quatre boucles sont vérifiés au désassemblage ; les flux tronqués E0–E3 sont rejetés.
- JMP short est contrôlé aux limites -128/+127, la relaxation bascule en near au-delà ; CALL/JMP rel16 vérifient -32768/+32767 et le bouclage 16 bits de IP.

**Validation CI :** run [45729424128](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45729424128), **56/56 étapes réussies**. Les résultats restent limités aux formes et états explicitement listés ; aucune couverture globale des 93 instructions n'est déduite.


### 16.14 CMP et TEST — actualisation du 26 novembre 2026

Les formes d'encodage CMP sont décrites au §3. Les contrôles sémantiques complémentaires exécutés dans le CI `45730214193` sont :

- `tests/alu-forms-8086.cjs` : **22 524 assertions** au total ; CMP byte registre et word mémoire sont comparés en source et en binaire, avec conservation des opérandes et contrôle des FLAGS définis.
- `tests/relative-branches.cjs` : huit couples d'opérandes couvrent les 16 conditions Jcc en source et en binaire ; les FLAGS CF, PF, AF, ZF, SF et OF issus de CMP sont comparés à un oracle arithmétique indépendant.
- `tests/logical-ops-8086.cjs` : **68 611 réussites, 0 échec** ; tables de vérité byte exhaustives, cas limites word, encodages registre/mémoire/immédiat et **10 équivalences source/binaire**.
- Les six nouveaux vecteurs TEST vérifient registre byte/word, immédiat accumulateur, mémoire byte/word, opérande registre/mémoire et override ES. Ils contrôlent CF/OF/SF/ZF/PF, préservent les FLAGS non modifiés et vérifient que TEST ne modifie ni les opérandes ni la mémoire. AF reste volontairement exclu car indéfini pour TEST sur 8086.

**Résultat CI :** [45730214193](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45730214193), commit `bf994802a22425d1bddf7991e1d8a55d1f6ac522`, **56/56 étapes réussies**.

Cette mise à jour valide les cas explicitement listés. Elle ne transforme pas les 9 formes CMP ni les formes TEST en une certification exhaustive de toutes les combinaisons ModR/M et de tous les états possibles.


### 16.15 Groupe 2 — décalages et rotations

`tests/shift-rotate-8086.cjs` rapporte **3 529 réussites, 0 échec** dans le workflow [45731020812](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45731020812).

- 2 496 vecteurs sémantiques comparés en source et en binaire ;
- 1 024 formes d'encodage/désassemblage couvrant les huit opérations, byte/word, huit registres et 24 formes mémoire ModR/M, avec compte 1 et CL ;
- les comptes CL 0, 1, 2, 7, 8, 9, 15, 16, 17, 31, 32, 33 et 255 ;
- CF d'entrée 0 et 1 pour les rotations via CF ;
- AF des décalages et OF des opérations multibit laissés indéfinis et non comparés.

`SAL` est testé comme alias de `SHL`. Les formes immédiates C0h/C1h, absentes du 8086 original, sont rejetées et ne sont pas comptées parmi les formes valides.


### 16.16 INC, DEC, NEG et NOT — actualisation du 26 novembre 2026

Le workflow [45731571537](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45731571537) a terminé avec **56/56 étapes réussies**.

- `tests/unary-arithmetic-prefix-8086.cjs` : **1 976 assertions** ; 24 cas d'override de segment source/binaire, 48 formes registre source/binaire (trois opérations × deux tailles × huit registres), 32 formes mémoire INC/DEC (deux opérations × deux tailles × huit EA), sélection DS/SS, LOCK byte/word et rejets REP.
- `tests/flags-differential.cjs` : **3 412 réussites, 0 échec**, dont 48 vecteurs INC/DEC comparés source/binaire sur CF, PF, AF, ZF, SF, OF et la préservation TF/IF/DF.
- `tests/neg-8086.cjs` : **651 réussites, 0 échec** ; les 256 entrées byte et 15 frontières word sont exécutées dans les deux chemins ; les formes registre et les 11 EA mémoire sont vérifiées.
- `tests/not-forms-8086.cjs` : **327 assertions** ; 16 formes registre, 48 formes mémoire, quatre overrides, LOCK, rejet REP et préservation des FLAGS.

Les FLAGS non définis ne sont pas comparés. Les résultats sont limités aux formes et vecteurs explicitement testés.


### 16.17 E/S, interruptions conditionnelles, FLAGS et ESC

Résultats vérifiés dans le CI [45731571537](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45731571537) :

- `tests/io-ports-8086.cjs` : **23/23** ; huit formes IN/OUT, encodage, désassemblage, source/binaire, FLAGS et état de la carte de ports logicielle.
- `tests/into-8086.cjs` : **4/4** ; INTO avec OF=0/1, vecteur 4, IRET, pile, FLAGS et source/binaire.
- `tests/lahf-sahf-8086.cjs` : **298/298** ; 32 combinaisons LAHF, 256 valeurs SAHF, source/binaire, FLAGS et octets fixes.
- `tests/wait-esc-8086.cjs` : **6 719 assertions** ; WAIT, 64 numéros ESC, formes registre/mémoire et 2 048 combinaisons opcode/ModR/M désassemblées.

Limites de modèle : IN/OUT utilisent une carte logicielle ; INTO vérifie l'interruption logicielle conditionnelle, pas les interruptions matérielles ; WAIT/ESC n'émulent ni synchronisation FPU ni coprocesseur 8087.


### 16.18 XLAT — actualisation du 26 novembre 2026

- `tests/xlat-8086.cjs` : **24/24** ; encodage/désassemblage, segments, exécution source/binaire, FLAGS, débordements 16 bits/20 bits, lecture non initialisée et syntaxes invalides.
- `tests/xlat-state-8086.cjs` : **2/2** ; préservation de tous les registres généraux/segments et des neuf FLAGS en source et en binaire.
- Cross-check GNU de l'encodage : réussi.

CI : [45731571537](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45731571537).
