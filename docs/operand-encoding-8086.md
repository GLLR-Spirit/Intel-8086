# Formes d'opérandes et encodages — première série 8086

**Périmètre :** MOV, ADD, ADC, SUB, SBB et CMP sur Intel 8086 d'origine.  
**Statut :** première décomposition documentaire ; les points explicitement ouverts restent à vérifier avant clôture.  
**Portée des changements :** documentation uniquement. Le moteur CPU, l'assembleur et le désassembleur ne sont pas modifiés.

Les octets ci-dessous sont les encodages 8086. Les préfixes de segment éventuels précèdent l'opcode et ne sont pas inclus dans les longueurs de base.

## 1. Notation et structure ModR/M

| Notation | Sens |
|---|---|
| r8 / r16 | Registre général 8 / 16 bits |
| r/m8 / r/m16 | Registre ou mémoire de 8 / 16 bits |
| Sreg | ES, CS, SS ou DS |
| imm8 / imm16 | Immédiat sur 8 / 16 bits |
| moffs | Adresse mémoire directe sur 16 bits |
| mod, reg, r/m | Champs du second octet ModR/M |
| EA | Coût de calcul d'adresse effective, à ajouter aux formes mémoire concernées |

Le second octet est organisé en trois champs : mod (2 bits), reg (3 bits), r/m (3 bits).

| mod | Interprétation |
|---|---|
| 00 | Mémoire sans déplacement, sauf r/m=110 : adresse directe disp16 |
| 01 | Mémoire avec déplacement signé disp8 |
| 10 | Mémoire avec déplacement disp16 |
| 11 | Opération registre-registre |

| Code r/m en mode mémoire | Adresse effective |
|---|---|
| 000 | BX + SI |
| 001 | BX + DI |
| 010 | BP + SI |
| 011 | BP + DI |
| 100 | SI |
| 101 | DI |
| 110 | BP, sauf mod=00 : adresse directe disp16 |
| 111 | BX |

| Code registre | r8 | r16 |
|---|---|---|
| 000 | AL | AX |
| 001 | CL | CX |
| 010 | DL | DX |
| 011 | BL | BX |
| 100 | AH | SP |
| 101 | CH | BP |
| 110 | DH | SI |
| 111 | BH | DI |

Le déplacement suit ModR/M. Un déplacement 16 bits est stocké octet faible puis octet fort. Si un immédiat est également présent, il suit le déplacement. Les formes arithmétiques n'autorisent pas mémoire-mémoire ; si la source n'est pas immédiate, l'un des opérandes doit être un registre. Les tailles doivent correspondre.

## 2. MOV — transfert de données

MOV destination, source copie la valeur sans modifier FLAGS.

| Forme | Opcode | Suite d'octets |
|---|---:|---|
| MOV r/m8, r8 | 88 /r | ModR/M + déplacement éventuel |
| MOV r/m16, r16 | 89 /r | ModR/M + déplacement éventuel |
| MOV r8, r/m8 | 8A /r | ModR/M + déplacement éventuel |
| MOV r16, r/m16 | 8B /r | ModR/M + déplacement éventuel |
| MOV r/m16, Sreg | 8C /r | ModR/M + déplacement éventuel |
| MOV Sreg, r/m16 | 8E /r | ModR/M + déplacement éventuel |
| MOV AL, moffs8 | A0 | Adresse directe 16 bits |
| MOV AX, moffs16 | A1 | Adresse directe 16 bits |
| MOV moffs8, AL | A2 | Adresse directe 16 bits |
| MOV moffs16, AX | A3 | Adresse directe 16 bits |
| MOV r8, imm8 | B0–B7 | Immédiat 8 bits |
| MOV r16, imm16 | B8–BF | Immédiat 16 bits, little-endian |
| MOV r/m8, imm8 | C6 /0 | ModR/M + déplacement éventuel + immédiat 8 bits |
| MOV r/m16, imm16 | C7 /0 | ModR/M + déplacement éventuel + immédiat 16 bits |

