# Audit approfondi — CALL indirect 8086

**Branche de travail actuelle :** `main`  
**Périmètre :** `FF /2` (CALL near indirect) et `FF /3` (CALL far indirect), assembleur, désassembleur, exécution source et binaire.  
**Référence d'encodage indépendante :** GNU Binutils `as` 2.46, mode `.code16`.  
**Statut :** tests automatisés du moteur et validation Playwright réussis sur les commits de test référencés ci-dessous. Aucune conclusion de validation globale 8086 n'en découle.

## 1. Règles architecturales vérifiées

- `FF /2` encode `CALL r/m16` : registre général 16 bits ou opérande mémoire mot.
- `FF /3` encode `CALL m16:16` : pointeur lointain en mémoire uniquement. La forme Mod=11 (registre direct) n'est pas une forme far valide.
- Le pointeur far contient d'abord l'offset 16 bits, puis le segment 16 bits ; chaque mot est stocké little-endian.
- CALL near empile l'IP de retour et ne modifie pas CS.
- CALL far empile l'ancien CS puis l'IP de retour ; l'IP est au sommet de pile. Il charge ensuite le nouveau CS:IP.
- RET et RETF restaurent respectivement IP et IP:CS. Les neuf FLAGS modélisés sont préservés par les appels et retours testés.
- L'adresse effective mémoire est calculée sur 16 bits ; chaque octet d'un mot est ensuite résolu à travers le segment et le repli d'adresse physique 20 bits.
- Le segment par défaut est SS pour les formes utilisant BP et DS pour les autres formes. Les overrides non redondants sont encodés. L'assembleur omet volontairement un override qui répète le segment par défaut ; cette optimisation ne change pas la sémantique.

## 2. Matrice des formes mémoire

La suite couvre les huit combinaisons EA du 8086, ainsi que l'adressage direct `disp16` :

| Forme | ModR/M r/m | Segment par défaut |
|---|---:|---|
| [BX+SI] | 000 | DS |
| [BX+DI] | 001 | DS |
| [BP+SI] | 010 | SS |
| [BP+DI] | 011 | SS |
| [SI] | 100 | DS |
| [DI] | 101 | DS |
| [BP] | 110 avec disp8 nul | SS |
| [BX] | 111 | DS |
| [disp16] | Mod=00, r/m=110 | DS |

Pour chacune de ces neuf formes, les tests vérifient :
- assemblage et désassemblage de `FF /2` ;
- assemblage et désassemblage de `FF /3` ;
- exécution source et binaire near et far ;
- les quatre segments sélectionnés (DS, ES, SS, CS) ;
- restauration exacte de CS:IP, SP et de la pile après retour ;
- conservation des neuf FLAGS modélisés.

Les formes far registre-direct sont rejetées ; le désassembleur ne doit pas interpréter `FF /3` avec Mod=11 comme un CALL far.

## 3. Registres et limites

Les huit registres généraux 16 bits sont contrôlés pour `CALL r/m16` :
`AX`, `CX`, `DX`, `BX`, `SP`, `BP`, `SI`, `DI`.

Les appels registre sont vérifiés en encodage, désassemblage et exécution source/binaire. Pour `CALL SP`, la valeur initiale de SP est également l'adresse cible ; le test vérifie que l'empilement puis le retour restaurent cette valeur exacte.

Les limites SP suivantes sont exercées pour les appels near et far :
- `0000h` ;
- `0001h` ;
- `FFFEh`.

Deux vecteurs supplémentaires contrôlent le bouclage d'offset :
- lecture du pointeur near dont le mot traverse `FFFFh → 0000h` ;
- lecture du pointeur far dont le mot offset et le mot segment traversent la frontière `FFFFh → 0000h`.

Les flux ModR/M tronqués et les extensions qui ne correspondent pas à CALL sont également rejetés ou conservés comme données, et non transformés en CALL.

## 4. Comparaison indépendante

`tests/call-indirect-8086.cjs` compare les octets émis par le laboratoire à ceux de GNU `as` 2.46 en `.code16` pour les huit formes EA et l'adressage direct, en near et far.

