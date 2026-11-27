# Audit technique et pédagogique — état vérifié au 27 novembre 2026

## Périmètre et statut

Dépôt : `GLLR-Spirit/Intel-8086`  
Commit de base audité : `96a7bdf83491a53ec9546e04987e4ce012fbf2da`  
Dernière validation corrective de la branche : `2d117da7ce17bbf861efdd39c43436a55c2906d6`  
Branche de travail : `audit-complet-2026-11-27`  
Branche principale : `main` (lecture seule pendant cet audit)

Ce document consigne une vérification reproductible du dépôt et des résultats CI disponibles. Il ne prétend pas clôturer l'audit manuel exhaustif des 36 chapitres ni la certification indépendante des 684 questions.

## Résultats vérifiés

| Domaine | Résultat observé | Interprétation |
|---|---:|---|
| Chapitres | 36 | Structure et contrôles automatisés de qualité présents |
| Leçons | 108 | 108/108 ont un oracle d'état ou d'encodage ; les 108 exemples s'exécutent sans erreur |
| Exemples source/binaire | 108/108 | Comparaison différentielle réussie |
| Questions intermédiaires | 324 | Concordance runtime/manifeste contrôlée |
| Questions finales | 360 | Concordance runtime/manifeste contrôlée |
| Oracles de questions | 684/684 | Évaluateurs automatisés réussis ; **ce résultat n'est pas une certification humaine indépendante** |
| Registre de certification officiel | 384/684 | 300 restent non certifiées dans le registre officiel ; compteur inchangé |
| Revues individuelles documentées | 437 questions (chapitres 1 à 22) | 358 passées, 79 corrigées, 0 bloquée ; non réconciliées automatiquement avec le registre officiel |
| Exercices et corrections guidées | 48/48 | Métadonnées, validateurs et comparaison source/binaire réussis |
| Smoke tests | 378/378 | Réussis |
| Matrice ModR/M | 11 568/11 568 | Tests de génération, décodage et validité réussis |
| Balayage structurel | 256 opcodes + 17 152 combinaisons ModR/M | Robustesse et consommation des octets ; ne prouve pas la sémantique de chaque opcode |
| Audit navigateur | réussi | Workflow Playwright desktop/mobile réussi |

### Exécutions GitHub Actions consultées

- CI et audit navigateur : [run 1884](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46035262824), commit de branche `2d117da7ce17bbf861efdd39c43436a55c2906d6`, conclusion `success`.
- Les deux jobs ont réussi : `simulator-smoke-tests` et `course-browser-audit` (Playwright desktop/mobile).
- Le journal confirme notamment 684/684 questions concordantes runtime/clé, 684/684 évaluateurs d'oracles automatisés réussis, 361 revues individuelles enregistrées sur 19 chapitres, 108/108 exemples source/binaire comparés, ainsi que les suites d'instructions et matrices configurées.
- Les journaux contiennent un avertissement de dépréciation Node.js concernant `punycode` et un avertissement de compatibilité Node 20 de certaines actions GitHub ; ils n'ont pas fait échouer les workflows.

## Anomalies documentaires corrigées dans cette branche

1. Le suivi pédagogique annonçait encore 42 exercices, alors que le test exécuté rapporte 48 exercices et 48 corrections guidées comparées entre source et binaire. La valeur documentaire est corrigée à 48.
2. Plusieurs lignes du suivi indiquaient que l'exécution CI et le contrôle navigateur étaient encore en attente, alors que les runs 1775 et 1143 du commit audité sont terminés avec succès. Le suivi est mis à jour avec les identifiants et les réserves restantes.
3. Le README citait un ancien run (210), 354 smoke tests et 40 vecteurs. Cette référence historique est remplacée par le résultat CI actuellement observé et un lien vers le workflow.

Cause commune : les documents de suivi n'avaient pas été réconciliés après l'élargissement des suites et l'exécution des workflows récents.

## Points qui restent ouverts — aucune clôture fictive

1. **Questions :** les 684 évaluateurs automatisés réussissent, mais le registre officiel reste 384/684. Le registre officiel conserve 300 questions non certifiées. Des revues individuelles distinctes documentent déjà 437 questions des chapitres 1 à 22 (358 passées, 79 corrigées, 0 bloquée), mais ces fichiers ne sont pas automatiquement réconciliés avec le registre officiel. Les chapitres 20 à 36 restent à examiner individuellement. Le nombre de 300 questions restantes est un compteur historique ; il n'est pas encore associé à une liste vérifiable d'identifiants, car le dépôt ne fournit pas le registre nominatif des 384 questions déjà certifiées.
2. **Cours :** la présence de 108 explications de longueur minimale et la réussite des tests structurels ne remplacent pas une relecture experte de chaque notion, prérequis, progression et exemple.
3. **Exemples :** la comparaison source/binaire couvre 108/108 ; les quatre exemples conceptuels sont explicitement conservés. Les résultats du moteur logiciel ne constituent pas une comparaison avec un 8086 physique.
4. **Simulateur, assembleur, désassembleur :** les matrices et vecteurs ciblés sont étendus, mais le balayage structurel des opcodes ne certifie pas la sémantique de chaque opcode ni toutes les combinaisons de préfixes, états indéfinis, interruptions matérielles et signaux de bus.
5. **Accessibilité :** les tests automatisés vérifient structure, labels, landmarks, navigation, responsive et reduced-motion. Une validation manuelle avec lecteur d'écran, navigation clavier exhaustive, zoom et tailles d'affichage extrêmes reste nécessaire.
6. **Publication :** aucun déploiement n'a été déclenché. Le site publié n'a pas été contrôlé après le commit audité ; la réussite du navigateur CI porte sur une instance locale construite par le workflow.

