# Audit technique et pédagogique — état vérifié au 27 novembre 2026

## Périmètre et statut

Dépôt : `GLLR-Spirit/Intel-8086`  
Commit audité : `96a7bdf83491a53ec9546e04987e4ce012fbf2da`  
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
| Revues individuelles documentées | 323 questions (chapitres 1 à 17) | 256 passées, 67 corrigées, 0 bloquée ; non réconciliées automatiquement avec le registre officiel |
| Exercices et corrections guidées | 48/48 | Métadonnées, validateurs et comparaison source/binaire réussis |
| Smoke tests | 378/378 | Réussis |
| Matrice ModR/M | 11 568/11 568 | Tests de génération, décodage et validité réussis |
| Balayage structurel | 256 opcodes + 17 152 combinaisons ModR/M | Robustesse et consommation des octets ; ne prouve pas la sémantique de chaque opcode |
| Audit navigateur | réussi | Workflow Playwright desktop/mobile réussi |

### Exécutions GitHub Actions consultées

- CI principal : [run 1775](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46014172472), commit audité, conclusion `success`.
- Audit navigateur : [run 1143](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46014172454), même commit, conclusion `success`.
- Les deux jobs du CI principal et toutes les étapes affichées sont en succès.
- Le journal CI confirme notamment 108/108 exemples source/binaire, 48/48 corrections guidées, 684/684 évaluateurs d'oracles automatisés, 378/378 smoke tests et 11 568/11 568 cas ModR/M.
- Les journaux contiennent un avertissement de dépréciation Node.js concernant `punycode` et un avertissement de compatibilité Node 20 de certaines actions GitHub ; ils n'ont pas fait échouer les workflows.

## Anomalies documentaires corrigées dans cette branche

1. Le suivi pédagogique annonçait encore 42 exercices, alors que le test exécuté rapporte 48 exercices et 48 corrections guidées comparées entre source et binaire. La valeur documentaire est corrigée à 48.
2. Plusieurs lignes du suivi indiquaient que l'exécution CI et le contrôle navigateur étaient encore en attente, alors que les runs 1775 et 1143 du commit audité sont terminés avec succès. Le suivi est mis à jour avec les identifiants et les réserves restantes.
3. Le README citait un ancien run (210), 354 smoke tests et 40 vecteurs. Cette référence historique est remplacée par le résultat CI actuellement observé et un lien vers le workflow.

Cause commune : les documents de suivi n'avaient pas été réconciliés après l'élargissement des suites et l'exécution des workflows récents.

## Points qui restent ouverts — aucune clôture fictive

1. **Questions :** les 684 évaluateurs automatisés réussissent, mais le registre officiel reste 384/684. Le registre officiel conserve 300 questions non certifiées. Des revues individuelles distinctes documentent déjà 323 questions des chapitres 1 à 17 (256 passées, 67 corrigées, 0 bloquée), mais ces fichiers ne sont pas automatiquement réconciliés avec le registre officiel. Les 300 entrées restantes doivent être rapprochées des preuves existantes avant toute modification du compteur ; les chapitres 18 à 36 restent à examiner individuellement.
2. **Cours :** la présence de 108 explications de longueur minimale et la réussite des tests structurels ne remplacent pas une relecture experte de chaque notion, prérequis, progression et exemple.
3. **Exemples :** la comparaison source/binaire couvre 108/108 ; les quatre exemples conceptuels sont explicitement conservés. Les résultats du moteur logiciel ne constituent pas une comparaison avec un 8086 physique.
4. **Simulateur, assembleur, désassembleur :** les matrices et vecteurs ciblés sont étendus, mais le balayage structurel des opcodes ne certifie pas la sémantique de chaque opcode ni toutes les combinaisons de préfixes, états indéfinis, interruptions matérielles et signaux de bus.
5. **Accessibilité :** les tests automatisés vérifient structure, labels, landmarks, navigation, responsive et reduced-motion. Une validation manuelle avec lecteur d'écran, navigation clavier exhaustive, zoom et tailles d'affichage extrêmes reste nécessaire.
6. **Publication :** aucun déploiement n'a été déclenché. Le site publié n'a pas été contrôlé après le commit audité ; la réussite du navigateur CI porte sur une instance locale construite par le workflow.

## Conclusion de cette tranche

Les deux workflows du commit audité sont réussis. Les anomalies documentaires identifiées dans cette tranche sont corrigées dans la branche d'audit. La mission globale reste **en cours** tant que les revues individuelles restantes et les contrôles manuels listés ci-dessus ne sont pas terminés.