La comparaison est octet par octet. Elle porte sur les formes testées, pas sur toutes les variantes d'assembleur possibles ni sur un processeur physique.

## 5. Résultats automatisés observés

Sur le commit `acc2b0908bb167d1e5c8b19ff81642c78dcc0c72` :

- `tests/call-indirect-8086.cjs` : **177/177 assertions réussies** ;
- comparaison GNU `as` : réussie ;
- tests existants de pile CALL/RET : **6/6** ;
- CALL far direct : **4/4** ;
- suite complète CI principale : **success**, run [45661398723](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45661398723).

Le workflow navigateur inclut un scénario Playwright distinct pour CALL near indirect, CALL far indirect, l'ordre de pile, RETF et exécution binaire. Après correction de l'assertion d'affichage de pile, le workflow navigateur est passé avec succès sur le commit `e932b74c99b08e652a38c452d31baf6d0c451d8c`, run [45661559133](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45661559133). Le scénario vérifie les clics réels sur « Pas à pas », les valeurs CS:IP, les mots de pile, le retour RETF et le chemin d'exécution binaire.

## 6. Limites du modèle à maintenir dans la documentation

- Le moteur source utilise la représentation logique du programme et ne constitue pas une exécution physique d'un segment de code arbitraire.
- Le chemin binaire dynamique lit les octets depuis la mémoire, mais le laboratoire n'est pas encore un émulateur matériel complet du 8086.
- Les transferts far vers un segment contenant une image distincte doivent être distingués des scénarios où la cible est dans l'image binaire courante.
- Les cycles de bus, la BIU, la prélecture, l'arbitrage et les signaux physiques ne sont pas modélisés.
- Les résultats ne valident pas toutes les instructions FF ni toutes les combinaisons possibles de préfixes.

**Conclusion :** les formes CALL indirectes couvertes par la matrice ci-dessus disposent maintenant d'une suite de validation dédiée. La validation finale de cette phase attend encore le succès du workflow Playwright mis à jour. Le statut général CALL reste partiel tant que JMP indirect, toutes les variantes CALL et les limites de modèle ne sont pas auditées dans la matrice générale.

## Mise à jour — validation sur le commit de la PR (25 novembre 2026)

La phrase de la conclusion précédente indiquant que la validation finale attend encore le workflow Playwright est désormais dépassée.

Sur le commit `21b6c66fb35bf8057e0e81c73fa168a099a83b89` :

- Workflow CI principal **1209** : succès.
- Workflow navigateur **678** : succès.
- `tests/call-indirect-8086.cjs` : **177/177 assertions** réussies dans le workflow principal.
- Le workflow navigateur a exécuté `tests/call-indirect-interactive-8086.cjs` et terminé avec succès ; il vérifie le parcours interactif et le chemin binaire.

Cette mise à jour clôt le point « attente du workflow Playwright » pour le périmètre effectivement testé. Elle ne transforme pas ce périmètre en validation exhaustive de toutes les variantes de CALL/RET, de tous les préfixes ni de l'ensemble de la matrice ModR/M. La conclusion globale reste limitée aux formes décrites dans ce rapport et dans les tests dédiés.


## Actualisation sur `main` — 26 novembre 2026

La PR #1 qui contenait cette tranche d'audit a été fusionnée dans `main`. Le workflow CI principal actuel, run [45729424128](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45729424128), confirme :

- `tests/call-indirect-8086.cjs` : **177/177** ;
- `tests/call-ret-8086.cjs` : **4/4** ;
- `tests/call-ret-stack-boundaries.cjs` : **6/6** ;
- `tests/control-stack.cjs` : **305/305** ;
- workflow complet : **56/56 étapes réussies**.

Le test Chromium de CALL indirect avait réussi sur le commit de la PR fusionnée, run [45725877536](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45725877536). Le dernier changement de code relatif à cette actualisation concerne les tests de branchement ; aucune modification du moteur CALL/RET n'a été introduite dans ce lot.
