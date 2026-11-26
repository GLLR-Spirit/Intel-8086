# Inventaire canonique — jeu d'instructions Intel 8086

**Statut :** inventaire de travail, à confronter aux tables des manuels Intel avant de déclarer l'exhaustivité certifiée.  
**Périmètre :** instructions du processeur Intel 8086 d'origine (pas 80186/80286+), avec séparation entre mnémotechniques principales, synonymes documentés et préfixes.  
**Règle de comptage :** une ligne = une graphie mnémotechnique ; les alias restent des entrées propres afin de pouvoir les auditer individuellement.

Cet inventaire est indépendant des 58 cartes de l'interface. Il contient un registre de travail des instructions, alias et préfixes ; il n'est pas encore certifié exhaustif et doit être rapproché de chaque tableau Intel pour détecter les omissions. Les statuts réels du simulateur, de l'assembleur et du désassembleur sont consignés séparément dans [coverage-audit-8086.md](coverage-audit-8086.md).

## 1. Instructions et variantes de chaîne

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| MOV | Transfert de données | — | À auditer |
| MOVSB | Chaîne, octet | — | 29/29 tests de chaîne ; source/binaire, mémoire et FLAGS |
| MOVSW | Chaîne, mot | — | 29/29 tests de chaîne ; source/binaire, mémoire et FLAGS |
| CMPSB | Comparaison de chaîne, octet | — | 29/29 tests de chaîne ; source/binaire, FLAGS et index |
| CMPSW | Comparaison de chaîne, mot | — | 29/29 tests de chaîne ; source/binaire, FLAGS et index |
| SCASB | Recherche/comparaison de chaîne, octet | — | 29/29 tests de chaîne ; source/binaire, FLAGS et index |
| SCASW | Recherche/comparaison de chaîne, mot | — | 29/29 tests de chaîne ; source/binaire, FLAGS et index |
| LODSB | Chargement depuis chaîne, octet | — | 29/29 tests de chaîne ; source/binaire, registres et segments |
| LODSW | Chargement depuis chaîne, mot | — | 29/29 tests de chaîne ; source/binaire, registres et segments |
| STOSB | Stockage dans chaîne, octet | — | 29/29 tests de chaîne ; source/binaire, mémoire et FLAGS |
| STOSW | Stockage dans chaîne, mot | — | 29/29 tests de chaîne ; source/binaire, mémoire et FLAGS |
| XCHG | Échange | — | 483/483 ; paires registres 8/16 bits, mémoire, overrides, LOCK, FLAGS source/binaire |
| LEA | Chargement de l'adresse effective | — | 47/47 ; huit EA, huit destinations, déplacements, FLAGS, source/binaire |
| LES | Chargement d'un pointeur far vers ES:registre | — | 69/69 ; pointeurs 16:16, EA, destinations, segments, FLAGS, source/binaire |
| LDS | Chargement d'un pointeur far vers DS:registre | — | 69/69 ; pointeurs 16:16, EA, destinations, segments, FLAGS, source/binaire |
| XLAT | Traduction par table | XLATB (synonyme rencontré dans des assembleurs/documentations postérieurs ; statut canonique à confirmer) | 24/24 tests + 2/2 états source/binaire + cross-check GNU ; débordements et segments vérifiés |

