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
| Workflow CI complet sur le commit `1720bf5` | **Réussi** |
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

Le workflow Playwright GitHub Actions a ensuite exécuté le site dans Chromium headless. Le chargement de la page, les auto-tests intégrés, les 18 exemples, les 16 conditions Jcc dans les deux sens, les quatre opcodes de boucle et les vérifications de questions ont tous réussi. Le workflow CI principal a également terminé avec succès toutes ses étapes sur le commit `1720bf5664cd651de49bcdbbc80c5a3c74e4e918`.

L'exécution binaire reste celle du simulateur logiciel du projet. Elle ne prouve pas une équivalence matérielle complète avec un processeur Intel 8086 physique : les signaux de bus, la prélecture BIU, les temporisations et les cycles matériels ne sont pas reproduits. Les résultats internes ne remplacent pas non plus une comparaison avec un assembleur/désassembleur indépendant externe.

## 4. État de validation

Les contrôles ciblés du niveau 3 pour les chapitres 12 à 17 sont réussis, y compris l’exécution Chromium et le workflow CI complet. Cela valide cette phase de contrôle automatisé, mais ne constitue pas l’audit exhaustif de l’ensemble des 36 chapitres ni une validation matérielle complète du 8086. Les vérifications architecturales indépendantes complémentaires restent à poursuivre.

Aucune modification n'a été fusionnée dans `main`.
