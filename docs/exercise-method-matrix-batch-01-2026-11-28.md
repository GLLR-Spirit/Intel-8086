# Lot 1 — matrice de méthode et correction pédagogique EX01–EX10

Date : 28 novembre 2026  
Branche : `audit/exercises-batch-01-2026-11-28`  
Base : `main` au commit `9fd63e2f59607e58e957f3f93cf2cd457353e75f`

## Règle de décision

Un exercice n'est certifiable que si trois contrôles indépendants sont satisfaits :

1. **Résultat** : la correction de référence satisfait le prédicat et les valeurs attendues.
2. **Méthode** : la trace d'instructions réellement exécutées contient les opérations et opérandes obligatoires, dans l'ordre requis.
3. **Correction pédagogique** : l'explication correspond à la consigne, expose les étapes et n'enseigne pas une méthode contradictoire.

Les tests négatifs doivent construire un programme qui atteint le même état final sans appliquer la méthode demandée. Le prédicat de résultat doit accepter ce programme, tandis que le contrôle de méthode doit le rejeter. Cette distinction évite de confondre preuve du résultat et preuve de la compétence.

## Matrice EX01–EX10

| ID | Résultat vérifié | Méthode obligatoire contrôlée | Test négatif de contournement | Correction éditoriale |
|---|---|---|---|---|
| EX01 | AX = 20 | `ADD AX,BX` | Affecter directement 20 à AX | Étapes AX=12, BX=8, addition, résultat |
| EX02 | AX = 9, BX = 4 | Sauvegarder AX dans DX, transférer BX vers AX, restaurer DX vers BX — dans cet ordre | Affecter directement les deux valeurs finales sans DX | Explication de DX comme temporaire et prévention de l'écrasement |
| EX03 | AX = 20, CX = 0 | Quatre exécutions de LOOP | Affecter directement AX=20 et CX=0 | Explication du compteur CX et des quatre itérations |
| EX04 | CX = 1 pour AX=BX | CMP AX,BX puis un branchement d'égalité (JE/JZ ou JNE/JNZ) | Affecter directement CX=1 ; utiliser JA, branchement non pertinent pour l'égalité | Explication de CMP/ZF et du chemin égal ; une forme JE ou JNE équivalente est acceptée |
| EX05 | AX = 21, CX = 0 | Six exécutions de LOOP | Affecter directement AX=21 et CX=0 | Explication de BX comme valeur courante et de CX comme compteur |
| EX06 | AX = BX = 1234h | MOV AX,1234h puis MOV BX,AX | Charger séparément 1234h dans les deux registres | Explication du transfert source → destination |
| EX07 | AL = 30h | ADD AL,BL | Charger directement 30h dans AL | Programme de départ corrigé : l'addition n'est plus déjà écrite |
| EX08 | AX = 1256h | MOV AX,1234h puis MOV AL,56h | Charger directement AX=1256h | Programme de départ corrigé : les deux MOV sont à compléter |
| EX09 | AX = BX = 25 | MOV AX,25 puis MOV BX,AX | Charger 25 indépendamment dans AX et BX | Programme de départ corrigé : le transfert AX → BX n'est plus fourni |
| EX10 | BX = 1234h, SP restauré, pile vide | PUSH AX, modification de AX, puis POP BX — dans cet ordre | Charger directement 1234h dans BX sans utiliser la pile | Programme de départ corrigé : PUSH et POP sont à compléter ; l'explication LIFO est conservée |

## Modifications appliquées

- Ajout de contrats d'opérandes ordonnés `requiredOperandSequences`.
- Ajout de groupes `requiredAnyOps` pour permettre plusieurs branchements conditionnels valides sans imposer une seule écriture.
- Extension de `exerciseMethodSatisfied` pour vérifier ces contrats sur `instructionTrace`, pas sur le texte source.
- Renforcement d'EX10 : PUSH AX, MOV AX,0 et POP BX doivent apparaître dans cet ordre.
- Transformation des programmes de départ EX07, EX08, EX09 et EX10 : ils ne donnent plus immédiatement la solution complète.
- Ajout de dix tests négatifs qui conservent le résultat final attendu tout en contournant la méthode.
- Ajout d'un test positif d'équivalence pour EX04 avec JNE, afin d'éviter un validateur trop strict.

## État des preuves

- Relecture statique des dix consignes, prédicats, corrections guidées et programmes de départ : effectuée.
- Contrats de méthode : ajoutés pour les lacunes et renforcés pour les contrats partiels.
- Fixtures négatives : ajoutées pour EX01–EX10.
- EX04 : variante conditionnelle JNE ajoutée comme cas positif.
- **Exécution réelle des tests et validation CI : en attente.** Aucun résultat de test n'est revendiqué dans ce rapport.
- **Certification pédagogique : non accordée** aux dix exercices tant que les tests ne sont pas exécutés et que la correction pédagogique n'a pas fait l'objet d'une validation indépendante distincte.

## Conditions de clôture du lot

1. Le test différentiel doit accepter les dix corrections de référence.
2. Il doit accepter les dix prédicats de résultat sur les dix contournements.
3. Il doit rejeter les dix contournements par le contrôle de méthode.
4. Il doit accepter la variante JNE d'EX04.
5. Le navigateur doit toujours charger les dix exercices et leurs corrections.
6. Les dix corrections pédagogiques doivent être relues séparément ; une réussite technique ne suffit pas.


## Diagnostic de la première CI automatique

La première exécution automatique de la PR a révélé deux défauts dans cette correction :

- **EX07** : le guide pédagogique réutilisait le programme de départ comme solution. En retirant la solution du programme de départ, la solution guidée était devenue incomplète. La solution de référence complète est maintenant rétablie séparément.
- **EX04** : le contrat de branchement acceptait les alias ZF mais omettait les mnémoniques JE/JNE. Ces deux formes sont maintenant admises.

Les échecs ont été identifiés dans les journaux des jobs `learning-quality` et `level3-browser-audit`. Les corrections sont poussées sur la branche ; une nouvelle exécution automatique est nécessaire pour vérifier qu'elles règlent les deux défauts. **Le lot reste non certifié.**


### Renforcement final d'EX04

Le premier contrat acceptait toute instruction Jcc. Une solution pouvait donc exécuter CMP puis un branchement non pertinent (par exemple JA sur des opérandes égaux) et obtenir malgré tout CX=1. Le contrat a été resserré à JE/JZ/JNE/JNZ. Un test négatif supplémentaire vérifie que JA est rejeté malgré le résultat final correct.
