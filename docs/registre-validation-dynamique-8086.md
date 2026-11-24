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

Elle utilise également des oracles arithmétiques indépendants pour ADD, ADC, SUB et SBB, des résultats fixes pour AND/OR/XOR/TEST, ainsi que des cas de branchement, de pile, de préfixes et d'encodages invalides.

Dernier résultat observé pour cette suite : **25/25 tests réussis** avant l'extension supplémentaire. Le résultat du workflow après l'extension doit être consulté dans la section de validation CI ci-dessous et dans l'historique Actions.

### Limites méthodologiques

- Comparer deux moteurs partageant le même parseur, les mêmes primitives arithmétiques ou le même interpréteur détecte des divergences entre chemins, mais ne prouve pas à lui seul la justesse de leur implémentation commune.
- Les oracles indépendants couvrent les cas explicitement codés ; ils ne constituent pas une preuve exhaustive sur toutes les valeurs d'opérandes.
- La mémoire n'est comparée qu'aux adresses listées par chaque vecteur. Ce n'est pas une comparaison exhaustive du Mio de mémoire.
- Le chemin source peut utiliser des directives pédagogiques comme `VECTOR`, qui ne sont pas présentes dans un flux binaire brut.
- `IRET` est vérifié dans le moteur source avec un cadre `VECTOR`. Dans le chargeur binaire brut, aucun cadre d'interruption n'est fourni automatiquement ; un `IRET` sans cadre doit donc être refusé.
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
| IRET | Oui avec cadre pédagogique `VECTOR` | Non autonome | Opcode décodé | Décodé, mais nécessite un cadre déjà présent | Partiel |
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
- IRET : test source avec cadre `VECTOR`, plus test de rejet du flux binaire sans cadre. L'équivalence complète d'un environnement d'interruptions matériel n'est pas revendiquée.

## 6. Conclusion et seuil d'arrêt

La suite différentielle renforce la confiance dans les scénarios comparés. **Elle ne rend pas la vérification parfaite** : il manque encore une validation indépendante exhaustive de toutes les formes, des valeurs ModR/M, des déplacements, des états initiaux, des effets de pile, des interruptions et des cas limites de mémoire.

Le seuil « parfait » demandé n'est donc pas atteint. La phase peut être déclarée réussie pour son périmètre de tests uniquement lorsque le workflow CI final est vert ; le laboratoire, lui, doit rester classé comme interpréteur pédagogique partiellement validé, et non comme simulateur 8086 exhaustif.