Restrictions :
- Aucun transfert mémoire-mémoire.
- Les tailles source et destination doivent correspondre.
- Un immédiat ne peut pas être transféré directement vers un registre de segment.
- MOV Sreg,r/m16 utilise 8E /r ; CS n'est pas une destination valide.
- MOV r/m16,Sreg utilise 8C /r ; CS peut être la source.
- Pour C6/C7, seule l'extension ModR/M /0 est valide.
- 8Dh est LEA, pas MOV ; 8Fh appartient à POP.
- Un préfixe de segment éventuel est un octet distinct placé avant l'opcode.

### Cycles MOV — Intel 8086

| Forme | Cycles |
|---|---:|
| mémoire, accumulateur | 10 |
| accumulateur, mémoire | 10 |
| registre, registre | 2 |
| registre, mémoire | 8 + EA |
| mémoire, registre | 9 + EA |
| registre, immédiat | 4 |
| mémoire, immédiat | 10 + EA |
| registre de segment, registre 16 bits | 2 |
| registre de segment, mémoire | 8 + EA |
| registre 16 bits, registre de segment | 2 |
| mémoire, registre de segment | 9 + EA |

## 3. ADD, ADC, SUB, SBB et CMP — opcodes registre/mémoire

| Instruction | r/m8,r8 | r/m16,r16 | r8,r/m8 | r16,r/m16 | Accumulateur, immédiat |
|---|---:|---:|---:|---:|---:|
| ADD | 00 /r | 01 /r | 02 /r | 03 /r | 04 ib / 05 iw |
| ADC | 10 /r | 11 /r | 12 /r | 13 /r | 14 ib / 15 iw |
| SBB | 18 /r | 19 /r | 1A /r | 1B /r | 1C ib / 1D iw |
| SUB | 28 /r | 29 /r | 2A /r | 2B /r | 2C ib / 2D iw |
| CMP | 38 /r | 39 /r | 3A /r | 3B /r | 3C ib / 3D iw |

/r signifie qu'un octet ModR/M suit l'opcode. Les deux formes directionnelles permettent d'encoder registre vers r/m ou r/m vers registre. Avec mod=11, les deux opérandes sont des registres. CMP calcule les indicateurs mais ne stocke pas le résultat.

### Immédiats vers registre ou mémoire

| Instruction | r/m8,imm8 | r/m16,imm16 | r/m16,imm8 étendu avec signe |
|---|---:|---:|---:|
| ADD | 80 /0 ib | 81 /0 iw | 83 /0 ib |
| ADC | 80 /2 ib | 81 /2 iw | 83 /2 ib |
| SBB | 80 /3 ib | 81 /3 iw | 83 /3 ib |
| SUB | 80 /5 ib | 81 /5 iw | 83 /5 ib |
| CMP | 80 /7 ib | 81 /7 iw | 83 /7 ib |

80h cible un opérande octet. 81h cible un mot avec immédiat 16 bits. 83h cible un mot avec immédiat 8 bits étendu avec son bit de signe à 16 bits. L'immédiat suit le ModR/M et le déplacement éventuel. Les mots sont little-endian.

Les extensions /1, /4 et /6 de ces groupes désignent d'autres opérations, pas ADD/ADC/SBB/SUB/CMP. L'opcode 82h n'est pas retenu comme forme documentée dans cette fiche 8086.

### Restrictions communes

- Source et destination ont la même largeur, sauf l'immédiat signé 8 bits de la forme 83h vers une cible mot.
- Pas de mémoire-mémoire.
- Une constante immédiate ne peut pas être la destination.
- Les registres de segment ne sont pas des opérandes de ces cinq instructions.
- Les opcodes accumulateur-immédiat sont des formes compactes spécifiques ; l'assembleur peut choisir une forme de groupe différente si elle est valide.
- Les déplacements précèdent les octets immédiats dans le flux.

## 4. Sémantique et FLAGS

