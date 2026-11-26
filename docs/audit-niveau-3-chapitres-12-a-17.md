# Rapport d'audit pédagogique — niveau 3, chapitres 12 à 17

Date : 25 novembre 2026  
Branche : `audit/niveau-3-chapitres-12-17`  
Périmètre : chapitres 12 à 17, 18 leçons, 54 questions intermédiaires et 60 questions finales.

## 1. Corrections apportées

- Chapitre 13, leçon 1 : suppression du qualificatif `SHORT` non accepté par le parseur. Le cours montre maintenant le choix automatique du saut court et son encodage `EB 03`.
- Pendant l'exécution, le contrôle a aussi révélé une ancienne assertion de test qui utilisait ce même qualificatif non pris en charge ; l'assertion a été corrigée.
- Le contrôle de structure a révélé que la première version de la banque intermédiaire avait une imbrication incorrecte et seulement six groupes. Elle a été restructurée en 18 groupes distincts de trois questions ; le rattachement par leçon a été vérifié.
- Chapitre 13, leçon 2 : remplacement de l'exemple indirect redondant par un `JMP` direct relatif dont la cible est à +130 octets. L'assembleur doit produire `E9 82 00`, et non un saut court.
- Chapitre 13, leçon 3 : maintien d'un exemple distinct de `JMP BX`, saut indirect near encodé `FF E3`.
- Chapitre 17 : les exemples démontrent désormais le calcul séparé du maximum et du minimum, la somme et le comptage d'éléments, puis une recherche séquentielle réelle dans un tableau de trois octets.
- Les 54 questions intermédiaires sont réparties en 18 groupes de trois questions, un groupe par leçon. Les 60 questions finales sont réparties en six groupes de dix questions. La répartition contrôlée est `[3, 3, 3, 3, 3, 3]` pour chacune des six leçons intermédiaires et `[10, 10, 10, 10, 10, 10]` pour les six évaluations finales.

## 2. Résultats exécutés

| Contrôle | Résultat |
|---|---:|
| Compilation syntaxique des scripts de test | Réussie |
| Auto-tests navigateur Playwright sur Chromium | **Réussis** |
| Workflow CI complet sur le commit `8103475` | **Réussi** |
| 14 suites de validation du moteur | **Toutes réussies** |
| Auto-tests intégrés de l'application | **375/375 réussis** |
| Exemples pédagogiques assemblés et exécutés | **18/18** |
| Modes d'exécution comparés | Interpréteur source et exécution du flux binaire |
| Conditions Jcc testées dans les deux sens | **32/32** |
| Opcodes des 16 conditions Jcc | **16/16** |
| Opcodes LOOPNE, LOOPE, LOOP, JCXZ | **4/4** |
| Questions intermédiaires | **54/54** |
| Questions finales | **60/60** |
| Échecs relevés lors de cette exécution | **0** |

### Détails des contrôles

- Les 18 exemples ont été assemblés puis exécutés avec le moteur d'interprétation source et avec le chemin d'exécution du flux binaire décodé. Les registres et indicateurs attendus ont été comparés aux résultats.
- Les 16 conditions Jcc ont chacune été vérifiées avec un cas vrai et un cas faux. Les opcodes attendus de `70h` à `7Fh` ont également été contrôlés.
- Les quatre opcodes de boucle ont été contrôlés : `E0h` (LOOPNE), `E1h` (LOOPE), `E2h` (LOOP) et `E3h` (JCXZ).
- Des contrôles complémentaires vérifient la préservation des FLAGS par LOOP, le décrémentement de CX de `0000h` à `FFFFh`, ainsi que les deux conditions de LOOPE et LOOPNE.
- Les encodages distinctifs du chapitre 13 ont été contrôlés : `EB 03`, `E9 82 00` et `FF E3`.

## 3. Méthode et limites de validation

L'exécution des tests a été effectuée dans un environnement JavaScript isolé, avec des éléments DOM simulés pour initialiser l'application. Le moteur réel du projet, ses fonctions d'assemblage, d'interprétation et d'exécution binaire ont été appelés ; il ne s'agit donc pas uniquement d'une vérification textuelle.