## 2. Arithmétique, ajustement et comparaison

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| ADD | Addition | — | À auditer |
| ADC | Addition avec retenue | — | À auditer |
| SUB | Soustraction | — | À auditer |
| SBB | Soustraction avec emprunt | — | À auditer |
| INC | Incrémentation | — | INC/DEC/NEG : 1976 assertions préfixes et EA, source/binaire |
| DEC | Décrémentation | — | INC/DEC/NEG : 1976 assertions préfixes et EA, source/binaire ; 48 vecteurs FLAGS source/binaire |
| NEG | Négation arithmétique | — | 651 tests ; byte exhaustif et word frontières source/binaire, registres et mémoire |
| CMP | Comparaison par soustraction | — | Tests source/binaire ciblés ; formes ALU et flags comparatifs vérifiés sur main (26/11/2026) |
| MUL | Multiplication non signée | — | Formes 8086 auditées (tranche ciblée) |
| IMUL | Multiplication signée | — | Formes 8086 auditées (tranche ciblée) |
| DIV | Division non signée | — | Formes 8086 auditées (tranche ciblée) |
| IDIV | Division signée | — | Formes 8086 auditées (tranche ciblée) |
| AAA | Ajustement ASCII après addition | — | 6 812 suite BCD ; vecteurs source/binaire et encodage/désassemblage |
| AAS | Ajustement ASCII après soustraction | — | 6 812 suite BCD ; vecteurs source/binaire et encodage/désassemblage |
| AAM | Ajustement ASCII après multiplication | — | 6 812 suite BCD ; vecteurs source/binaire et encodage/désassemblage |
| AAD | Ajustement ASCII avant division | — | 6 812 suite BCD ; vecteurs source/binaire et encodage/désassemblage |
| DAA | Ajustement décimal après addition | — | 6 812 suite BCD ; vecteurs source/binaire et encodage/désassemblage |
| DAS | Ajustement décimal après soustraction | — | 6 812 suite BCD ; vecteurs source/binaire et encodage/désassemblage |
| CBW | Conversion octet signé en mot | — | 256 valeurs AL source/binaire ; 98h, désassemblage et FLAGS préservés |
| CWD | Extension du signe de AX vers DX:AX | — | 16 frontières AX source/binaire ; 99h, désassemblage et FLAGS préservés |

## 3. Logique et manipulation de bits

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| AND | ET logique | — | Tests source/binaire ; table byte exhaustive et formes registre/mémoire/immédiat vérifiées |
| OR | OU logique | — | Tests source/binaire ; table byte exhaustive et formes registre/mémoire/immédiat vérifiées |
| XOR | OU exclusif | — | Tests source/binaire ; table byte exhaustive et formes registre/mémoire/immédiat vérifiées |
| NOT | Complément bit à bit | — | À auditer |
| TEST | ET logique sans stockage du résultat | — | Tests source/binaire ; byte/word, registre/mémoire/immédiat vérifiés ; AF indéfini exclu |
| ROL | Rotation gauche | — | 3529 tests de groupe 2 ; source/binaire, ModR/M et désassemblage |
| ROR | Rotation droite | — | 3529 tests de groupe 2 ; source/binaire, ModR/M et désassemblage |
| RCL | Rotation gauche via CF | — | 3529 tests de groupe 2 ; source/binaire, ModR/M et désassemblage |
| RCR | Rotation droite via CF | — | 3529 tests de groupe 2 ; source/binaire, ModR/M et désassemblage |
| SHL | Décalage logique gauche | SAL | 3529 tests de groupe 2 ; source/binaire, ModR/M et désassemblage |
| SAL | Synonyme de SHL | SHL | Alias de SHL ; couvert par les 3529 tests de groupe 2 |
| SHR | Décalage logique droite | — | 3529 tests de groupe 2 ; source/binaire, ModR/M et désassemblage |
| SAR | Décalage arithmétique droite | — | 3529 tests de groupe 2 ; source/binaire, ModR/M et désassemblage |

