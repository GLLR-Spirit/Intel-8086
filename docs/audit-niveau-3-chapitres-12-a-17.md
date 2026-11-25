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

Aucune modification n'a été fusionnée dans `main`.


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