Le workflow Playwright GitHub Actions a exécuté le site dans Chromium headless. Le chargement de la page, les auto-tests intégrés (376/376), les 18 exemples, les 16 conditions Jcc dans les deux sens, les quatre opcodes de boucle, les vérifications de questions et le test interactif XLAT via le bouton réel « Pas à pas » ont réussi. Le workflow CI principal a également terminé avec succès toutes ses étapes sur le commit `8103475c6867cfd88929b4e91623d7da8a8bc6aa`.

L'exécution binaire reste celle du simulateur logiciel du projet. Elle ne prouve pas une équivalence matérielle complète avec un processeur Intel 8086 physique : les signaux de bus, la prélecture BIU, les temporisations et les cycles matériels ne sont pas reproduits. Les résultats internes ne remplacent pas non plus une comparaison avec un assembleur/désassembleur indépendant externe.

## 4. État de validation

Les contrôles ciblés du niveau 3 pour les chapitres 12 à 17 sont réussis, y compris l’exécution Chromium et le workflow CI complet. Cela valide cette phase de contrôle automatisé, mais ne constitue pas l’audit exhaustif de l’ensemble des 36 chapitres ni une validation matérielle complète du 8086. Les vérifications architecturales indépendantes complémentaires restent à poursuivre.

À la date de rédaction de ce rapport (25 novembre 2026), aucune modification n'avait encore été fusionnée dans `main`.


## 5. Audit complémentaire de XLAT (D7h)

Date : 25 novembre 2026  
Commit audité : `8103475c6867cfd88929b4e91623d7da8a8bc6aa`

L'implémentation de XLAT dans `index.html` n'a pas été modifiée : aucune anomalie fonctionnelle certaine n'a été démontrée pendant cette intervention. Le travail a porté sur le renforcement des preuves de test.

### Tests ajoutés

| Fichier | Portée | Résultat |
|---|---|---:|
| `tests/xlat-state-8086.cjs` | Préservation des registres généraux, des segments et des 9 FLAGS, source et binaire | **2/2** |
| `tests/xlat-gnu-crosscheck.cjs` | Comparaison de l'assembleur du projet avec GNU as en mode .code16 | **Réussi** |
| `tests/xlat-interactive-8086.cjs` | Exécution réelle dans Chromium via le bouton « Pas à pas » | **Réussi** |

### Résultats vérifiés

- La lecture source et la lecture binaire conservent AH, BX, CX, DX, SP, BP, SI, DI, CS, DS, ES, SS et les neuf indicateurs suivis par le simulateur.
- AL reçoit bien l'octet de la table ; l'exemple interactif vérifie notamment `AX=5A03h` avant XLAT puis `AX=5AC7h` après `ES: XLAT`.
- Le test navigateur exécute les 19 instructions préparatoires puis déclenche XLAT par le bouton réel « Pas à pas » ; il contrôle l'état affiché avant et après l'instruction.
- GNU as 2.46 en mode `.code16` et l'assembleur du projet produisent les mêmes octets : `D7 26 D7 2E D7 36 D7 3E D7` (XLAT sans préfixe, puis ES, CS, SS et DS).
- La suite initiale `tests/xlat-8086.cjs` reste à **24/24**.
- Les tests de conservation et le contrôle GNU sont intégrés au workflow CI principal ; le test navigateur est intégré au workflow Playwright.

### Exécutions CI

- Workflow principal : run **714**, succès, commit `8103475c6867cfd88929b4e91623d7da8a8bc6aa`.
- Workflow navigateur : run **186**, succès, même commit.
- Les étapes XLAT existantes (24 tests), conservation (2 tests) et comparaison GNU as ont toutes réussi.
- Auto-tests intégrés de l'application : **376/376**.

### Conclusion XLAT

Les contrôles ciblés demandés pour cette intervention sont réussis : conservation architecturale dans les chemins source et binaire, exécution interactive réelle, et comparaison indépendante des octets émis. XLAT peut être considérée comme validée pour ce périmètre logiciel testé.

