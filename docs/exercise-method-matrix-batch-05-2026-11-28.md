# Lot 5 — matrice de méthode et correction pédagogique EX41–EX48

Date : 28 novembre 2026  
Branche : \`audit/exercises-batch-01-2026-11-28\`

## Matrice EX41–EX48

| ID | Résultat attendu | Méthode obligatoire contrôlée | Contournement négatif | Revue pédagogique |
|---|---|---|---|---|
| EX41 | AX=12, BX=1234h, SP restauré | CALL DOUBLE_AX ; PUSH BX ; ADD AX,AX ; POP BX ; RET | Charger directement AX=12 et BX=1234h | Refonte pour différencier EX41 d'EX27 : convention de préservation d'un registre de l'appelant |
| EX42 | AX=0208h | MUL BL, MOV BL,5, DIV BL | Charger directement AX=0208h | Correction explique produit complet AX, puis quotient AL et reste AH |
| EX43 | CF=1, SP restauré | STC, PUSHF, CLC, POPF | STC puis HLT sans sauvegarder/restaurer | Correction explique sauvegarde du mot FLAGS et restauration de CF |
| EX44 | Deux octets copiés, SI=0102h, DI=0202h, CX=0 | CLD puis REP MOVSB | Écrire directement les octets destination et fixer les index | Correction distingue DS:SI source, ES:DI destination, DF et CX |
| EX45 | ZF=1, CX=1, DI=0102h | CLD puis REPNE SCASB avec AL=42h et CX=3 | Forcer ZF et les registres sans rechercher dans la chaîne | Correction explique les comparaisons successives et l'arrêt sur égalité |
| EX46 | AX=7, BX=BEEFh, SP restauré | INT 31h ; PUSH BX ; ADD AX,3 ; POP BX ; IRET | Charger directement AX=7 et BX=BEEFh | Refonte pour différencier EX46 d'EX33 : préservation d'un registre général dans le gestionnaire |
| EX47 | AX=1, BX=BEEFh, copie de trois octets, pile équilibrée | REP MOVSB, CMP du deuxième octet, sauvegarde/restauration BX, INT/IRET | Écrire directement les octets destination et le résultat | Correction détaille le transfert de statut par DX et la restauration de BX avant INT |
| EX48 | AX=1, BX=BEEFh, copie inverse, SI/DI décrémentés, DF restauré, pile équilibrée | STD, REP MOVSW, CLD, CMP, PUSH/POP, INT/IRET | Écrire directement les mots destination et fixer l'état final | Correction suit l'ordre des mots, les index, DF, le statut et le cadre d'interruption |

## Corrections éditoriales importantes

- EX41 n'est plus une répétition de la procédure DOUBLE simple d'EX27. Il évalue désormais la préservation d'un registre général modifié par une procédure.
- EX46 n'est plus une répétition de l'interruption qui charge simplement AX=1234h dans EX33. Il évalue désormais la sauvegarde/restauration de BX dans un gestionnaire, au-dessus du cadre INT.
- EX47 et EX48 conservent leur nature d'intégration ; les contrats exigent les opérandes de comparaison, de transfert de statut et de retour, en plus des séquences REP/INT déjà contrôlées.

## Tests négatifs

Le test \`tests/exercise-method-batch-05.cjs\` vérifie les huit corrections de référence et huit programmes alternatifs qui satisfont les prédicats finaux sans démontrer la méthode. Les huit contournements doivent être rejetés.

## Limites de certification

Le lot ne sera pas déclaré certifié avant réussite de la CI et de l'audit navigateur, puis revue distincte des huit corrections pédagogiques. Les contrôles automatiques de trace ne remplacent pas la lecture humaine des explications.


## Décision finale — EX41–EX48

Sur le commit `28c1a943632962b6f091ef036287fd19806a3fe9` :
- `Validate Intel 8086 Lab` : succès — run [46092187178](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46092187178).
- `Niveau 3 — audit navigateur` : succès — run [46092187209](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46092187209).
- 8/8 corrections de référence acceptées ; 8/8 contournements résultat-seul rejetés.
- Le différentiel global des 48 corrections confirme la parité des états architecturaux source/binaire.
- Revue distincte des consignes, indices, étapes et corrections : PASS.
- **Décision : EX41–EX48 certifiés dans le cadre de cet audit pédagogique.**
