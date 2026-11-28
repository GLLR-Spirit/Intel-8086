# Revue indépendante des 48 exercices — première passe de détection

Date : 28 novembre 2026  
Branche : `audit/exercise-independent-review-2026-11-28`  
Base examinée : `main` au commit `9fd63e2f59607e58e957f3f93cf2cd457353e75f`

## Portée réelle de cette passe

Cette passe a relu les 48 intitulés, consignes et programmes de départ présents dans le tableau `exercises`. Elle vise à détecter les répétitions de compétences, les exercices dont la consigne promet davantage que ce que le programme vérifie, et les différences de niveau cognitif entre exercices proches.

Ce travail est une **revue statique de détection**, pas une certification pédagogique complète. Les solutions guidées, les traces d'exécution, les validateurs, les prérequis, les pièges fréquents et les explications de chaque exercice doivent encore être confrontés individuellement avant de déclarer un exercice certifié. Les résultats CI ne sont pas utilisés comme preuve de qualité pédagogique.

## Résultats principaux

### Écarts éditoriaux à traiter

| Groupe | Exercices | Constat | Risque pédagogique | Action recommandée |
|---|---|---|---|---|
| D1 | EX14 et EX20 | Même situation numérique (FCh = −4, 02h = +2), même comparaison signée et même résultat attendu. EX20 demande de choisir le saut, tandis qu'EX14 fournit déjà JL dans le programme. | Répétition presque directe de la même question ; progression faible entre les deux entrées. | Conserver EX14 comme application guidée de JL et redéfinir EX20 autour d'un autre cas signé (par exemple JGE/JLE ou une comparaison dont les opérandes ont le même bit de signe), avec un oracle distinct. |
| D2 | EX27 et EX41 | Les deux exercices demandent une procédure DOUBLE appelée par CALL, doublant AX=5, puis retournant avec RET. Les programmes de départ sont pratiquement identiques ; EX41 ajoute explicitement AX=10 à la consigne. | Deux cartes peuvent être perçues comme le même exercice, sans nouvelle compétence mesurable. | Garder EX27 pour construire CALL/RET et vérifier la pile ; transformer EX41 en analyse/débogage d'un cadre d'appel ou en procédure avec sauvegarde/restauration d'un registre, sans simplement répéter le même programme. |
| D3 | EX33 et EX46 | Même vecteur 30h, même séquence MOV AX,0 / INT 30h / HLT, même gestionnaire qui charge 1234h et exécute IRET. | Duplication quasi exacte d'une compétence et d'une trace d'exécution. | Garder EX33 pour construire le vecteur et le gestionnaire ; donner à EX46 un objectif distinct (par exemple préserver un registre ou transmettre un statut au gestionnaire), avec exigences et oracle correspondants. |

### Chevauchements acceptables, à différencier explicitement

- **EX02 / EX23** : les deux concernent un échange de registres avec DX. EX02 est une construction directe ; EX23 est un exercice de débogage où l'ordre des transferts détruit une valeur. Le contraste est pédagogique, à condition que la correction d'EX23 explique précisément la perte de valeur.
- **EX30 / EX42** : les deux utilisent MUL. EX30 porte sur le produit non signé et les indicateurs CF/OF ; EX42 combine MUL et DIV et vérifie quotient/reste. La progression est pertinente si les corrections expliquent AX comme destination implicite de MUL/DIV.
- **EX44 / EX47** : EX44 isole REP MOVSB ; EX47 réutilise la copie dans un problème d'intégration avec vérification, pile et interruption. Progression acceptable.
- **EX25 / EX48** : les deux utilisent STD et REP MOVSW en parcours décroissant. EX48 ajoute comparaison, sauvegarde de registre et interruption ; il faut vérifier que l'objectif supplémentaire est réellement évalué et pas seulement présent dans le code de référence.
- **EX03 / EX15** : les deux utilisent LOOP, mais EX03 répète une constante tandis qu'EX15 parcourt une suite avec incrémentation. La différence est suffisante si elle reste visible dans les critères de réussite.