| Instruction | Opération conceptuelle | Écrit le résultat ? | FLAGS affectés |
|---|---|---|---|
| ADD | DEST ← DEST + SRC | Oui | AF, CF, OF, PF, SF, ZF |
| ADC | DEST ← DEST + SRC + CF initial | Oui | AF, CF, OF, PF, SF, ZF |
| SUB | DEST ← DEST − SRC | Oui | AF, CF, OF, PF, SF, ZF |
| SBB | DEST ← DEST − SRC − CF initial | Oui | AF, CF, OF, PF, SF, ZF |
| CMP | Calcul de DEST − SRC | Non | AF, CF, OF, PF, SF, ZF |

TF, IF et DF ne sont pas modifiés par ces opérations.

- CF : retenue non signée pour ADD/ADC ; emprunt pour SUB/SBB/CMP.
- OF : débordement signé.
- AF : retenue ou emprunt entre les demi-octets.
- ZF : résultat nul.
- SF : bit de signe du résultat tronqué à la largeur de l'opération.
- PF : parité paire des huit bits de poids faible du résultat.

Pour ADC et SBB, CF entrant est consommé avant que CF sortant soit recalculé. Il ne faut pas traiter CF comme un indicateur conservé.

## 5. Cycles arithmétiques et CMP

Les valeurs suivantes sont les références du 8086, hors surcoût de mot à adresse impaire. La table Intel 2-21 donne explicitement ces catégories pour ADD et ADC ; la ligne CMP est indiquée séparément ci-dessous. La confirmation de chaque ligne SUB/SBB dans la table de timing dédiée reste ouverte.

| Forme ADD/ADC ; SUB/SBB à confirmer individuellement | Cycles |
|---|---:|
| registre, registre | 3 |
| registre, mémoire | 9 + EA |
| mémoire, registre | 16 + EA |
| registre, immédiat | 4 |
| mémoire, immédiat | 17 + EA |
| accumulateur, immédiat | 4 |

CMP — valeurs de la table Intel 2-21 :

| Forme | Cycles |
|---|---:|
| registre, registre | 3 |
| registre, mémoire | 9 + EA |
| mémoire, registre | 9 + EA |
| registre, immédiat | 4 |
| mémoire, immédiat | 10 + EA |
| accumulateur, immédiat | 4 |

Sur le 8086, ajouter 4 cycles pour chaque transfert de mot 16 bits à adresse mémoire impaire. La file de prélecture, les accès bus, les attentes externes et les conditions système peuvent augmenter le temps réel. Ces cycles ne constituent pas un chronométrage exact d'un programme complet ; le laboratoire ne simule pas ces phénomènes matériels.

## 6. Vecteurs de contrôle à ajouter aux tests

Les cas suivants sont des propositions de tests, pas l'annonce de tests exécutés.

| Domaine | Vecteur positif | Contrôle négatif ou sémantique |
|---|---|---|
| MOV registre immédiat | B8 34 12 → MOV AX,1234h | Immédiat vers CS refusé |
| MOV registre-registre | 8B C3 → MOV AX,BX | Tailles incompatibles refusées |
| MOV mémoire-registre | 89 1E 00 20 → MOV [2000h],BX | Mémoire-mémoire refusée |
| MOV mémoire immédiat | C7 06 00 20 34 12 → MOV WORD PTR [2000h],1234h | Extension ModR/M autre que /0 rejetée |
| MOV segment | 8E D8 → MOV DS,AX | 8E C8 (destination CS) rejeté |
| ADD | 03 C3 → ADD AX,BX | Mémoire-mémoire refusée |
| ADD immédiat étendu | 83 C0 FF → ADD AX,-1 | Vérifier l'extension signée |
| ADC | 11 D8 → ADC AX,BX | Tester CF entrant égal à 0 puis à 1 |
| SBB | 19 D8 → SBB AX,BX | Tester emprunt entrant et CF sortant |
| SUB | 29 D8 → SUB AX,BX | Tester CF et OF indépendamment |
| CMP | 39 D8 → CMP AX,BX | AX et BX doivent rester inchangés |
| CMP immédiat | 83 F8 FF → CMP AX,-1 | FLAGS modifiés sans écriture de destination |