Cette conclusion ne prouve pas une équivalence matérielle complète avec un processeur Intel 8086 physique. Elle ne remplace pas non plus une validation sur silicium ou une campagne exhaustive de toutes les conditions externes.


## 6. Audit approfondi de XCHG (86h, 87h, 90h–97h)

Date : 25 novembre 2026  
Commit validé pour les tests XCHG : `2a264cc551e0c65a94baba58f005ef56f88d5916`

### Périmètre et résultats

La suite XCHG initiale affichait 471 tests. Elle a été étendue et comporte maintenant **483 assertions réussies, 0 échec**.

| Domaine | Résultat |
|---|---:|
| Paires de registres 8 bits | 64 |
| Paires de registres 16 bits | 64 |
| Formes mémoire | 26 |
| Préfixes de segment | 12 |
| Vérifications de préservation des FLAGS | 311 |
| Formes interdites | 9 |
| Cas particuliers | 12 |
| Exécutions binaires | 157 |
| Total de la suite XCHG | **483/483** |

Les contrôles couvrent les huit registres 8 bits, les huit registres 16 bits, les échanges registre-registre, les échanges registre-mémoire, les huit formes d'adressage effectif, les deux largeurs, les deux ordres d'opérandes, les préfixes ES/CS/SS/DS, les déplacements signés limites, la préservation des neuf FLAGS suivis par le simulateur, les formes invalides et les formes LOCK.

### Vérification indépendante des encodages

Le nouveau fichier `tests/xchg-gnu-crosscheck.cjs` compare **170 instructions XCHG** avec GNU Assembler (GNU Binutils 2.46), en mode `.code16`.

Le corpus comprend :
- 64 paires de registres 8 bits et 64 paires de registres 16 bits ;
- les huit modes d'adressage mémoire, en byte et word, avec les deux ordres d'opérandes ;
- les déplacements disp8 aux limites -128/+127 et disp16 aux limites -32768/+32767 ;
- les préfixes de segment ES, CS, SS et DS ;
- la forme LOCK sur opérande mémoire.

Résultat : les octets émis par l'assembleur du projet correspondent exactement à ceux de GNU as. Des vecteurs fixes supplémentaires contrôlent les octets représentatifs des familles 86h, 87h et 90h–97h.

### Exécution interactive

Le fichier `tests/xchg-interactive-8086.cjs` utilise Chromium et le véritable bouton « Pas à pas ».

Il exécute :
- un échange mémoire-mot avec lecture de contrôle de la mémoire après l'échange ;
- un échange mémoire-octet avec lecture de contrôle de la mémoire après l'échange ;
- des vérifications avant/après des registres et des neuf FLAGS suivis par le simulateur.

Résultat : **test interactif réussi** dans le workflow Playwright.

### Corrections documentaires démontrées

L'audit a identifié deux erreurs dans la fiche XCHG de `index.html`, corrigées sans modifier le moteur d'exécution :

1. **Temporisations 8086 :** les formes registre-registre 86h/87h sont données à 4 cycles ; la forme compacte AX 90h–97h est à 3 cycles ; la forme mémoire est donnée à 17 cycles + EA. La fiche précédente attribuait 3 cycles à toutes les formes registre-registre.
2. **LOCK et 8086 :** la fiche précédente affirmait qu'un échange mémoire verrouillait implicitement le bus. Le manuel Intel 8086 de 1979 indique au contraire qu'il faut le préfixe LOCK pour empêcher un autre maître de bus d'intervenir entre les deux cycles d'un échange mémoire. La fiche précise désormais le rôle du préfixe, le mode maximum du 8086 et les limites du simulateur.

Le moteur d'échange XCHG n'a pas nécessité de correction fonctionnelle démontrée pendant cette intervention. La modification de `index.html` porte sur la documentation technique.

### Workflows GitHub Actions

