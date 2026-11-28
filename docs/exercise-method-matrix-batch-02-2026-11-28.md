# Lot 2 — matrice de méthode et correction pédagogique EX11–EX20

Date : 28 novembre 2026  
Branche : `audit/exercises-batch-01-2026-11-28`

## Matrice EX11–EX20

| ID | Résultat attendu | Méthode obligatoire | Contournement négatif | Revue pédagogique |
|---|---|---|---|---|
| EX11 | AL = 0Ch | AND AL,0Fh | Charger directement 0Ch dans AL | Le masque 0Fh conserve uniquement les quatre bits faibles |
| EX12 | DS = 1000h, BX = 0010h | MOV AX,1000h ; MOV DS,AX ; MOV BX,0010h | Charger DS par PUSH/POP au lieu du MOV demandé | Consigne clarifiée : MOV vers DS via un registre général |
| EX13 | AX = 16, ZF = 0 | SUB AX,9 | Charger directement AX=16 | La correction explique destination, source et effet de résultat non nul sur ZF |
| EX14 | CX = 1 pour −4 < +2 | CMP AL,BL puis JL | Affecter directement CX=1 | L'indice distingue relation signée JL et relation non signée JB ; cible d'étiquette non imposée |
| EX15 | AX = 10, CX = 0 | Quatre passages de LOOP avec ADD/INC | Affecter directement AX=10 et CX=0 | La correction distingue accumulateur AX, valeur courante BX et compteur CX |
| EX16 | CX=2222h, DX=1111h, pile restaurée | PUSH AX, PUSH BX, POP CX, POP DX dans cet ordre | Affecter directement CX et DX sans pile | L'ordre LIFO est expliqué et chaque POP est relié au dernier PUSH |
| EX17 | AL = 5Ah | XOR AL,0AAh | Charger directement 5Ah | La correction détaille les deux motifs binaires et le résultat bit à bit |
| EX18 | SS=2000h, BP=0010h, BX=1234h, mémoire SS:0010h=1234h | Initialiser SS/BP, écrire puis relire par [BP] | Utiliser POP SS et une adresse DS:[0010h] à la place de MOV SS et [BP] | L'exercice démontre maintenant réellement que BP sélectionne SS par défaut ; vérification little-endian |
| EX19 | DX = 1 si AX=8 est supérieur à BX=3 | CMP AX,BX puis JLE vers le chemin inférieur/égal | Affecter directement DX=1 | Le programme de départ contient désormais un branchement erroné JGE ; la correction explique pourquoi JLE est requis |
| EX20 | DX = 1 pour +127 > −128 en signé | CMP AL,BL puis branchement signé | Affecter directement DX=1 | Cas distinct d'EX14 ; comparaison de valeurs aux bornes du signe, JG plutôt que JA |

## Modifications appliquées

- Programmes de départ EX11–EX18 rendus incomplets afin que la solution ne soit plus déjà fournie.
- EX19 transformé en véritable exercice de débogage avec un branchement JGE incorrect ; la correction conserve JLE.
- EX20 redessiné pour supprimer le doublon avec EX14 : comparaison de 7Fh (+127) et 80h (−128).
- Ajout de contrats de séquences d'opérandes ordonnées pour AND, MOV vers les segments, SUB, PUSH/POP, XOR et l'accès mémoire BP.
- Renforcement du contrat EX14 sans imposer le nom exact de l'étiquette JL.
- Ajout de dix tests négatifs : chacun conserve le résultat final mais contourne la méthode.
- Ajout d'une variante JLE positive pour EX20.

## État de vérification

- Relecture statique des consignes, programmes de départ et corrections : effectuée.
- Contrats de méthode et tests négatifs : ajoutés.
- Exécution automatique, audit navigateur et vérification pédagogique finale : en attente.
- **Aucun exercice EX11–EX20 n'est certifié à ce stade.** Les trois axes doivent être validés séparément.


## Diagnostic de l'audit navigateur

La première exécution navigateur a échoué sur une variante de test devenue obsolète après la refonte d'EX20 : elle remplaçait encore FCh par 03h et attendait DX=0. Le nouvel exercice compare 7Fh (+127) à 80h (−128). Le cas négatif pertinent remplace donc 7Fh par 80h, ce qui rend les valeurs égales et doit produire DX=0. Le fixture navigateur a été aligné sur ce nouveau scénario.

Le contrôle de méthode, les dix tests positifs/négatifs et l'audit différentiel des 48 corrections avaient déjà réussi. Le nouvel audit navigateur doit encore confirmer la correction du fixture.
