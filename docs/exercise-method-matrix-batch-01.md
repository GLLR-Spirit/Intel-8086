# Matrice de méthodes obligatoires — lot EX01 à EX10

Base : `main` au début du lot, 28 novembre 2026.  
Règle : la validation du résultat final et celle de la méthode sont deux contrôles distincts. Aucun statut de certification pédagogique globale n'est attribué par ce lot.

| ID | Résultat attendu | Méthode exigée et contrat | Contrôle négatif prévu | Correction pédagogique |
|---|---|---|---|---|
| EX01 | AX=20 | `ADD AX,BX` exécuté | Charger directement AX=20 | Solution et étapes expliquent destination/source et accumulation |
| EX02 | AX=9, BX=4 | Séquence `MOV DX,AX`, `MOV AX,BX`, `MOV BX,DX` | Affecter directement les deux valeurs sans DX | Correction explique la sauvegarde temporaire et l'ordre anti-écrasement |
| EX03 | AX=20, CX=0 | Quatre `LOOP` et `ADD AX,5` | Affecter directement AX=20 et CX=0 | Correction détaille initialisation, quatre tours et décrémentation |
| EX04 | CX=1 | `CMP AX,BX`, `JE EGAL`, affectation `MOV CX,1` sur le chemin égal | Affecter directement CX=1 | Correction distingue comparaison, branche prise et branche alternative |
| EX05 | AX=21, CX=0 | Six `LOOP`, `ADD AX,BX`, `INC BX` | Affecter directement AX=21 et CX=0 | Correction explicite le rôle distinct d'AX, BX et CX |
| EX06 | AX=BX=1234h | `MOV AX,1234H`, puis `MOV BX,AX` | Charger indépendamment AX et BX | Correction explique le transfert sans altérer la source |
| EX07 | AL=30h | `ADD AL,BL` | Charger directement AL=30h | Correction relie 2Ah à 42 décimal, puis 42+6=48=30h |
| EX08 | AX=1256h | `MOV AX,1234H`, puis `MOV AL,56H` | Charger directement AX=1256h | Correction explique AH inchangé et AL remplacé |
| EX09 | AX=BX=25 | `MOV AX,25`, puis `MOV BX,AX` | Charger indépendamment les deux registres | Correction explicite destination en premier et source en second |
| EX10 | BX=1234h, SP restauré, pile vide | `PUSH AX`, modification `MOV AX,0`, puis `POP BX` | Charger directement BX=1234h sans pile | Correction explique LIFO, indépendance de la valeur empilée et restauration de SP |

## Résultats des contrôles

Le test `tests/exercise-method-batch-01.cjs` exécute pour chacun des dix exercices :
- la correction de référence sur l'interpréteur source et sur le chemin binaire (oracle de résultat) ;
- l'oracle de résultat final ;
- le contrat de méthode sur la trace source réellement exécutée (le chemin binaire n'expose pas actuellement cette trace) ;
- un programme alternatif qui conserve le résultat final mais contourne la méthode ;
- une mutation de trace qui retire la première instruction et doit être rejetée.

La matrice est exhaustive pour les consignes explicites EX01–EX10. Elle ne constitue pas à elle seule une certification pédagogique indépendante : la qualité didactique complète et l'examen humain des explications restent consignés séparément.