## Points de vigilance ciblés

1. **EX18 — SS et BP** : le programme initialise SS et BP et le validateur vérifie ces deux registres. Il ne réalise toutefois aucun accès mémoire via [BP] ; la règle du segment SS par défaut est expliquée dans l'indice, mais n'est pas démontrée par l'exécution. Si l'objectif annoncé reste uniquement l'initialisation des registres, ce n'est pas un défaut bloquant. Si l'exercice prétend enseigner l'adressage basé sur BP, ajouter un accès mémoire et vérifier la bonne adresse physique.
2. **EX24 — parité** : vérifier que la correction utilise effectivement TEST BX,1 puis un branchement conditionnel, et que le validateur exige cette méthode. Un total de 12 seul ne prouve pas que seules les valeurs paires ont été ajoutées.
3. **EX25 / EX48 — DF** : vérifier les états SI/DI après les deux transferts, la restauration de DF par CLD et l'ordre réel des mots en mémoire destination.
4. **EX33 / EX46 — reprise après IRET** : vérifier l'adresse de reprise et l'équilibre de pile, mais ne pas confondre l'adresse séquentielle après HLT avec l'exécution du gestionnaire après l'arrêt.
5. **EX39 — justification** : le contrôle lexical ne peut pas certifier la qualité du raisonnement sur les cycles physiques. L'autoévaluation et la justification restent à noter humainement.
6. **EX47 / EX48 — contrats de méthode** : vérifier que les traces imposent les séquences pertinentes dans le programme soumis, et pas uniquement dans les solutions guidées.

## Registre de couverture de cette passe

Les 48 entrées ont été parcourues au niveau intitulé / consigne / programme de départ. Cela ne signifie pas que les 48 exercices ont été validés.

| Exercices | État de la passe statique |
|---|---|
| EX01–EX13 | Intitulé, consigne et programme de départ parcourus ; revue détaillée solution/validateur encore requise. |
| EX14–EX20 | Parcourus ; répétition D1 signalée pour EX14/EX20. |
| EX21–EX26 | Parcourus ; cohérence des chemins et méthodes à vérifier dans la revue détaillée. |
| EX27–EX29 | Parcourus ; répétition D2 signalée pour EX27/EX41. |
| EX30–EX32 | Parcourus ; vérifier destinations implicites et FLAGS dans les corrections. |
| EX33–EX38 | Parcourus ; répétition D3 signalée pour EX33/EX46 ; contrôles d'encodage/adressage à maintenir. |
| EX39–EX40 | Parcourus ; justification EX39 à examiner humainement. |
| EX41–EX48 | Parcourus ; répétitions et intégrations listées ci-dessus à vérifier sur les critères réellement évalués. |

## Décision

- **48/48** consignes et programmes de départ parcourus dans cette passe statique.
- **3 groupes de répétition prioritaires** signalés : EX14/EX20, EX27/EX41 et EX33/EX46.
- **5 chevauchements de progression** identifiés et jugés potentiellement acceptables sous réserve de vérification des critères.
- **Aucun exercice n'est déclaré certifié** par cette passe.
- Aucune correction fonctionnelle n'a été appliquée à cette étape : les changements de consigne, de programme et de validateur doivent être conçus ensemble afin de ne pas casser les oracles ou les associations de chapitres.
- Aucun déploiement n'a été effectué.

## Étape suivante

Traiter D1, D2 et D3 comme trois décisions de conception distinctes, puis effectuer la revue détaillée de chaque exercice : consigne, prérequis, solution, méthode obligatoire, branches alternatives, état final, erreurs fréquentes, difficulté et adéquation au chapitre. Pour chaque correction, ajouter un contrôle négatif démontrant qu'une solution qui contourne la méthode exigée est refusée.
