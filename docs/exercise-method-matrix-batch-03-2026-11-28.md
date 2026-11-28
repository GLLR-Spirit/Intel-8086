# Lot 3 — matrice de méthode et correction pédagogique EX21–EX30

Date : 28 novembre 2026  
Branche : `audit/exercises-batch-01-2026-11-28`

## Matrice EX21–EX30

| ID | Résultat attendu | Méthode obligatoire | Contournement négatif | Revue pédagogique |
|---|---|---|---|---|
| EX21 | DX = max(17,23) = 23 | CMP AX,BX puis chemin JGE cohérent ; le contrat accepte les deux chemins possibles | Charger directement DX=23 | Le cas AX>BX est aussi testé ; les deux branches du maximum sont couvertes |
| EX22 | AX=12, CX=0 | ADD AX,3 puis LOOP BOUCLE ; INC CX est interdit | INC CX puis DEC CX pour conserver le résultat tout en gardant l'instruction fautive | La correction identifie le compteur CX et explique pourquoi l'incrémentation casse LOOP |
| EX23 | AX=ABCDh, BX=1234h | Sauvegarder AX dans DX, copier BX dans AX, restaurer DX dans BX | Utiliser XCHG pour obtenir le même état sans DX | L'ordre des transferts est expliqué ; l'écrasement initial est corrigé |
| EX24 | AX=12, somme de 2+4+6 | TEST BX,1, JNZ IMPAIR, ADD AX,BX, INC BX, LOOP BOUCLE | Affecter directement AX=12 et CX=0 | La parité est reliée au bit de poids faible et ZF ; les valeurs paires sont sélectionnées |
| EX25 | Copie décroissante des deux mots, DF restauré | STD, REP MOVSW, CLD ; contrat de trace déjà présent | Copier manuellement par MOV et CLD sans STD/REP MOVSW | L'explication précise SI/DI, CX, le sens décroissant et la restauration de DF |
| EX26 | AX=1, BX=3 ; MOV AX,2 ignoré | JMP SUITE | Produire le même état final sans saut | Programme de départ corrigé : JMP est désormais à compléter |
| EX27 | AX=10, SP restauré, pile vide | CALL DOUBLE, ADD AX,AX, RET | Affecter directement AX=10 | La correction explique l'adresse de retour et l'équilibre de pile |
| EX28 | AX=10, SP restauré, pile vide | PUSH/CALL, cadre BP, lecture [BP+4], ADD, POP BP, RET 2 | Affecter directement AX=10 | La correction explique l'emplacement du paramètre et le nettoyage par RET 2 |
| EX29 | AX=14, SP restauré, pile vide | Deux appels/retours, ADD AX,BX puis ADD AX,AX | Affecter directement AX=14 | Les responsabilités des deux routines et l'équilibre de pile sont séparés |
| EX30 | AX=42, CF=0, OF=0 | MUL BL | Affecter directement AX=42 | La correction explique le produit 8 bits et le produit complet dans AX |

## Modifications appliquées

- Extension du validateur avec des séquences alternatives ordonnées : un exercice à deux chemins peut accepter chaque chemin correct sans exiger que les deux soient exécutés dans une seule trace.
- Extension du validateur avec des opérandes interdits : EX22 rejette INC CX même si une instruction compensatrice préserve le résultat final.
- Ajout de contrats de méthode pour EX21–EX24 et EX26 ; conservation des contrats déjà présents pour EX25 et EX27–EX30.
- EX26 : retrait du JMP déjà présent dans le programme de départ.
- Ajout de dix contournements négatifs et d'un test positif pour la seconde branche du maximum EX21.

## État de vérification

- Relecture statique des dix consignes, programmes de départ et corrections : effectuée.
- Contrats de méthode et tests négatifs : ajoutés.
- Exécution automatique, audit navigateur et vérification pédagogique finale : en attente.
- **Aucun exercice EX21–EX30 n'est certifié à ce stade.**
