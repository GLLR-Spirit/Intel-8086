# Registre de validation différentielle — moteur dynamique 8086

Date : 24 novembre 2026  
Périmètre : comparaison du moteur source assemblé avec le chemin binaire dynamique `fetch → decode → execute`.

## 1. Règle de classement

Les statuts sont attribués par **forme et par moteur**, et non par simple présence d'un mnémonique dans l'interface.

- **Entièrement validée** : toutes les formes 8086 pertinentes, contraintes, encodages, états architecturaux définis, effets mémoire et cas limites ont été vérifiés par des références indépendantes. Aucun mnémonique ne reçoit ce statut global dans cet audit.
- **Partiellement validée** : au moins une forme ou un scénario est vérifié, mais des variantes, restrictions, états, combinaisons ou cas limites restent hors du périmètre.
- **Non prise en charge** : le moteur concerné ne sait pas exécuter ou décoder la forme. Un octet conservé comme `DB` n'est pas une instruction prise en charge.

Une forme peut être valide sur le 8086 mais absente du simulateur. Inversement, le statut partiel ne signifie pas que chaque forme listée est correcte.

## 2. Résultats de la nouvelle suite différentielle

Fichier : [`tests/dynamic-differential.cjs`](../tests/dynamic-differential.cjs)  
Intégration : workflow CI principal, étape « Run dynamic differential audit ».

La suite compare les états des deux moteurs sur :
- les registres généraux, les registres de segment, IP et SP ;
- les neuf indicateurs représentés par le modèle lorsque définis/modélisés ;
- le nombre d'instructions, la sortie et les métadonnées de pile ;
- des adresses mémoire explicitement sélectionnées, sans comparer les octets de code chargés comme s'il s'agissait d'écritures de données du moteur source.

Elle utilise désormais trois niveaux de vérification arithmétique :

1. Formules de référence indépendantes dans le fichier de test, pour les résultats et CF/ZF/SF/OF/PF/AF.
2. Balayage exhaustif des couples d'opérandes 8 bits pour ADD, ADC, SUB et SBB, avec les deux états de retenue pertinents.
3. Vecteurs binaires bruts : octets machine constants, sans passer par l'assembleur du laboratoire, puis comparaison des résultats avec l'oracle.

Le lot étendu comprend également un cadre IRET brut en mémoire, sans métadonnées de pile, avec restauration d'un CS différent et bouclage de SP. Résultat vérifié : **39/39 tests différentiels réussis**, plus 393 216 cas ALU 8 bits exhaustifs, 800 cas de frontière 16 bits, 1 350 exécutions binaires ALU sur octets bruts, 768 combinaisons ModR/M registre-direct, 512 combinaisons Jcc/FLAGS, les huit modes d'adressage avec quatre overrides, un IRET brut et un cycle INT/IVT/IRET. Run CI [45505775488](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45505775488), commit testé `39b342f1611e5f323c951e02830f8274b7109839`.

### Limites méthodologiques

- Les deux moteurs partagent encore des primitives d'exécution. La comparaison source/binaire ne constitue donc pas un oracle indépendant à elle seule.
- Les formules de référence arithmétiques sont indépendantes du simulateur. Le balayage 8 bits est exhaustif pour les quatre opérations et les indicateurs définis ; les vecteurs 16 bits ciblent les frontières et ne couvrent pas les 2^32 couples d'opérandes.
- Les vecteurs binaires bruts vérifient aussi le décodage et le chemin fetch/decode/execute sur un sous-ensemble représentatif, mais ne constituent pas un second émulateur complet.
- La mémoire n'est comparée qu'aux adresses listées par chaque vecteur. Ce n'est pas une comparaison exhaustive du Mio de mémoire.
- Le chemin source peut utiliser des directives pédagogiques comme `VECTOR`, qui ne sont pas présentes dans un flux binaire brut.
- `IRET` fonctionne dans le flux binaire avec un cadre architectural présent à `SS:SP`. `INT imm8` consulte l'entrée correspondante de l'IVT en mémoire, empile FLAGS/CS/IP et transfère le contrôle si les quatre octets de l'entrée IVT sont initialisés. Le gestionnaire peut revenir avec `IRET`.
- Le chargeur n'invente pas de vecteur ni de gestionnaire : sans entrée IVT complète ou sans cadre de retour, l'exécution échoue explicitement.
- Le paramètre facultatif `initialState` de `executeBinary` permet aux tests de précharger les registres, FLAGS et octets mémoire. Le cadre IRET brut ne requiert pas les métadonnées pédagogiques de pile ; si celles-ci existent, leurs types et leur cohérence sont vérifiés.
- La prise en charge logicielle INT/IRET ne constitue pas un processeur d'interruptions complet : les vecteurs doivent être fournis en mémoire ; les interruptions matérielles, l'arbitrage, NMI, DMA et événements asynchrones ne sont pas simulés.
- Les effets de FLAGS architecturaux indéfinis ne doivent jamais être comparés comme s'ils avaient une valeur prescrite.