Séparer les suites de tests :
1. Simulateur : résultat, registres, mémoire et FLAGS.
2. Assembleur : source vers octets exacts et diagnostics de formes interdites.
3. Désassembleur : octets vers mnémonique/opérandes, flux tronqués et extensions ModR/M invalides.

Les octets de référence du désassembleur doivent être écrits indépendamment ; ne pas utiliser l'assembleur testé comme unique oracle.\n\n### Suite automatisée ajoutée\n\nLe fichier [tests/instruction-vectors.cjs](../tests/instruction-vectors.cjs) contient maintenant des vecteurs indépendants pour l'assembleur, le désassembleur et le simulateur. Les octets attendus sont codés littéralement dans les tests ; le désassembleur reçoit donc des octets fixes, et non le résultat de l'assembleur testé. Le workflow CI exécute cette suite après les tests de fumée. Au run 196, les 24 contrôles de cette suite et les 354 tests de fumée ont réussi.\n\n**Limite détectée dans le code actuel :** ADC et SBB sont absents de la liste des instructions exécutables et des familles encodées par `encodingBytes`. Les tests les signalent donc comme non prises en charge, au lieu de les déclarer validées. Leur présence dans les tables d'architecture ne signifie pas que le laboratoire les implémente.

## 7. État de clôture

- MOV : formes principales et segmentaires recensées ; contrôle final de chaque encodage et restriction encore requis.
- ADD/ADC : formes registre/mémoire, accumulateur-immédiat et groupes immédiats décomposés.
- SUB/SBB : opcodes et extensions de groupe répertoriés ; confirmation documentaire des temps par forme encore ouverte.
- CMP : formes et temps de la table Intel 2-21 consignés ; absence d'écriture de destination explicitée.
- FLAGS : effets de famille documentés ; cas limites et vecteurs de validation non encore exécutés.
- Support réel du laboratoire : non réévalué dans cette phase documentaire.

## Sources primaires

1. Intel, 8086 Family User's Manual, octobre 1979 : descriptions arithmétiques et FLAGS, pp. 2-35 à 2-38 ; table 2-21 pour MOV, ADD, ADC et CMP ; chapitre 4 pour les formats binaires. https://www.inf.pucrs.br/~calazans/undergrad/orgcomp_EC/mat_microproc/intel-8086_family_Users_Manual.pdf
2. Intel, MCS-86 Macro Assembly Language Reference Manual, septembre 1979 : chapitre 4 pour opérandes et modes d'adressage ; chapitre 5, entrées MOV, ADC, ADD et CMP pour formes, encodages et notations. https://bitsavers.org/pdf/intel/ISIS_II/9800640-02_MCS-86_Macro_Assembly_Language_Manual_Sep79.pdf

Les points marqués ouverts ne doivent pas être transformés en affirmations définitives.


## Mise à jour — implémentation ADC et SBB

ADC et SBB sont désormais intégrées au simulateur, à l'assembleur et au désassembleur pour les formes registre/mémoire, accumulateur-immédiat et immédiat vers r/m avec les opcodes de groupe 80h/81h. Les formes 83h à immédiat signé court ne sont pas encore générées/décodées.

Le simulateur lit CF entrant avant le calcul : ADC effectue DEST + SRC + CF ; SBB effectue DEST − SRC − CF. Les indicateurs AF, CF, OF, PF, SF et ZF sont recalculés à partir du résultat. Les vecteurs indépendants couvrent CF entrant à 0 et à 1, les cas 8/16 bits, retenue/emprunt sortants, débordement signé, encodages accumulateur et mémoire immédiate, et décodage de flux binaires fixes. Le statut de CI doit être consulté avant de considérer cette phase validée.