- CI principal : run **45605620164**, succès, commit `2a264cc551e0c65a94baba58f005ef56f88d5916`.
- Audit navigateur Playwright : run **45605620273**, succès, même commit.
- Auto-tests intégrés : **376/376**.
- Audit XCHG : **483/483**.
- Comparaison GNU as : **170 instructions, octets identiques**.
- Test interactif XCHG : **réussi**.

### Limites de validation

La comparaison GNU as valide l'encodage, pas le comportement électrique du bus. Le simulateur ne reproduit pas les signaux physiques LOCK, l'arbitrage entre maîtres de bus ni les deux cycles de transfert au niveau matériel. Les tests valident les effets architecturaux simulés, les octets, la mémoire, les registres et les FLAGS ; ils ne constituent pas une certification sur processeur Intel 8086 physique.


## 7. Audit approfondi de LEA (8Dh /r)

Date : 25 novembre 2026  
Commit testé : `f56961f6d16c7a335e2221f029b42d6c85ed5709`

### Règles architecturales contrôlées

- `LEA r16,m` calcule l'offset effectif de l'opérande mémoire et le place dans le registre général 16 bits.
- L'instruction ne lit pas l'octet ou le mot situé à cette adresse.
- Les registres de segment ne font pas partie du résultat ; un préfixe ES/CS/SS/DS n'altère pas l'offset calculé.
- Les neuf indicateurs suivis par le simulateur restent inchangés.
- Opcode : `8Dh /r`. Le champ ModR/M doit désigner la mémoire (`mod != 11b`) ; la forme registre-direct est invalide sur 8086.
- Temporisation de référence : 2 cycles + EA.

Références architecturales consultées : Intel 8086 Family User's Manual (1979), iAPX 88 Book (1983) et ASM86 Language Reference Manual. Elles confirment le calcul de l'offset, la source mémoire obligatoire, la destination registre général 16 bits et l'absence d'effet sur FLAGS.

### Défaut corrigé

Le premier audit a révélé un défaut dans le désassembleur/exécuteur binaire pour les formes préfixées, par exemple :

`LEA CX, ES:[BX+SI+4]`

Le décodeur reconstruisait l'opérande mémoire sans le qualificatif `WORD PTR`, puis une validation générique rejetait le préfixe de segment faute de reconnaître cette forme comme une instruction mémoire. L'instruction était transformée à tort en données `DB`, ce qui interrompait l'exécution binaire.

Correction dans `index.html` : la validation des préfixes reconnaît désormais explicitement LEA avec une opérande entre crochets. Le préfixe reste décodé, mais l'exécution LEA ne consulte que l'offset ; il ne provoque aucun accès mémoire et ne change pas le résultat.

### Suite LEA dédiée

Le fichier `tests/lea-8086.cjs` contient **47/47 tests réussis** :

- Les huit modes d'adressage 8086 : BX+SI, BX+DI, BP+SI, BP+DI, SI, DI, BP et BX.
- L'adressage direct disp16.
- Les huit registres généraux 16 bits comme destination : AX, CX, DX, BX, SP, BP, SI et DI.
- Déplacements disp8/disp16 : -32768, -129, -128, -1, 0, +1, +127, +128 et +32767.
- Calcul EA modulo 16 bits.
- Différence entre offset et contenu mémoire : l'adresse calculée est retournée alors que la donnée présente à cette adresse reste inchangée.
- Préfixe ES : l'offset est identique et le segment n'est pas modifié.
- Préservation des neuf FLAGS dans les chemins source et binaire.
- Rejets des destinations mémoire, immédiates, 8 bits et registres de segment ; source registre/immédiate ; BYTE PTR ; combinaisons de registres invalides ; déplacements hors plage.
- Encodages fixes et rejet du ModR/M registre-direct.

Chaque cas d'exécution compare le résultat du chemin source avec celui de l'exécution du flux binaire décodé.

### Comparaison indépendante

Le fichier `tests/lea-gnu-crosscheck.cjs` compare **80 instructions LEA** avec GNU as (GNU Binutils 2.46), en mode `.code16` :

- 64 combinaisons : huit destinations × huit modes d'adressage.
- Neuf valeurs limites de déplacement.
- Adressage direct disp16.
- Cas spécial [BP] avec disp8 nul.
- Préfixes de segment explicites.