## 3. Registre par famille

| Instructions / formes | Moteur source | Assembleur | Désassembleur | Exécution binaire dynamique | Statut de validation |
|---|---|---|---|---|---|
| MOV registre/immédiat, registre/mémoire, mémoire/registre, moffs, segments, immédiat vers r/m | Oui, sous-ensemble | Oui, sous-ensemble | Oui, sous-ensemble | Oui pour les formes décodées | Partiel |
| ADD, ADC, SUB, SBB, CMP : registres, mémoire, immédiats et formes 83h testées | Oui | Oui | Oui | Oui pour formes reconnues | Partiel |
| AND, OR, XOR, TEST | Oui | Oui, sous-ensemble | Oui, sous-ensemble | Oui pour formes reconnues | Partiel |
| INC, DEC, NOT, NEG | Oui | Oui, sous-ensemble | Oui, sous-ensemble | Oui pour formes reconnues | Partiel |
| MUL, IMUL, DIV, IDIV | Oui, sous-ensemble | Oui, sous-ensemble | Oui, sous-ensemble | Oui pour formes reconnues | Partiel |
| XCHG | Oui | Oui, sous-ensemble | Oui, sous-ensemble | Oui pour formes reconnues | Partiel |
| LEA, LES, LDS | Oui | Oui | Oui | Oui pour formes reconnues | Partiel |
| PUSH, POP, PUSHF, POPF | Oui, sous-ensemble | Oui, sous-ensemble | Oui, sous-ensemble | Oui pour formes reconnues | Partiel |
| CALL/JMP directs relatifs, Jcc 70h–7Fh, LOOP E2h | Oui | Oui | Oui | Oui | Partiel |
| CALL/JMP indirects near et far ; RET/RETF | Oui, sous-ensemble | Oui, sous-ensemble | Oui, sous-ensemble | Oui pour formes reconnues | Partiel |
| IRET | Oui avec cadre `VECTOR` et pile typée | Pas de directive binaire équivalente à `VECTOR` | Opcode décodé | Exécuté depuis un cadre brut `SS:SP` préchargé en mémoire | Partiel |
| NOP, HLT, CLC, STC, CMC, CLI, STI, CLD, STD | Oui | Oui pour les formes présentes | Oui pour les formes présentes | Oui pour les formes présentes | Partiel |
| MOVSB/MOVSW, CMPSB/CMPSW, SCASB/SCASW, LODSB/LODSW, STOSB/STOSW | Oui | Oui pour les dix opcodes fixes | Oui pour les dix opcodes fixes | Oui, y compris avec répétition | Partiel : formes de chaîne et sémantique REP ciblées, pas audit exhaustif des interactions de préfixes |
| REP/REPE/REPZ/REPNE/REPNZ avec chaînes | Oui, itération CX/ZF | F3/F2 générés | F3/F2 décodés | Oui, réexécution dynamique de l'instruction préfixée | Partiel : seules les instructions de chaîne prises en charge et les combinaisons testées sont couvertes |
| INT imm8 et gestionnaires VECTOR/IVT | Oui avec `VECTOR` et service DOS AH=02h limité | Pas encore de génération binaire par l'assembleur | `CD ib` décodé | Oui si l'entrée IVT et le gestionnaire sont initialisés en mémoire ; service DOS AH=02h conservé | Partiel |
| LOOPE/LOOPZ, LOOPNE/LOOPNZ, JCXZ | Oui | E0h/E1h/E3h | E0h/E1h/E3h | Oui, branchement relatif court | Partiel : alias, limites rel8 et toutes les conditions à compléter par tests indépendants |
| AAA, AAS, AAM, AAD, DAA, DAS, CBW, CWD | Oui, base décimale 10 pour AAM/AAD | OpCodes fixes / D4 0A / D5 0A | Décodés pour les formes 8086 base 10 | Oui | Partiel : vecteurs de bord et oracle BCD exhaustif encore nécessaires |
| SHL, SAL, SHR | Oui | D0h–D3h /4,/5 | Oui | Oui | Partiel : validation indépendante des comptes CL et des FLAGS à étendre |
| ROL, ROR, RCL, RCR, SAR | Oui | D0h–D3h /0–/3,/7 | Oui | Oui | Partiel : vecteurs exhaustifs de rotation, CF et comptes CL à compléter |
| IN, OUT, INTO, XLAT, LAHF, SAHF, WAIT, ESC | Oui, avec ports simulés et ESC/WAIT sans périphérique externe | OpCodes immédiats/fixes et ModR/M ESC | Oui pour les formes décodées | Oui dans le modèle pédagogique | Partiel : E/S déterministes, pas de matériel, TEST ni coprocesseur 8087 |
| LOCK et interactions complètes de préfixes | Préfixe accepté sur un sous-ensemble mémoire verrouillable | F0h émis | F0h décodé | Instruction exécutée en mono-thread | Partiel : aucune atomicité bus/concurrence matérielle ; interactions de préfixes non exhaustives |