## 4. Transfert de contrôle, appels et interruptions

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| JMP | Saut inconditionnel | — | Formes directes et indirectes near/far testées ; source et binaire |
| CALL | Appel de procédure | — | Formes directes et indirectes near/far testées ; source et binaire |
| RET | Retour proche | — | RET/RETF, immédiats, pile et frontières testés source/binaire |
| RETF | Retour lointain (graphie d'assembleur pour le retour intersegment) | Synonyme de syntaxe à vérifier contre le manuel d'assembleur retenu | RET/RETF, immédiats, pile et frontières testés source/binaire |
| INT | Interruption logicielle | — | 10/10 source/binaire ; CD ib et CC INT 3 ; IVT, IF/TF et IRET vérifiés |
| INTO | Interruption si débordement | — | 4/4 tests ; OF, vecteur 4, source/binaire et désassemblage |
| IRET | Retour d'interruption | — | 10/10 source/binaire ; CD ib et CC INT 3 ; IVT, IF/TF et IRET vérifiés |
| JCXZ | Saut si CX vaut zéro | — | Test source/binaire ; CX préservé et cible rel8 vérifiés |
| LOOP | Boucle avec décrémentation de CX | — | Test source/binaire ; CX, FLAGS et cible rel8 vérifiés |
| LOOPE | Boucle si égalité / ZF=1 | LOOPZ | Test source/binaire ; CX, ZF, FLAGS et cible rel8 vérifiés |
| LOOPZ | Synonyme de LOOPE | LOOPE | À auditer |
| LOOPNE | Boucle si non-égalité / ZF=0 | LOOPNZ | Test source/binaire ; CX, ZF, FLAGS et cible rel8 vérifiés |
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
| PUSH | Empilement d'un opérande mot | — | Registres 16 bits, segments, 8 EA mémoire, 4 overrides, source/binaire |
| POP | Dépilement d'un opérande mot | — | Registres 16 bits, ES/SS/DS, 8 EA mémoire, 4 overrides, source/binaire ; POP CS rejeté |
| PUSHF | Empilement de FLAGS | — | 9 FLAGS modélisés, source/binaire, pile équilibrée |
| POPF | Restauration de FLAGS | — | 9 FLAGS modélisés, source/binaire, pile équilibrée |
| LAHF | Copie de la partie basse de FLAGS vers AH | — | 298 tests ; 32 combinaisons de FLAGS source/binaire et octets fixes |
| SAHF | Copie de AH vers les indicateurs modifiables | — | 298 tests ; 256 valeurs AH source/binaire et octets fixes |
| CLC | Effacement de CF | — | 29/29 tests source/binaire ; opcode exact, désassemblage, FLAGS préservés et opérandes rejetés |
| STC | Positionnement de CF | — | 29/29 tests source/binaire ; opcode exact, désassemblage, FLAGS préservés et opérandes rejetés |
| CMC | Complément de CF | — | 29/29 tests source/binaire ; opcode exact, désassemblage, FLAGS préservés et opérandes rejetés |
| CLD | Effacement de DF | — | 29/29 tests source/binaire ; opcode exact, désassemblage, FLAGS préservés et opérandes rejetés |
| STD | Positionnement de DF | — | 29/29 tests source/binaire ; opcode exact, désassemblage, FLAGS préservés et opérandes rejetés |
| CLI | Désactivation des interruptions masquables | — | 29/29 tests source/binaire ; opcode exact, désassemblage, FLAGS préservés et opérandes rejetés |
| STI | Activation des interruptions masquables | — | 29/29 tests source/binaire ; opcode exact, désassemblage, FLAGS préservés et opérandes rejetés |

## 7. Entrées/sorties et synchronisation

| Mnémotechnique | Famille / remarque | Alias ou graphies associées | Contrôle |
|---|---|---|---|
| IN | Lecture d'un port d'E/S | — | 23/23 tests ; huit formes, encodage/désassemblage et source/binaire ; carte de ports logicielle |
| OUT | Écriture vers un port d'E/S | — | 23/23 tests ; huit formes, encodage/désassemblage et source/binaire ; carte de ports logicielle |
| NOP | Aucune opération architecturale | — | 90h ; état/FLAGS préservés, suite d'exécution et désassemblage |
| HLT | Arrêt du processeur jusqu'à événement de réveil | — | F4h ; arrêt effectif avant l'instruction suivante, désassemblage |
| WAIT | Attente de synchronisation avec le coprocesseur | FWAIT (synonyme de syntaxe à documenter séparément selon l'assembleur) | 6 719 assertions globales WAIT/ESC ; WAIT sans effet logiciel, FPU non simulée |
| ESC | Transfert/échappement vers coprocesseur | — | 6 719 assertions globales WAIT/ESC ; 64 codes, 2 048 ModR/M, FPU non simulée |
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


## 11. Première réconciliation des opcodes — tables de référence

Les codes ci-dessous sont les opcodes primaires ou les groupes d'opcodes architecturaux du 8086. Pour les familles utilisant ModR/M, le code indiqué ne suffit pas à décrire une instruction complète : le champ REG ou l'opcode-extension, la taille, le sens et les octets de déplacement/immédiat restent à relever dans la fiche de forme. Les intervalles de sauts conditionnels sont des opcodes courts relatifs.

| Entrée(s) | Opcode(s) / groupe 8086 | Nature de l'encodage | Statut de graphie |
|---|---|---|---|
| AAA | 37h | Opcode fixe | Mnémotechnique d'instruction |
| AAD | D5 0Ah dans la forme 8086 documentée (opcode D5h suivi de 0Ah) | Forme documentée base 10 ; ne pas extrapoler aux processeurs ultérieurs | Mnémotechnique d'instruction |
| AAM | D4 0Ah dans la forme 8086 documentée (opcode D4h suivi de 0Ah) | Forme documentée base 10 ; ne pas extrapoler aux processeurs ultérieurs | Mnémotechnique d'instruction |
| AAS | 3Fh | Opcode fixe | Mnémotechnique d'instruction |
| ADC | 10h–15h ; groupe 80h/81h/83h, extension /2 | Registre/mémoire, accumulateur, immédiat | Mnémotechnique d'instruction |
| ADD | 00h–05h ; groupe 80h/81h/83h, extension /0 | Registre/mémoire, accumulateur, immédiat | Mnémotechnique d'instruction |
| AND | 20h–25h ; groupe 80h/81h/83h, extension /4 | Registre/mémoire, accumulateur, immédiat | Mnémotechnique d'instruction |
| CALL | E8h (near relatif), 9Ah (far direct), FFh /2 (near indirect), FFh /3 (far indirect) | Relatif proche, direct intersegment et indirect via r/m | Mnémotechnique d'instruction |
| CBW | 98h | Opcode fixe | Mnémotechnique d'instruction |
| CLC | F8h | Opcode fixe | Mnémotechnique d'instruction |
| CLD | FCh | Opcode fixe | Mnémotechnique d'instruction |
| CLI | FAh | Opcode fixe | Mnémotechnique d'instruction |
| CMC | F5h | Opcode fixe | Mnémotechnique d'instruction |
| CMP | 38h–3Dh ; groupe 80h/81h/83h, extension /7 | Registre/mémoire, accumulateur, immédiat | Mnémotechnique d'instruction |
| CMPSB / CMPSW | A6h / A7h | Opcode fixe, taille implicite | Mnémotechniques distinctes |
| CWD | 99h | Opcode fixe | Mnémotechnique d'instruction |
| DAA | 27h | Opcode fixe | Mnémotechnique d'instruction |
| DAS | 2Fh | Opcode fixe | Mnémotechnique d'instruction |
| DEC | 48h–4Fh ; FEh /1 (byte), FFh /1 (word) | Registre compact 16 bits ou groupe ModR/M | Mnémotechnique d'instruction |
| DIV | F6h /6 (byte), F7h /6 (word) | Groupe ModR/M | Mnémotechnique d'instruction |
| ESC | D8h–DFh | Opcode + ModR/M | Mnémotechnique d'instruction/coprocesseur |
| HLT | F4h | Opcode fixe | Mnémotechnique d'instruction |
| IDIV | F6h /7 (byte), F7h /7 (word) | Groupe ModR/M | Mnémotechnique d'instruction |
| IMUL | F6h /5 (byte), F7h /5 (word) | Groupe ModR/M | Mnémotechnique d'instruction |
| IN | E4h/E5h (imm8), ECh/EDh (DX) | Port immédiat ou DX, AL/AX | Mnémotechnique d'instruction |
| INC | 40h–47h ; FEh /0 (byte), FFh /0 (word) | Registre compact 16 bits ou groupe ModR/M | Mnémotechnique d'instruction |
| INT | CCh (type 3), CDh ib (type immédiat) | Opcode fixe ou immédiat | Mnémotechnique d'instruction |
| INTO | CEh | Opcode fixe | Mnémotechnique d'instruction |
| IRET | CFh | Opcode fixe | Mnémotechnique d'instruction |
| JA/JNBE | 77h | Saut conditionnel court | Alias de condition |
| JAE/JNB/JNC | 73h | Saut conditionnel court | Alias de condition |
| JB/JC/JNAE | 72h | Saut conditionnel court | Alias de condition |
| JBE/JNA | 76h | Saut conditionnel court | Alias de condition |
| JCXZ | E3h | Saut court relatif | Mnémotechnique d'instruction |
| JE/JZ | 74h | Saut conditionnel court | Alias de condition |
| JG/JNLE | 7Fh | Saut conditionnel court | Alias de condition |
| JGE/JNL | 7Dh | Saut conditionnel court | Alias de condition |
| JL/JNGE | 7Ch | Saut conditionnel court | Alias de condition |
| JLE/JNG | 7Eh | Saut conditionnel court | Alias de condition |
| JMP | E9h (near rel16), EBh (short rel8), EAh (far direct), FFh /4 (near indirect), FFh /5 (far indirect) | Plusieurs formes de transfert | Mnémotechnique d'instruction |
| JNE/JNZ | 75h | Saut conditionnel court | Alias de condition |
| JNO | 71h | Saut conditionnel court | Mnémotechnique d'instruction |
| JNP/JPO | 7Bh | Saut conditionnel court | Alias de condition |
| JNS | 79h | Saut conditionnel court | Mnémotechnique d'instruction |
| JO | 70h | Saut conditionnel court | Mnémotechnique d'instruction |
| JP/JPE | 7Ah | Saut conditionnel court | Alias de condition |
| JS | 78h | Saut conditionnel court | Mnémotechnique d'instruction |
| LAHF | 9Fh | Opcode fixe | Mnémotechnique d'instruction |
| LDS | C5h | ModR/M, destination r16 et source mémoire m16:16 | Mnémotechnique d'instruction |
| LEA | 8Dh | ModR/M, destination r16 et source mémoire effective | Mnémotechnique d'instruction |
| LES | C4h | ModR/M, destination r16 et source mémoire m16:16 | Mnémotechnique d'instruction |
| LOCK | F0h | Préfixe d'instruction | Préfixe, non-opération autonome |
| LODSB / LODSW | ACh / ADh | Opcode fixe, taille implicite | Mnémotechniques distinctes |
| LOOP | E2h | Saut court relatif | Mnémotechnique d'instruction |
| LOOPE/LOOPZ | E1h | Saut court relatif | Synonymes |
| LOOPNE/LOOPNZ | E0h | Saut court relatif | Synonymes |
| MOV | 88h–8Bh, 8Ch, 8Eh, A0h–A3h, B0h–BFh, C6h/C7h | Famille multi-formes ; 8Dh est LEA et 8Fh est POP | Mnémotechnique d'instruction |
| MOVSB / MOVSW | A4h / A5h | Opcode fixe, taille implicite | Mnémotechniques distinctes |
| MUL | F6h /4 (byte), F7h /4 (word) | Groupe ModR/M | Mnémotechnique d'instruction |
| NEG | F6h /3 (byte), F7h /3 (word) | Groupe ModR/M | Mnémotechnique d'instruction |
| NOP | 90h | Opcode fixe | Mnémotechnique d'instruction |
| NOT | F6h /2 (byte), F7h /2 (word) | Groupe ModR/M | Mnémotechnique d'instruction |
| OR | 08h–0Dh ; groupe 80h/81h/83h, extension /1 | Registre/mémoire, accumulateur, immédiat | Mnémotechnique d'instruction |
| OUT | E6h/E7h (imm8), EEh/EFh (DX) | Port immédiat ou DX, AL/AX | Mnémotechnique d'instruction |
| POP | 58h–5Fh (reg16), 8Fh /0 (r/m16), 07h/17h/1Fh (segments) | Plusieurs formes | Mnémotechnique d'instruction |
| POPF | 9Dh | Opcode fixe | Mnémotechnique d'instruction |
| PUSH | 50h–57h (reg16), FFh /6 (r/m16), 06h/0Eh/16h/1Eh (segments) | Plusieurs formes | Mnémotechnique d'instruction |
| PUSHF | 9Ch | Opcode fixe | Mnémotechnique d'instruction |
| RCL | D0h/D1h, D2h/D3h ; groupe C0h/C1h immédiat absent du 8086 | ModR/M /2 ; compte 1 ou CL | Mnémotechnique d'instruction ; ne pas attribuer C0/C1 au 8086 |
| RCR | D0h/D1h, D2h/D3h ; groupe C0h/C1h immédiat absent du 8086 | ModR/M /3 ; compte 1 ou CL | Mnémotechnique d'instruction ; ne pas attribuer C0/C1 au 8086 |
| REP/REPE/REPNE | F3h/F3h/F2h | Préfixes appliqués aux instructions de chaîne | Préfixes, pas opérations autonomes |
| RET | C3h (near), C2h iw (near + ajustement SP), CBh (far), CAh iw (far + ajustement SP) | Retour proche/lointain | Mnémotechnique Intel ; variantes syntaxiques assembleur à distinguer |
| ROL | D0h/D1h, D2h/D3h ; groupe C0h/C1h immédiat absent du 8086 | ModR/M /0 ; compte 1 ou CL | Mnémotechnique d'instruction ; ne pas attribuer C0/C1 au 8086 |
| ROR | D0h/D1h, D2h/D3h ; groupe C0h/C1h immédiat absent du 8086 | ModR/M /1 ; compte 1 ou CL | Mnémotechnique d'instruction ; ne pas attribuer C0/C1 au 8086 |
| SAHF | 9Eh | Opcode fixe | Mnémotechnique d'instruction |
| SAL/SHL | D0h/D1h, D2h/D3h ; groupe C0h/C1h immédiat absent du 8086 | ModR/M /4 ; compte 1 ou CL | Synonymes ; C0/C1 immédiat exclus du 8086 |
| SAR | D0h/D1h, D2h/D3h ; groupe C0h/C1h immédiat absent du 8086 | ModR/M /7 ; compte 1 ou CL | Mnémotechnique d'instruction ; ne pas attribuer C0/C1 au 8086 |
| SBB | 18h–1Dh ; groupe 80h/81h/83h, extension /3 | Registre/mémoire, accumulateur, immédiat | Mnémotechnique d'instruction |
| SCASB / SCASW | AEh / AFh | Opcode fixe, taille implicite | Mnémotechniques distinctes |
| SHL | D0h/D1h, D2h/D3h ; groupe C0h/C1h immédiat absent du 8086 | Alias de SAL, ModR/M /4 ; compte 1 ou CL | Alias de SAL ; C0/C1 immédiat exclus du 8086 |
| SHR | D0h/D1h, D2h/D3h ; groupe C0h/C1h immédiat absent du 8086 | ModR/M /5 ; compte 1 ou CL | Mnémotechnique d'instruction ; ne pas attribuer C0/C1 au 8086 |
| STC | F9h | Opcode fixe | Mnémotechnique d'instruction |
| STD | FDh | Opcode fixe | Mnémotechnique d'instruction |
| STI | FBh | Opcode fixe | Mnémotechnique d'instruction |
| STOSB / STOSW | AAh / ABh | Opcode fixe, taille implicite | Mnémotechniques distinctes |
| SUB | 28h–2Dh ; groupe 80h/81h/83h, extension /5 | Registre/mémoire, accumulateur, immédiat | Mnémotechnique d'instruction |
| TEST | 84h/85h, A8h/A9h, F6h/F7h /0 | Registre/mémoire et accumulateur immédiat | Mnémotechnique d'instruction |
| WAIT | 9Bh | Opcode fixe de synchronisation | Mnémotechnique Intel ; FWAIT est une graphie alternative d'assembleur à confirmer |
| XCHG | 86h/87h (r/m,r), 90h–97h (AX,r16) | ModR/M ou opcode compact | Mnémotechnique d'instruction |
| XLAT | D7h | Opcode fixe | Mnémotechnique Intel ; XLATB est un alias d'assembleur à confirmer |
| XOR | 30h–35h ; groupe 80h/81h/83h, extension /6 | Registre/mémoire, accumulateur, immédiat | Mnémotechnique d'instruction |

### Points importants de cette réconciliation

- Les instructions de décalage/rotation du 8086 utilisent le compte implicite 1 ou le registre CL. Les opcodes C0h/C1h pour compte immédiat appartiennent aux générations ultérieures : ils ne doivent pas être présentés comme encodages 8086.
- Le 8086 encode les retours proches et lointains avec la famille RET ; RETF est une graphie de certains assembleurs, pas une entrée d'opcode indépendante dans cette table.
- LOCK, REP, REPE et REPNE sont des préfixes, pas des opérations indépendantes. Les graphies REPZ et REPNZ sont des synonymes d'assembleur à documenter comme tels.
- Les alias de sauts conditionnels partagent un opcode et une condition ; leur présence séparée dans l'inventaire sert à vérifier la couverture lexicale, pas à compter des opcodes distincts.
- Le tableau est une table de correspondance de premier niveau. Les formes exactes, champs ModR/M, directions, restrictions, octets additionnels et éventuelles variantes restent à documenter dans les fiches de formes.

## 10. Traçabilité documentaire de cette passe

- Intel, *8086 Family User's Manual*, octobre 1979, **Table 2-21 — Instruction Set Reference Data** : mnémotechniques, opérandes, effets FLAGS, cycles, transferts et octets par forme. La même documentation précise les coûts EA et les pénalités de transfert mémoire.
- Intel, *8086 Family User's Manual*, section de codage matériel, notamment la table d'opcodes et les champs d'instruction : structure des octets, champs d'opcode et extensions.
- Intel, *MCS-86 Macro Assembly Language Reference Manual*, septembre 1979 : syntaxe source, opérandes et formes admises par l'assembleur.
- Intel, *ASM86 Language Reference Manual*, novembre 1983, section **The 8086/8087/8088 Instruction Set** et **Instruction Detail Tables** : corroboration secondaire Intel pour les formats, opcodes et variantes ; à ne pas utiliser pour attribuer au 8086 des extensions postérieures.

Les pages exactes doivent être enregistrées dans les fiches détaillées lors de l'audit par forme. Le tableau ci-dessus constitue un rapprochement de premier niveau, pas une preuve suffisante pour chaque variante.


## 12. Statut historique des graphies

| Graphies | Classement provisoire | Décision de cette passe |
|---|---|---|
| Mnémotechniques principales présentes dans la Table 2-21 Intel (ADD, ADC, SUB, SBB, MOV, CALL, JMP, etc.) | Instruction documentée Intel 8086 | **Confirmée au niveau de la famille** ; les formes restent à auditer individuellement |
| Sauts conditionnels synonymes (par ex. JB/JC/JNAE, JE/JZ, JG/JNLE) | Plusieurs noms pour une même condition/opcode | **Alias fonctionnels reconnus** ; présence exacte de chaque graphie dans le manuel d'assembleur Intel à confirmer |
| SHL/SAL | Synonymie de décalage gauche | **Alias à conserver** ; vérifier la graphie admise par l'assembleur cible |
| LOOPE/LOOPZ et LOOPNE/LOOPNZ | Synonymes de boucles conditionnelles | **Alias à conserver** ; vérifier la graphie admise par l'assembleur cible |
| REPZ/REPNZ | Synonymes fréquemment acceptés pour REPE/REPNE | **À confirmer** dans la référence assembleur primaire retenue |
| FWAIT | Graphie alternative de WAIT | **À confirmer** ; même opcode 9Bh si acceptée par l'assembleur |
| XLATB | Graphie alternative de XLAT dans certains assembleurs | **À confirmer** ; le nom Intel de l'instruction est XLAT, opcode D7h |
| RETF | Graphie utilisée par certains assembleurs pour un retour intersegment | **À confirmer** ; Intel documente les formes far de RET sous la famille RET, opcodes CAh/CBh |
| LOCK | Préfixe de verrouillage | **Préfixe confirmé**, pas une instruction autonome |
| REP/REPE/REPNE | Préfixes de répétition | **Préfixes confirmés**, pas des opérations autonomes |

**Sens des statuts :** « confirmée au niveau de la famille » signifie que la famille architecturale est attestée par la documentation Intel consultée ; cela ne valide pas encore chaque syntaxe, variante ou champ d'encodage. « À confirmer » interdit de compter une graphie comme alias Intel vérifié tant que le manuel assembleur primaire ne l'atteste pas.

## 13. Protocole d'audit par entrée

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


## 12. Première matrice de formes — six instructions prioritaires

Une fiche détaillée de première passe est maintenant disponible dans [operand-encoding-8086.md](operand-encoding-8086.md). Elle décompose les formes ModR/M, les opcodes accumulateur-immédiat, les groupes 80h/81h/83h, les restrictions, les effets FLAGS et les cycles actuellement sourcés pour MOV, ADD, ADC, SUB, SBB et CMP.

Cette matrice ne vaut pas validation exhaustive : les timings SUB/SBB et l'audit de chaque forme exacte restent ouverts. Les vecteurs indépendants exécutés valident maintenant un sous-ensemble des formes ADC/SBB ; le format 83h et d'autres variantes restent hors périmètre.


## État de prise en charge — ADC et SBB

ADC et SBB sont maintenant implémentées dans le simulateur, l'assembleur et le désassembleur pour un sous-ensemble de formes 8086 : registre/mémoire, accumulateur-immédiat et groupe immédiat 80h/81h. Le format 83h et l'exhaustivité de chaque forme restent à auditer. Leur inclusion ne signifie donc pas que l'ensemble des instructions 8086 est couvert.


## Matrice de couverture

La matrice actuelle des 93 entrées canoniques, avec statuts séparés pour la documentation, le simulateur, l'assembleur, le désassembleur et les tests, est publiée dans [coverage-audit-8086.md](coverage-audit-8086.md). Le nombre 93 est un dénominateur de travail ; les alias et préfixes sont suivis séparément.

### Directive pédagogique PORT — environnement d'E/S simulé

`PORT numéro, valeur` est une directive propre au laboratoire, et non une instruction Intel 8086. Elle initialise la carte logicielle des ports pour permettre à `IN` de lire une valeur déterministe en mode source. Elle n'émet aucun octet machine. Pour le chemin binaire, l'état des ports est fourni par `initialState.io` ; l'interface d'exécution binaire reprend les directives PORT du programme source courant comme état initial.

Les ports sont des valeurs logicielles 16 bits ; IN/OUT AL tronque ou écrit 8 bits, IN/OUT AX utilise 16 bits. Aucun contrôleur matériel, temporisation de bus ni périphérique n'est simulé.

## 7. Actualisation ciblée — MUL, IMUL, DIV et IDIV

Les formes 8086 à un opérande F6/F7 ont été contrôlées dans l'assembleur, le désassembleur, l'exécution source et l'exécution binaire. Le rapport détaillé et les nombres de tests figurent dans `docs/form-coverage-register-8086.md`, section 16.12. La sélection de segment implicite et explicite est également couverte par `tests/mul-div-segment-selection-8086.cjs` (368 assertions réussies sur le CI `main` du 26 novembre 2026).

Cette mention ne signifie pas que l'inventaire complet des 93 entrées est certifié. Elle indique que les quatre instructions ont franchi leur audit ciblé de formes, d'opérandes, de préfixes et de cas de division.