Résultat : octets émis identiques pour les 80 instructions. Les vecteurs fixes contrôlent également `8D 40 04`, `8D 16 34 12` et `8D 46 00`.

### Exécution interactive et régressions

- Chromium/Playwright : LEA exécutée avec le véritable bouton « Pas à pas », préfixe ES, contrôle du résultat CX, lecture mémoire de vérification après LEA, segments et neuf FLAGS : **réussi**.
- Auto-tests intégrés dans Chromium : **376/376**.
- Workflow CI principal : run **45651773823**, succès.
- Workflow navigateur : run **45651773207**, succès.
- Suite LEA : **47/47**.
- Comparaison GNU as : **80/80 instructions, octets identiques**.

### Conclusion LEA

LEA est validée pour le périmètre logiciel audité : calcul de l'offset, modes d'adressage, destinations, déplacements, FLAGS, assemblage, désassemblage, exécution source et binaire, préfixe de segment, interface interactive et comparaison indépendante des encodages.

Cette conclusion ne constitue pas une validation sur processeur physique. Le simulateur ne reproduit pas les signaux électriques ni les cycles de bus réels. LDS et LES ne sont pas inclus dans cette conclusion et feront l'objet d'audits distincts.


## 8. Audit approfondi de LDS et LES (C5h /r et C4h /r)

Date : 25 novembre 2026  
Commit de code audité : `f56f79e41a4fa1e4a659995409fd4c990185bf3c`  
Commit de correction de temporisation : `9113a791284886e2ffefb93d6543f5e71e15f12f`

### Règles architecturales de référence

- `LES r16,m16:16` lit un pointeur far de 32 bits en mémoire : le premier mot (octets EA et EA+1) est l'offset chargé dans le registre général ; le second mot (EA+2 et EA+3) est le segment chargé dans ES.
- `LDS r16,m16:16` effectue le même transfert, mais charge DS.
- La source doit être en mémoire ; la destination est l'un des huit registres généraux 16 bits. Une source registre-direct n'est pas valide.
- Les deux mots sont little-endian. Les neuf FLAGS modélisés sont inchangés.
- Encodage : `LES = C4h /r`, `LDS = C5h /r`. Le champ REG du ModR/M sélectionne le registre général destination ; le champ r/m décrit l'opérande mémoire.
- Préfixe de segment : sélectionne le segment de lecture de la source ; il ne change pas le registre de segment destination imposé par l'opcode.
- Temporisation de référence 8086 : 16 cycles + EA.

Références consultées : Intel 8086 Family User's Manual (1979) et ASM86 Assembly Language Reference Manual (1985/1983). Le manuel ASM86 donne explicitement l'ordre offset puis segment, les octets EA à EA+3, les effets sur DS/ES, l'absence d'effet sur FLAGS et 16 + EA. <https://www.inf.pucrs.br/~calazans/undergrad/orgcomp_EC/mat_microproc/intel-8086_family_Users_Manual.pdf> ; <https://mark-ogden.uk/files/intel/publications/122385-001%20ASM86%20Assembly%20Language%20Reference%20Manual-Jun85.pdf>

### Défaut corrigé

Le désassembleur rejetait les formes binaires avec préfixe de segment, par exemple `LDS CX, ES:[BX+SI+4]` et `LES CX, ES:[BX+SI+4]`. La validation générique des préfixes ne reconnaissait pas ces deux mnémotechniques comme des instructions dont l'opérande mémoire est exprimée entre crochets.

Correction dans `index.html` : les formes LDS/LES avec opérande mémoire préfixée sont désormais reconnues. Le préfixe est conservé pour sélectionner le segment source ; l'instruction charge toujours DS pour LDS et ES pour LES. La métadonnée de temporisation a aussi été corrigée en `16 cycles + EA`.

### Suite LDS/LES dédiée

Le fichier `tests/lds-les-8086.cjs` passe **69/69 tests** :