**Important :** « Oui » signifie que le chemin existe pour un sous-ensemble de formes, pas que toutes les formes de l'instruction ont été validées. Les tableaux de formes et les tests spécialisés restent les références pour les restrictions exactes.

## 4. Encodages réservés et entrées invalides

Les extensions suivantes sont conservées comme données brutes ou refusées, et ne doivent pas être exécutées comme des instructions valides :

- `F6/F7 /1` ;
- `FF /7` ;
- `C6/C7 /1 à /7` ;
- `8F /1 à /7` ;
- `FF /3` et `FF /5` en mode registre-direct (far indirect exige un opérande mémoire) ;
- préfixes de segment répétés dans le décodeur actuel.

Les flux incomplets sont une classe distincte : ils doivent produire une erreur de troncature, pas un décodage ou une exécution artificiellement complétés.

## 5. Cas CALL, RET, RETF et IRET

- CALL near direct et indirect par registre : comparaison source/binaire ; adresse de retour, SP et pile contrôlés.
- CALL far indirect mémoire et RETF : comparaison source/binaire sur un pointeur `m16:16` et restauration de CS:IP dans le modèle de mémoire partagé.
- JMP near indirect par registre : comparaison source/binaire.
- Les transferts far ne constituent pas un mécanisme de chargement de plusieurs images indépendantes par segment. Les alias physiques et le contenu réellement présent en mémoire restent déterminants.
- RET/RETF avec ajustement impair : forme encodable/décodable mais refusée par le suivi pédagogique de pile, qui travaille par mots.
- INT/IRET : test source avec cadre `VECTOR`, test binaire avec trois mots bruts en mémoire (`IP`, `CS`, `FLAGS`), restauration d'un CS différent et bouclage 16 bits de SP, puis cycle binaire INT → entrée IVT → gestionnaire → IRET. Les interruptions matérielles et l'environnement complet ne sont pas revendiqués.

## 6. Validation CI — extension des familles manquantes

Le workflow principal [45509976522](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45509976522) a terminé avec le statut **success** sur le commit `99d0da55965f7d020199184c4eaf609e1f3ebbb8`.

