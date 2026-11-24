# Audit des contraintes d'opérandes 8086

Date : 24 novembre 2026

## Objectif

Vérifier les contraintes architecturales des instructions utilisant ModR/M sans modifier le moteur. Cette suite sépare :
- les formes valides et leurs octets exacts ;
- les formes que l'assembleur doit refuser ;
- les encodages que le désassembleur doit laisser sous forme de données ;
- les flux incomplets, qui doivent produire une erreur explicite ;
- les effets d'exécution des instructions déjà prises en charge.

Références de codage : manuel Intel 8086, table « Instruction Set Summary » (opcodes 8C/8E, 8D, C4/C5), et documentation de référence Intel pour les formats ModR/M. Les opcodes LEA=8D, LES=C4 et LDS=C5 sont bien des instructions 8086. Le champ ModR/M de LEA/LES/LDS doit désigner la mémoire ; mod=11, qui désigne un registre, est une forme invalide pour ces instructions.

## Périmètre testé

### LEA (8D /r)
- 24 combinaisons mémoire : mod=00,01,10 × r/m=000..111.
- Vérification des octets d'assemblage et des octets fixes du désassembleur.
- 8 formes register-direct (mod=11) vérifiées comme invalides.
- Exécution vérifiée : calcul de l'offset effectif sans lecture de la mémoire et conservation de CF/DF.

### LES (C4 /r) et LDS (C5 /r)
- 24 combinaisons mémoire par instruction.
- 8 formes register-direct invalides par instruction.
- Vérification de l'exécution et du chargement little-endian de l'offset et du segment.

### MOV entre registre général/mémoire et registre de segment (8C/8E)
- Les quatre champs de registre segment ES, CS, SS, DS.
- Les huit registres généraux en mode register-direct.
- MOV vers CS via 8E /1 rejeté.
- Les extensions de champ segment 4..7 rejetées.
- Formes mémoire word testées.
- Qualificateurs BYTE incompatibles rejetés.

### Flux tronqués
20 vecteurs couvrent les octets ModR/M absents, les déplacements disp8/disp16 incomplets et les mots directs incomplets pour 8D, C4, C5, 8C et 8E.

## Résultats CI

Workflow : https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45448321120

- LEA : 48 vérifications.
- LES/LDS : 96 vérifications.
- MOV registres de segment : 60 vérifications.
- Encodages invalides : 43 vérifications.
- Flux tronqués : 20 vérifications.
- Exécution : 2 vérifications.
- Total de la suite : 269 réussites, 0 échec.

Les suites précédentes restent vertes :
- smoke : 354/354 ;
- vecteurs indépendants : 114/114 ;
- matrice ModR/M : 2 352 cas ;
- adressage/déplacements : 187 vérifications ;
- FLAGS : 3 412 vecteurs.

## Limites explicites

Cette suite ne prouve pas l'exhaustivité de tout le jeu d'instructions 8086. Elle certifie uniquement les formes et les contraintes listées ci-dessus. Les extensions de groupes non encore décodées restent à traiter séparément. Une forme reconnue comme invalide par le désassembleur ne doit pas être confondue avec une forme valide mais non encore prise en charge.

Aucune modification du moteur n'a été apportée pour cette phase.