- Les huit modes d'adressage 8086 et l'adressage direct disp16.
- Les huit registres généraux 16 bits comme destination pour LDS et LES.
- Vérification de l'ordre du pointeur : offset dans le registre destination, segment dans DS/ES, avec octets little-endian.
- Préfixe de segment ES sur la lecture source.
- Sélection implicite de SS avec BP.
- Lecture du pointeur à l'offset FFFFh avec retour de l'offset à 0000h pour les octets suivants.
- Préservation des neuf FLAGS dans les chemins source et binaire.
- Encodages et désassemblages C4/C5 ; rejet du ModR/M registre-direct.
- Rejet des destinations mémoire, 8 bits et segment, des sources registre/immediate, des qualificateurs BYTE/WORD incompatibles et des adresses invalides.
- Comparaison des états source et binaire : registres généraux, segments et FLAGS.

### Comparaison indépendante

Le fichier `tests/lds-les-gnu-crosscheck.cjs` compare **160 instructions** à GNU as en mode `.code16` :

- 128 combinaisons : LDS/LES × huit registres destination × huit modes d'adressage.
- 18 cas de déplacements aux limites disp8/disp16.
- Adressage direct disp16, cas spécial [BP] et préfixes CS, DS, ES et SS.

Résultat : octets identiques pour l'ensemble des vecteurs comparés.

### Exécution interactive et régressions

- Chromium/Playwright : LDS et LES exécutées via le véritable bouton « Pas à pas », avec préfixe ES ; offset, segment destination et neuf FLAGS contrôlés : réussi.
- Workflow CI principal : run **45653024876**, succès.
- Workflow navigateur : run **45653024935**, succès.
- Suite LDS/LES dédiée : **69/69**.
- Comparaison GNU as : **160/160 instructions, octets identiques**.
- Les étapes précédentes de régression, XLAT, XCHG et LEA, sont également passées dans les deux workflows.

### Conclusion LDS/LES

LDS et LES sont validées pour le périmètre logiciel audité : lecture du pointeur 16:16, ordre offset/segment, adressage, destination, préfixes, FLAGS, assemblage, désassemblage, exécution source et binaire, interaction navigateur et comparaison indépendante des encodages.

Cette conclusion ne constitue pas une certification sur processeur physique. Le simulateur ne reproduit pas tous les détails électriques, temporels et de bus d'un 8086 réel. Les interruptions matérielles et les comportements externes au modèle mémoire pédagogique restent hors de ce périmètre.


## 9. Audit CALL et RET — première phase de correction

### Corrections apportées