- Suite différentielle : **66/66 tests réussis, 0 échec**.
- Vecteurs indépendants de l'instruction : **114 tests réussis**.
- Oracle ALU déjà présent : **393 216** cas exhaustifs 8 bits et **800** cas de frontière 16 bits.
- Décalages/rotations : **20 736** cas 8 bits et **504** cas 16 bits.
- Ajustements : **3 072** cas AAA/AAS/DAA/DAS, **256** AAM et **65 536** AAD.
- Extension de signe : **256** CBW et **65 536** CWD.
- Transfert FLAGS : **32** cas SAHF/LAHF ; ESC : **64** codes.
- Les suites existantes conservent aussi les **1 350** exécutions ALU sur octets bruts, **768** combinaisons registre-direct et **512** combinaisons Jcc/FLAGS.

Ces chiffres représentent les cas réellement exécutés par les tests du dépôt. Ils ne doivent pas être interprétés comme une preuve de couverture exhaustive de chaque forme d'opérande, de chaque interaction de préfixe ou du matériel externe.

## 7. Conclusion et seuil d'arrêt

La suite différentielle est renforcée par un oracle indépendant exhaustif pour l'ALU 8 bits et des vecteurs machine bruts. **Cela ne certifie toujours pas l'ensemble du 8086** : toutes les formes d'instruction, tous les états ModR/M, les déplacements, l'ensemble des états mémoire et les périphériques ne sont pas couverts par une référence indépendante exhaustive.

Le seuil « parfait » demandé n'est donc pas atteint. La phase est validée pour son périmètre de tests sur le run CI cité ; le laboratoire doit rester classé comme interpréteur pédagogique partiellement validé, et non comme simulateur 8086 exhaustif.

## 7. Nouvelle passe — familles auparavant absentes (25 novembre 2026)

Les familles précédemment listées comme absentes ont maintenant reçu une implémentation initiale dans le parseur, l'exécution source, l'assembleur, le désassembleur et le chemin binaire :

- LOOPE/LOOPZ, LOOPNE/LOOPNZ et JCXZ : opcodes courts E1h, E0h et E3h.
- AAA, AAS, AAM, AAD, DAA, DAS, CBW et CWD : formes 8086 documentées, AAM/AAD limitées à la base 10.
- ROL, ROR, RCL, RCR, SHL/SAL, SHR et SAR : D0h–D3h, compte 1 ou CL.
- IN/OUT : ports simulés par une table déterministe, initialisable par initialState.io ; aucun matériel d'E/S réel.
- INTO : déclenchement du vecteur 4 lorsque OF=1.
- XLAT, LAHF, SAHF, WAIT et ESC.
- REP/REPE/REPNE et LOCK : préfixes F3h/F2h/F0h sur le sous-ensemble pris en charge.

**Limites explicites :** WAIT est un no-op faute de modélisation de l'entrée TEST ; ESC est un no-op faute de coprocesseur externe/8087 ; LOCK valide et conserve le préfixe mais le moteur mono-thread ne simule ni verrouillage du bus ni concurrence atomique ; les ports IN/OUT sont un modèle logiciel. Les formes de compte, les FLAGS indéfinis, les combinaisons de préfixes et les cas invalides nécessitent encore des matrices indépendantes. Ces instructions restent donc **partiellement validées**, et non certifiées exhaustives.

Les tests différentiels ajoutés couvrent les cas nominaux source/binaire et les principaux encodages. Le statut ne sera élevé qu'après des vecteurs indépendants complets par forme.

### Environnement d'E/S déterministe

La directive pédagogique `PORT imm16, imm16` permet d'initialiser les ports pour l'exécution source ; elle n'est pas un opcode Intel et n'est pas émise dans le flux binaire. L'assembleur expose la table dans ses métadonnées `ports`. Le moteur binaire reçoit cette table par `initialState.io` ; l'interface binaire la reprend depuis les directives PORT présentes dans l'éditeur. Les huit formes IN/OUT immédiat/DX et AL/AX sont testées. Cette abstraction ne simule pas les périphériques ni les cycles matériels.
