# Inventaire canonique — jeu d'instructions Intel 8086

**Statut :** inventaire de travail, à confronter aux tables des manuels Intel avant de déclarer l'exhaustivité certifiée.  
**Périmètre :** instructions du processeur Intel 8086 d'origine (pas 80186/80286+), avec séparation entre mnémotechniques principales, synonymes documentés et préfixes.  
**Règle de comptage :** une ligne = une graphie mnémotechnique ; les alias restent des entrées propres afin de pouvoir les auditer individuellement.

Cet inventaire est indépendant des 58 cartes de l'interface. Il ne déduit aucun statut de support du simulateur, de l'assembleur ou du désassembleur.

## 1. Instructions et variantes de chaîne

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| MOV | Transfert de données | — | À auditer |
| MOVSB | Chaîne, octet | — | À auditer |
| MOVSW | Chaîne, mot | — | À auditer |
| CMPSB | Comparaison de chaîne, octet | — | À auditer |
| CMPSW | Comparaison de chaîne, mot | — | À auditer |
| SCASB | Recherche/comparaison de chaîne, octet | — | À auditer |
| SCASW | Recherche/comparaison de chaîne, mot | — | À auditer |
| LODSB | Chargement depuis chaîne, octet | — | À auditer |
| LODSW | Chargement depuis chaîne, mot | — | À auditer |
| STOSB | Stockage dans chaîne, octet | — | À auditer |
| STOSW | Stockage dans chaîne, mot | — | À auditer |
| XCHG | Échange | — | À auditer |
| XLAT | Traduction par table | XLATB (synonyme rencontré dans des assembleurs/documentations postérieurs ; statut canonique à confirmer) | À auditer |

## 2. Arithmétique, ajustement et comparaison

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| ADD | Addition | — | À auditer |
| ADC | Addition avec retenue | — | À auditer |
| SUB | Soustraction | — | À auditer |
| SBB | Soustraction avec emprunt | — | À auditer |
| INC | Incrémentation | — | À auditer |
| DEC | Décrémentation | — | À auditer |
| NEG | Négation arithmétique | — | À auditer |
| CMP | Comparaison par soustraction | — | À auditer |
| MUL | Multiplication non signée | — | À auditer |
| IMUL | Multiplication signée | — | À auditer |
| DIV | Division non signée | — | À auditer |
| IDIV | Division signée | — | À auditer |
| AAA | Ajustement ASCII après addition | — | À auditer |
| AAS | Ajustement ASCII après soustraction | — | À auditer |
| AAM | Ajustement ASCII après multiplication | — | À auditer |
| AAD | Ajustement ASCII avant division | — | À auditer |
| DAA | Ajustement décimal après addition | — | À auditer |
| DAS | Ajustement décimal après soustraction | — | À auditer |
| CBW | Conversion octet signé en mot | — | À auditer |
| CWD | Extension du signe de AX vers DX:AX | — | À auditer |

## 3. Logique et manipulation de bits

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| AND | ET logique | — | À auditer |
| OR | OU logique | — | À auditer |
| XOR | OU exclusif | — | À auditer |
| NOT | Complément bit à bit | — | À auditer |
| TEST | ET logique sans stockage du résultat | — | À auditer |
| ROL | Rotation gauche | — | À auditer |
| ROR | Rotation droite | — | À auditer |
| RCL | Rotation gauche via CF | — | À auditer |
| RCR | Rotation droite via CF | — | À auditer |
| SHL | Décalage logique gauche | SAL | À auditer |
| SAL | Synonyme de SHL | SHL | À auditer |
| SHR | Décalage logique droite | — | À auditer |
| SAR | Décalage arithmétique droite | — | À auditer |