## Conclusion de cette tranche

Les deux jobs du CI correctif run 1884 sont réussis sur la branche d'audit. L'index des 684 oracles, les 19 fichiers de revue, la clé sémantique et les évaluateurs ont été réconciliés. La mission globale reste en cours tant que les revues des chapitres 20 à 36 et les contrôles manuels listés ci-dessus ne sont pas terminés. La mission globale reste **en cours** tant que les revues individuelles restantes et les contrôles manuels listés ci-dessus ne sont pas terminés.


## Mise à jour — revue individuelle du chapitre 18

- Chapitre 17 : le plan d'évaluation finale est désormais équilibré, avec exactement deux questions dans chacune des cinq catégories attendues.
- Chapitre 18 : 19 questions examinées individuellement ; 15 validées et 4 corrigées. Les corrections portent sur la précision des adresses segment:offset et sur l'analyse d'un programme comparant deux références mémoire aliasées.
- Les revues documentées couvrent maintenant 437 questions des chapitres 1 à 22 : 358 validées, 79 corrigées, aucune bloquée.
- Le compteur officiel reste 384/684 (300 restantes) : les fiches de revue ne sont pas automatiquement ajoutées au registre historique. Aucun registre historique complet listant les 384 identifiants certifiés n'a encore été trouvé ; le nombre 300 ne peut donc pas encore être associé à un ensemble d'identifiants vérifiable.


## Mise à jour — revue individuelle du chapitre 19

- Chapitre 19 : 19 questions examinées individuellement ; 18 validées et 1 corrigée. L'ancienne question finale répétait le segment par défaut SS ; elle est remplacée par un cas frontière vérifiant le repliement de l'offset effectif 16 bits (`FFF0h + 0030h + 0004h = 10024h`, offset conservé `0024h`).
- Les revues documentées couvrent maintenant 437 questions des chapitres 1 à 22 : 358 validées, 79 corrigées, aucune bloquée.
- Le compteur officiel reste 384/684 (300 restantes), sans incrément automatique. L'absence d'une liste nominative des 384 identifiants historiques certifiés demeure un point de traçabilité ouvert.


## Mise à jour — revue individuelle du chapitre 20

- Chapitre 20 : 19 questions examinées individuellement ; 16 validées et 3 corrigées. Les corrections précisent l'effet de POPF sans sauvegarde correspondante, lèvent une ambiguïté sur la destination du premier POP après deux PUSH et remplacent un doublon sur l'équilibre de SP par le calcul de l'adresse d'écriture du premier PUSH.
- Les revues documentées couvrent maintenant 437 questions des chapitres 1 à 22 : 358 validées, 79 corrigées, aucune bloquée.
- Le compteur officiel reste 384/684 (300 restantes) et n'est pas incrémenté automatiquement ; la liste historique des 384 identifiants certifiés reste à reconstruire.


## Mise à jour — revue individuelle du chapitre 21

- Chapitre 21 : 19 questions examinées individuellement ; 19 validées, aucune correction nécessaire. Les règles CALL/RET near, l'adresse de retour, l'équilibre de pile et le résultat DX:AX de MUL mot ont été vérifiés.
- Les revues documentées couvrent maintenant 437 questions des chapitres 1 à 22 : 358 validées, 79 corrigées, aucune bloquée.
- Le compteur officiel reste 384/684 (300 restantes) ; il n'est pas incrémenté automatiquement tant que le registre nominatif historique n'est pas reconstruit.


## Mise à jour — revue individuelle du chapitre 22

- Chapitre 22 : 19 questions examinées individuellement ; 17 validées et 2 corrigées. Deux questions finales répétaient des calculs déjà présents dans les leçons ; elles évaluent maintenant l'ordre de dépilage de paramètres et l'effet d'un CALL near sur SP après empilement des paramètres.
- Les revues documentées couvrent maintenant 437 questions des chapitres 1 à 22 : 358 validées, 79 corrigées, aucune bloquée.
- Le compteur officiel reste 384/684 (300 restantes) ; il n'est pas incrémenté automatiquement tant que le registre nominatif historique n'est pas reconstruit.
