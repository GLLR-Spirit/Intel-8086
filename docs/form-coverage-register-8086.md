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
| JMP near indirect | r/m16 | FF /4 | Implémenté | Implémenté | Test ciblé | Registre et mémoire |
| JMP far direct | ptr16:16 | EA cd | Implémenté | Implémenté | Testé source et binaire | `jmp-far-8086`, GNU as ; CS:IP, SP et FLAGS |
| JMP far indirect | m16:16 | FF /5 | Présence à réconcilier | Présence à réconcilier | Test ciblé à compléter | À inscrire dans la matrice exhaustive |
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
| AND | r/m8,r8 ; r/m16,r16 ; r8/r16,r/m ; AL/AX,imm ; r/m8/16,imm (80/81/83) | `logical-ops-8086`, vecteurs indépendants | Matrice directionnelle octet/mot, tous modes mémoire et extensions |
| OR | mêmes formes directionnelles et immédiates ; groupe 80/81/83 /1 | `logical-ops-8086`, balayage de groupes | Toutes combinaisons source/destination et immédiats |
| XOR | mêmes formes directionnelles et immédiates ; groupe 80/81/83 /6 | `logical-ops-8086`, vecteurs FLAGS | Toutes combinaisons et AF indéfini |
| TEST | r/m8,r8 (84 /r), r/m16,r16 (85 /r), AL/AX,imm (A8/A9), r/m8/16,imm (F6/F7 /0) | `logical-ops-8086`, `group-opcodes` | Toutes formes mémoire, immédiats et contraintes |
| NOT | r/m8 (F6 /2), r/m16 (F7 /2) | `group-opcodes`, balayage ModR/M | FLAGS préservés et matrices complètes |
| INC / DEC | r16 (40–4F), r/m8 (FE /0,/1), r/m16 (FF /0,/1) | `instruction-vectors`, `group-opcodes`, FLAGS différentiels | Chaque registre, mémoire, SP et limites |
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
| PUSH r/m16 | registre ou mémoire | FF /6 | Groupe FF et tests de pile |
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