## 4. Transfert de contrôle, appels et interruptions

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| JMP | Saut inconditionnel | — | À auditer |
| CALL | Appel de procédure | — | À auditer |
| RET | Retour proche | — | À auditer |
| RETF | Retour lointain (graphie d'assembleur pour le retour intersegment) | Synonyme de syntaxe à vérifier contre le manuel d'assembleur retenu | À auditer |
| INT | Interruption logicielle | — | À auditer |
| INTO | Interruption si débordement | — | À auditer |
| IRET | Retour d'interruption | — | À auditer |
| JCXZ | Saut si CX vaut zéro | — | À auditer |
| LOOP | Boucle avec décrémentation de CX | — | À auditer |
| LOOPE | Boucle si égalité / ZF=1 | LOOPZ | À auditer |
| LOOPZ | Synonyme de LOOPE | LOOPE | À auditer |
| LOOPNE | Boucle si non-égalité / ZF=0 | LOOPNZ | À auditer |
| LOOPNZ | Synonyme de LOOPNE | LOOPNE | À auditer |

## 5. Sauts conditionnels (conditions et synonymes)

Chaque graphie ci-dessous est conservée comme entrée autonome. Les synonymes ne doivent pas être fusionnés lors de l'audit des noms, même si leur condition et leur encodage sont identiques.

| Mnémotechnique | Condition logique | Alias | Contrôle |
|---|---|---|---|
| JO | OF=1 | — | À auditer |
| JNO | OF=0 | — | À auditer |
| JB | CF=1 | JC, JNAE | À auditer |
| JC | CF=1 | JB, JNAE | À auditer |
| JNAE | CF=1 | JB, JC | À auditer |
| JAE | CF=0 | JNB, JNC | À auditer |
| JNB | CF=0 | JAE, JNC | À auditer |
| JNC | CF=0 | JAE, JNB | À auditer |
| JZ | ZF=1 | JE | À auditer |
| JE | ZF=1 | JZ | À auditer |
| JNZ | ZF=0 | JNE | À auditer |
| JNE | ZF=0 | JNZ | À auditer |
| JBE | CF=1 ou ZF=1 | JNA | À auditer |
| JNA | CF=1 ou ZF=1 | JBE | À auditer |
| JA | CF=0 et ZF=0 | JNBE | À auditer |
| JNBE | CF=0 et ZF=0 | JA | À auditer |
| JS | SF=1 | — | À auditer |
| JNS | SF=0 | — | À auditer |
| JP | PF=1 | JPE | À auditer |
| JPE | PF=1 | JP | À auditer |
| JNP | PF=0 | JPO | À auditer |
| JPO | PF=0 | JNP | À auditer |
| JL | SF≠OF | JNGE | À auditer |
| JNGE | SF≠OF | JL | À auditer |
| JGE | SF=OF | JNL | À auditer |
| JNL | SF=OF | JGE | À auditer |
| JLE | ZF=1 ou SF≠OF | JNG | À auditer |
| JNG | ZF=1 ou SF≠OF | JLE | À auditer |
| JG | ZF=0 et SF=OF | JNLE | À auditer |
| JNLE | ZF=0 et SF=OF | JG | À auditer |

## 6. Pile, registres FLAGS et indicateurs

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| PUSH | Empilement d'un opérande mot | — | À auditer |
| POP | Dépilement d'un opérande mot | — | À auditer |
| PUSHF | Empilement de FLAGS | — | À auditer |
| POPF | Restauration de FLAGS | — | À auditer |
| LAHF | Copie de la partie basse de FLAGS vers AH | — | À auditer |
| SAHF | Copie de AH vers les indicateurs modifiables | — | À auditer |
| CLC | Effacement de CF | — | À auditer |
| STC | Positionnement de CF | — | À auditer |
| CMC | Complément de CF | — | À auditer |
| CLD | Effacement de DF | — | À auditer |
| STD | Positionnement de DF | — | À auditer |
| CLI | Désactivation des interruptions masquables | — | À auditer |
| STI | Activation des interruptions masquables | — | À auditer |

## 7. Entrées/sorties et synchronisation

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| IN | Lecture d'un port d'E/S | — | À auditer |
| OUT | Écriture vers un port d'E/S | — | À auditer |
| HLT | Arrêt du processeur jusqu'à événement de réveil | — | À auditer |
| WAIT | Attente de synchronisation avec le coprocesseur | FWAIT (synonyme de syntaxe à documenter séparément selon l'assembleur) | À auditer |
| ESC | Transfert/échappement vers coprocesseur | — | À auditer |
| LOCK | Préfixe de verrouillage de bus, pas une instruction autonome | — | À auditer |

## 8. Préfixes de répétition

Les préfixes REP sont des octets d'instruction qui modifient le comportement de l'instruction de chaîne suivante. Ils ne doivent pas être comptés comme des opérations indépendantes du même type qu'ADD ou MOV.

| Mnémotechnique | Sens / condition | Alias | Contrôle |
|---|---|---|---|
| REP | Répétition selon CX | — | À auditer |
| REPE | Répéter tant que égalité (ZF=1) | REPZ | À auditer |
| REPZ | Synonyme de REPE | REPE | À auditer |
| REPNE | Répéter tant que non-égalité (ZF=0) | REPNZ | À auditer |
| REPNZ | Synonyme de REPNE | REPNE | À auditer |

## 9. Éléments séparés de l'inventaire matériel

- **Modes d'adressage** (BX+SI, direct, basé-indexé, déplacement, etc.) : formes d'opérandes, pas des mnémotechniques.
- **Directives d'assembleur** (DB, DW, EQU, ORG, PROC, ENDP, END, etc.) : langage d'assemblage, pas instructions du processeur.
- **VECTOR** : directive/concept pédagogique propre au laboratoire, pas une instruction Intel 8086.
- **FWAIT, XLATB, RETF** : graphies d'assembleur ou synonymes historiques rencontrés selon les références et outils ; conserver dans le registre de vérification, mais ne pas les présenter comme graphies canoniques Intel sans confirmation primaire.
- Les instructions du 80186 et des générations suivantes (PUSHA/POPA, ENTER/LEAVE, INS/OUTS, BOUND, décalages immédiats, PUSH immédiat) sont hors périmètre.

## 10. Protocole d'audit par entrée

Pour chaque graphie, consigner séparément :

1. **Statut historique** : instruction Intel 8086, alias documenté, synonyme d'assembleur, préfixe ou hors périmètre.
2. **Formes** : syntaxe exacte, taille, direction, registres admis, mémoire, immédiat, implicite/explicite.
3. **Encodage** : opcode(s), ModR/M, extension /digit, déplacement, immédiat, préfixes et octets compacts.
4. **Restrictions** : registres/segments interdits, tailles incompatibles, restrictions de mémoire, limites de portée et différences 8086/80186+.
5. **FLAGS** : effet bit par bit sur CF, PF, AF, ZF, SF, TF, IF, DF et OF ; distinguer modifié, conservé, conditionnel, restauré et indéfini.
6. **Cycles** : forme exacte, branchement pris/non pris, coût EA applicable, transferts mémoire/pile et notes d'alignement/prélecture.
7. **Support du laboratoire** : tests indépendants du simulateur, de l'assembleur et du désassembleur ; états complet, partiel ou absent.
8. **Sources** : manuel primaire, page/table/section et note d'interprétation.

## Sources primaires de départ

- Intel, *8086 Family User's Manual*, octobre 1979 : https://www.inf.pucrs.br/~calazans/undergrad/orgcomp_EC/mat_microproc/intel-8086_family_Users_Manual.pdf
- Intel, *MCS-86 Macro Assembly Language Reference Manual*, septembre 1979 : https://mark-ogden.uk/files/intel/publications/9800640-02%20MCS-86%20Macro%20Assembly%20Language%20Reference%20Manual-Sep79.pdf

**Important :** les conditions de saut du tableau sont des définitions fonctionnelles usuelles à vérifier avec le tableau Intel ; elles ne remplacent pas l'audit des FLAGS modifiés par l'instruction précédente. Cet inventaire ne constitue pas encore une certification de couverture totale.
