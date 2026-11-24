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

Le lot étendu comprend également un cadre IRET brut en mémoire, sans métadonnées de pile, avec restauration d'un CS différent et bouclage de SP. Résultat vérifié : **34/34 tests différentiels réussis**, plus 393 216 cas ALU 8 bits exhaustifs, 800 cas de frontière 16 bits et 1 350 exécutions binaires ALU avec octets bruts. Run CI [45505098359](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45505098359), commit testé `daaab3856e0c0b5f017fa11dd12eeffc4cb35252`.

### Limites méthodologiques

- Les deux moteurs partagent encore des primitives d'exécution. La comparaison source/binaire ne constitue donc pas un oracle indépendant à elle seule.
- Les formules de référence arithmétiques sont indépendantes du simulateur. Le balayage 8 bits est exhaustif pour les quatre opérations et les indicateurs définis ; les vecteurs 16 bits ciblent les frontières et ne couvrent pas les 2^32 couples d'opérandes.
- Les vecteurs binaires bruts vérifient aussi le décodage et le chemin fetch/decode/execute sur un sous-ensemble représentatif, mais ne constituent pas un second émulateur complet.
- La mémoire n'est comparée qu'aux adresses listées par chaque vecteur. Ce n'est pas une comparaison exhaustive du Mio de mémoire.
- Le chemin source peut utiliser des directives pédagogiques comme `VECTOR`, qui ne sont pas présentes dans un flux binaire brut.
- `IRET` fonctionne désormais dans le flux binaire lorsque le programme a un cadre architectural présent en mémoire à `SS:SP`. Le chargeur n'invente toujours pas de cadre : sans trois mots initialisés (IP, CS, FLAGS), l'exécution échoue explicitement.
- Le paramètre facultatif `initialState` de `executeBinary` permet aux tests de précharger les registres, FLAGS et octets mémoire. Le cadre IRET brut ne requiert pas les métadonnées pédagogiques de pile ; si celles-ci existent, leurs types et leur cohérence sont vérifiés.
- La prise en charge d'IRET ne signifie pas que le processeur d'interruptions est complet : le chargement automatique de l'IVT, l'arbitrage matériel, les interruptions externes et les événements asynchrones ne sont pas simulés.
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
| MOVSB/MOVSW, CMPSB/CMPSW, SCASB/SCASW, LODSB/LODSW, STOSB/STOSW | Oui en mode source | Pas de génération binaire complète | Pas de décodage binaire complet | Non | Partiel source ; non pris en charge en binaire |
| REP/REPE/REPZ/REPNE/REPNZ avec chaînes | Oui en mode source, sous-ensemble | Pas de génération complète | Préfixes non pris en charge | Non | Partiel source ; non pris en charge en binaire |
| INT et gestionnaires VECTOR | Simulation pédagogique | Pas de flux autonome équivalent à VECTOR | Couverture binaire limitée | Le chargeur brut ne reçoit pas la table VECTOR | Partiel source ; non équivalent en binaire |
| LOOPE/LOOPZ, LOOPNE/LOOPNZ, JCXZ | Non dans le chemin de contrôle exécuté | Non | Non | Non | Non pris en charge |
| AAA, AAS, AAM, AAD, DAA, DAS, CBW, CWD | Non | Non | Non | Non | Non pris en charge |
| ROL, ROR, RCL, RCR, SHL/SAL, SHR, SAR | Non | Non | Non | Non | Non pris en charge |
| IN, OUT, INTO, XLAT, LAHF, SAHF, WAIT, ESC | Non | Non | Non | Non | Non pris en charge |
| LOCK et interactions complètes de préfixes | Non | Non | Non | Non | Non pris en charge |

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
- IRET : test source avec cadre `VECTOR` et test binaire avec trois mots bruts en mémoire (`IP`, `CS`, `FLAGS`), restauration d'un CS différent et bouclage 16 bits de SP. L'équivalence complète d'un environnement d'interruptions matériel n'est pas revendiquée.

## 6. Validation CI

Le workflow principal [45505098359](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45505098359) a terminé avec le statut **success** sur le commit testé `daaab3856e0c0b5f017fa11dd12eeffc4cb35252`. La suite différentielle rapporte **34/34 tests réussis**, **393 216** vecteurs arithmétiques exhaustifs 8 bits, **800** vecteurs de frontière 16 bits et **1 350** exécutions binaires ALU à partir d'octets bruts.

## 7. Conclusion et seuil d'arrêt

La suite différentielle est renforcée par un oracle indépendant exhaustif pour l'ALU 8 bits et des vecteurs machine bruts. **Cela ne certifie toujours pas l'ensemble du 8086** : toutes les formes d'instruction, tous les états ModR/M, les déplacements, l'ensemble des états mémoire et les périphériques ne sont pas couverts par une référence indépendante exhaustive.

Le seuil « parfait » demandé n'est donc pas atteint. La phase est validée pour son périmètre de tests sur le run CI cité ; le laboratoire doit rester classé comme interpréteur pédagogique partiellement validé, et non comme simulateur 8086 exhaustif.