- Ajout de l'encodage \`CALL FAR ptr16:16\` (\`9Ah\`) avec l'ordre exact des champs : offset 16 bits little-endian, puis segment 16 bits little-endian.
- Ajout du décodage de \`9Ah\` sous la forme \`CALL FAR segment:offset\`.
- Ajout de l'exécution source et binaire de l'appel far direct. L'appel empile l'ancien CS puis l'IP de retour ; le sommet de pile contient donc l'IP. \`RETF\` dépile IP puis CS.
- Suppression du rejet artificiel des ajustements impairs de \`RET imm16\` et \`RETF imm16\`. L'ajustement est appliqué en octets après le dépilement de l'adresse de retour, avec bouclage 16 bits de SP.
- Pour préserver la cohérence du suivi typé de pile après un ajustement impair, les métadonnées typées existantes sont abandonnées ; les octets mémoire et SP restent les données architecturales conservées.

### Tests ciblés

- \`tests/call-ret-stack-boundaries.cjs\` : 6/6 tests. \`RET 0\`, \`RET 1\`, \`RET 3\`, et PUSH/POP avec SP initial à \`0000h\`, \`0001h\` et \`FFFEh\`. Chemins source et binaire comparés lorsque disponibles.
- \`tests/call-ret-8086.cjs\` : 4/4 tests. Encodage \`9Ah\`, désassemblage, appel far direct source, appel far direct binaire vers un autre segment avec retour vers le segment appelant, et rejet d'un pointeur far tronqué.
- \`tests/control-stack.cjs\` : tests existants mis à jour pour accepter les ajustements impairs near et far.
- \`tests/dynamic-differential.cjs\` : contrôle de \`RET 1\` dans les chemins source et binaire.

### Comparaison indépendante

\`tests/call-ret-gnu-crosscheck.cjs\` compare à GNU as 2.46 en \`.code16\` les formes near directes, near indirectes par registre, far directes, \`RET imm16\` et \`RETF imm16\`. Les octets comparés sont identiques.

### Test interactif

\`tests/call-ret-interactive-8086.cjs\` utilise Chromium/Playwright et le véritable bouton « Pas à pas ». Il contrôle le transfert far de CS, la valeur IP de retour au sommet de pile, l'ancien CS au mot suivant, puis la restauration de CS et SP par RETF.

### Limites restantes de cette première phase

Cette phase ne constitue pas encore une validation exhaustive de CALL/RET. Il reste à étendre les vecteurs sur toutes les formes near/far indirectes, les huit modes d'adressage, les limites de déplacement et de segment, les combinaisons de préfixes, les frontières de pile et les neuf FLAGS. Les interactions far source multi-segment sont encore abstraites dans le moteur source ; le test binaire vérifie le transfert inter-segment en mémoire.

Les tests ciblés, la comparaison GNU as et toutes les régressions ont réussi dans le workflow CI run 822 (ID \`45656804213\`) sur le commit \`addb0d1f803708df6efbb49cca268c75faad5da0\`. Le workflow navigateur Playwright run 293 (ID \`45656804338\`) a également réussi sur ce même commit. Les runs précédents 814/284 avaient déjà confirmé les suites sur le commit de développement antérieur.

### Conclusion provisoire

\`CALL FAR ptr16:16\` est désormais assemblé, désassemblé et exécuté dans le périmètre testé. Les ajustements impairs de RET/RETF sont acceptés et appliqués en octets. La famille CALL/RET reste en audit ; aucune validation exhaustive n'est déclarée à ce stade.


## 10. Actualisation sur `main` — 26 novembre 2026

### Fusion et méthode de travail

La PR #1, « Audit pédagogique niveau 3 — chapitres 12 à 17 », a été fusionnée dans `main` par le commit `83f351388f900f0995708b22081111f73a9326b3`. La branche d'audit est désormais historique ; les travaux suivants sont effectués directement sur `main`.

La rationalisation des déclencheurs CI a été enregistrée dans `460aa5d47d3d209639f81f330d2031d59a5c1d6e`. Le CI conserve le déclenchement sur push de `main`, les PR vers `main` et le lancement manuel. Les pushes de l'ancienne branche d'audit ne déclenchent plus les deux workflows de validation.

### Complément MUL / IMUL / DIV / IDIV

Le test `tests/mul-div-segment-selection-8086.cjs` a été intégré au workflow CI principal dans le commit `848005271f836d9ffc4ac36dbaa10333d352151c`, puis étendu et corrigé dans `28d680d26d0311ce81a672d81daf9d59184562e4`.

Le premier élargissement des segments par défaut a mis au jour une erreur de l'oracle du test : il reconnaissait SS pour `[BP]`, mais pas pour `[BP+SI]` et `[BP+DI]`. Les résultats observés correspondaient au segment SS ; c'est donc l'attendu du test, et non le moteur, qui a été corrigé. La matrice couvre maintenant les huit formes d'adressage effectif.

**Résultat vérifié :** workflow CI `45729004989`, commit `28d680d26d0311ce81a672d81daf9d59184562e4`, **56/56 étapes réussies**. L'étape dédiée au test de sélection de segment rapporte **368 assertions réussies, 0 échec** et **192 vecteurs d'exécution source/binaire**.

La suite contrôle :
- les quatre instructions, en byte et word ;
- les quatre overrides ES, CS, SS et DS, en source et en binaire ;
- le segment implicite DS ou SS pour chacune des huit formes d'adressage effectif ;
- LOCK combiné à un override de segment, en byte et word, avec encodage et exécutions source/binaire ;
- le rejet de REP, REPE, REPZ, REPNE et REPNZ sur des opérandes registre byte/word et mémoire byte/word.

Référence CI : https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45729004989

### Limites restantes

Cette validation complète la sélection de segment et les interactions de préfixes pour ces quatre instructions. Elle ne remplace pas les contrôles arithmétiques de la suite BCD/MUL/DIV, les tests d'erreur de division, ni la comparaison indépendante des encodages. Les FLAGS indéfinis après DIV/IDIV ne doivent pas être comparés ; le signal LOCK physique et l'arbitrage du bus ne sont pas simulés.

Les chapitres 12 à 17 ne sont donc pas déclarés globalement clos : les autres familles et la réconciliation de toutes les formes restent à traiter.


## 11. Actualisation des branchements, boucles et pile sur `main` — 26 novembre 2026

La validation de la famille MUL/IMUL/DIV/IDIV a été complétée par une tranche indépendante sur les branchements et la pile. Sur le commit `faef6b83c1e5aba2626148bb6b341fc0079031f5`, le workflow CI [45729424128](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45729424128) a terminé avec **56/56 étapes réussies**.

| Contrôle ciblé | Résultat |
|---|---:|
| Branchements relatifs et boucles | 209/209 |
| Transferts et pile | 305/305 |
| CALL/RET limites de pile | 6/6 |
| CALL FAR direct | 4/4 |
| CALL indirect | 177/177 |
| Instructions de chaîne | 29/29 |
| Audit différentiel | 33/33 |

La suite des branchements compare maintenant les 16 conditions Jcc sur huit couples d'opérandes en source et en binaire. LOOP, LOOPE, LOOPNE et JCXZ sont également contrôlées dans les deux chemins, avec vérification des conditions, de CX et des neuf FLAGS modélisés.

Pour CALL/RET, les tests couvrent les appels near/far, les formes indirectes, l'ordre CS:IP sur pile, les limites SP et les ajustements impairs de RET/RETF. Pour les chaînes, les dix formes byte/word sont testées avec les chemins source et binaire, les segments, REP, DF et les frontières d'offset.

**État global :** ces résultats ferment des sous-périmètres ciblés, pas l'audit exhaustif des chapitres 12 à 17. Les formes restantes, les interactions de préfixes non couvertes, les autres familles d'instructions et la réconciliation des 93 entrées restent ouvertes.


## 12. Clôture des contrôles pédagogiques et CMP/TEST — 26 novembre 2026

Sur le commit `bf994802a22425d1bddf7991e1d8a55d1f6ac522`, le workflow CI [45730214193](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45730214193) a réussi avec **56/56 étapes**.

### Chapitres 12 à 17 — preuves pédagogiques

- **18 exemples** des six chapitres ont été comparés entre interprétation source et exécution binaire par le test navigateur.
- **54 questions intermédiaires** et **60 questions finales** ont été vérifiées pour cette tranche.
- La suite qualité couvre les **108/108 exemples** des 36 chapitres avec des oracles indépendants et confirme les **684/684 questions** contre la clé sémantique.
- Les dix questions finales sont organisées en cinq paires de domaines : définition/compréhension, syntaxe/restrictions, prédiction/calcul, analyse de programme/résultat et débogage/raisonnement.
- Les démonstrations interactives ont réussi **7/7** ; la séparation des pages Cours, Exercices et Atelier et les filtres d'exercices ont réussi.

### CMP / TEST — compléments indépendants

La suite logique rapporte **68 611 réussites, 0 échec** et dix équivalences source/binaire. Six vecteurs TEST supplémentaires vérifient les formes byte/word, registre/mémoire, immédiat et override ES. CMP dispose de nouveaux contrôles source/binaire sur les formes byte registre et word mémoire, complétés par les huit couples d'opérandes de la matrice Jcc.

**Conclusion de cette étape :** les contrôles pédagogiques des chapitres 12 à 17 et les compléments CMP/TEST sont maintenant documentés avec leurs résultats. L'audit ne sera déclaré globalement clos qu'après vérification des formes restantes, réconciliation du registre et actualisation prudente de la matrice des 93 instructions.
