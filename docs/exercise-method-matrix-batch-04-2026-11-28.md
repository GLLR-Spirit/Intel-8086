# Lot 4 — matrice de méthode et correction pédagogique EX31–EX40

Date : 28 novembre 2026  
Branche : \`audit/exercises-batch-01-2026-11-28\`

## Matrice EX31–EX40

| ID | Résultat attendu | Méthode obligatoire contrôlée | Contournement négatif | Revue pédagogique |
|---|---|---|---|---|
| EX31 | AX=0208h (quotient 8, reste 2) | DIV BL | Charger directement AX=0208h | Correction distingue dividende AX, quotient AL et reste AH |
| EX32 | AL=40h, CF=1 | SHR AL,1 | Charger AL=40h et positionner CF avec STC | Correction suit le bit expulsé et le rôle de CF |
| EX33 | AX=1234h, SP restauré, pile vide | INT 30h, gestionnaire, IRET | Charger directement AX=1234h et terminer | Oracle complémentaire contrôle l'IP de reprise ; la correction explique la sauvegarde/restauration de FLAGS, CS et IP |
| EX34 | AL=55h, port 20h=55h | IN AL,DX | Charger directement AL=55h sans lire le port | Correction distingue espace d'E/S et mémoire, et explique DX comme sélecteur |
| EX35 | AX=1234h ; octets B8 34 12 F4 | MOV AX,1234h puis HLT, avec encodage exact | Charger AX par un autre registre et conserver la même valeur finale | Oracle binaire indépendant vérifie opcode et ordre little-endian |
| EX36 | AX=ABCDh, mémoire 0106h=CDh et 0107h=ABh | Écrire et relire via WORD PTR [BX+SI+4] | Utiliser directement [0106h] | Correction calcule 0100h+0002h+0004h puis explique le stockage little-endian |
| EX37 | AX=1234h ; désassemblage de quatre frontières | JMP FIN puis flux comprenant NOP, MOV et HLT | Charger directement AX et omettre le saut/NOP | Oracle vérifie les octets et les frontières de quatre instructions, y compris le NOP non exécuté |
| EX38 | AX=2211h, octets distincts dans DS et ES | Écrire les deux segments puis relire avec DS:[BX] et ES:[BX] explicites | Écrire les octets mais charger directement AX=2211h sans les deux lectures | Correction distingue bases physiques DS/ES et effet des overrides |
| EX39 | AX=8 | SHL AX,1 | Charger directement AX=8 | La correction distingue résultat fonctionnel et performance physique ; l'argument sur les cycles doit rester évalué humainement |
| EX40 | AX=9, CX=0, mot 9 stocké à DS:0200h | Parcourir trois mots par SI/CX, ADD AX,[SI], ADD SI,2, LOOP, puis stocker le total | Écrire directement 9 dans AX et en mémoire sans parcourir le tableau | Correction décrit initialisation, trois itérations, indexation, accumulation et stockage |

## Modifications appliquées

- Contrats explicites ajoutés pour les opérations DIV, SHR, IN, l'accès ModR/M avec déplacement, les overrides DS/ES, SHL et le parcours SI/CX.
- Contrats de méthode renforcés pour les exercices d'encodage et de désassemblage, en complément des oracles binaires déjà présents.
- Conservation des oracles supplémentaires EX33 (IP de reprise), EX35 (octets exacts) et EX37 (frontières du désassemblage).
- Ajout de dix contournements négatifs qui conservent le prédicat de résultat mais doivent être refusés par la méthode ou l'oracle complémentaire.
- EX39 reste partiellement humain : le simulateur ne mesure pas les cycles physiques et ne peut pas certifier la justification d'optimisation.

## État de vérification

Le test \`tests/exercise-method-batch-04.cjs\` vérifie les dix corrections de référence, les contrats sur les traces source et les dix contournements résultat-seul. Pour EX33, EX35 et EX37, il vérifie aussi le rejet par l'oracle complémentaire.

**Décision : EX31–EX40 certifiés dans le cadre de cet audit pédagogique.** EX39 a été reformulé pour ne plus exiger une justification libre non collectée par l'application ; la limite sur les cycles physiques reste explicitée dans la correction.


## Vérification automatique et décision

Sur le commit `85d1715c7875ec21b9e40072a70f00eb6c779ee7` :
- `Validate Intel 8086 Lab` : succès — run [46091849568](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46091849568).
- `Niveau 3 — audit navigateur` : succès — run [46091849565](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46091849565).
- 10/10 corrections de référence acceptées ; 10/10 contournements résultat-seul rejetés.
- EX33, EX35 et EX37 : les oracles complémentaires rejettent également les variantes qui omettent le retour d'interruption, l'encodage exact ou les frontières de désassemblage.

**Décision pédagogique : EX31–EX38 et EX40 ont fait l'objet d'une revue séparée des consignes, indices, étapes et corrections. EX39 reste non certifié**, car la justification demandée sur les cycles physiques doit être examinée humainement ; la simulation de SHL et le résultat AX=8 ne prouvent pas la qualité de cette justification. Le lot 4 n'est donc pas déclaré entièrement certifié.


## Vérification finale après clarification d'EX39

Sur le commit `bec9a22f275f8977ff6eb55eda177c0579b17132` :
- `Validate Intel 8086 Lab` : succès — run [46092464354](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46092464354).
- `Niveau 3 — audit navigateur` : succès — run [46092464172](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46092464172).
- Le contrat et le test utilisent le titre révisé d'EX39.
- 10/10 méthodes de référence acceptées et 10/10 contournements rejetés.
- Revue pédagogique des dix consignes, indices, étapes et corrections : PASS.
- **Décision : EX31–EX40 certifiés dans le cadre de cet audit pédagogique.**
