# Audit du décodage dynamique et de la cohérence mémoire 8086

Date : 24 novembre 2026

## Verdict de cette phase

Le chemin d'exécution binaire effectue désormais un cycle **fetch → decode → execute** à partir de la mémoire simulée. Il ne construit plus une liste complète d'instructions en balayant le flux initial. Chaque instruction est relue et décodée à la demande à l'adresse courante `CS:IP`.

Ce résultat fiabilise le modèle pédagogique de décodage dynamique, mais ne transforme pas le projet en émulateur matériel 8086 complet. La couverture s'applique aux opcodes et formes que le décodeur et l'interpréteur savent traiter.

## Cycle d'exécution

Pour chaque étape :

1. Calcul de la base physique du segment courant : `(CS << 4) & 0xFFFFF`.
2. Lecture des octets depuis `cpu.mem` à `CS:(IP + n mod 65536)`, avec adresse physique 20 bits.
3. Arrêt de la lecture anticipée au premier octet non initialisé, sans le remplacer artificiellement par zéro.
4. Appel de `disassembleBytes(window, 1)` pour décoder une seule instruction.
5. Conversion de la ligne décodée en opération exécutable.
6. Exécution avec l'interpréteur existant.
7. Mise à jour de IP selon la longueur décodée ou la destination d'un branchement/transfert.
8. Reprise du fetch à la nouvelle adresse.

Le mode retourné est `execution.mode = "dynamic-binary"`. Le compteur `execution.decodedInstructions` compte les instructions réellement décodées pendant l'exécution.

## Résultats de validation

La suite `tests/byte-offset-execution.cjs` valide notamment :

| Domaine | Couverture |
|---|---|
| Valeurs opcode | Les 256 valeurs de l'octet opcode passent par le décodeur à une instruction |
| Extensions ModR/M | 3 072 combinaisons : 12 groupes × 256 valeurs ModR/M |
| Troncature | Immédiat incomplet refusé au lieu d'un remplissage artificiel par zéro |
| Limites IP | Instruction traversant `FFFFh → 0000h` |
| Adresse physique | Repli 20 bits à `FFFFFh` |
| Préfixes | CS, ES, SS et DS ; lectures et écritures dans le segment sélectionné |
| Branchements | Positifs, négatifs, conditionnels et bouclage IP |
| Transferts indirects | CALL/JMP near par registre et CALL/JMP FAR par pointeur mémoire |
| Auto-modification | Modification d'un opcode et modification de deux octets d'une instruction |
| Référence indépendante | Vecteurs binaires à résultats architecturaux attendus |
| Comparaison | Concordance source assemblée / binaire sur les registres et FLAGS sélectionnés |

Les matrices opcode et ModR/M vérifient que le décodeur produit une seule ligne bornée et consomme des octets. Elles ne prouvent pas que chaque encodage est architecturalement valide, ni que chaque opcode est exécuté. Les formes non prises en charge restent explicitement refusées lorsqu'elles sont retournées sous forme `DB`.

## Préfixes et mémoire

Les préfixes de segment reconnus par le décodeur sont ES (`26h`), CS (`2Eh`), SS (`36h`) et DS (`3Eh`). Les tests vérifient que les instructions mémoire utilisent le segment sélectionné et que le calcul physique reste limité à 20 bits.

Les préfixes répétés et les autres préfixes non implémentés ne sont pas déclarés pris en charge par cet audit. Il ne faut pas extrapoler les résultats aux préfixes REP/LOCK ou à toutes leurs combinaisons.

## Branchements et code auto-modifiable

Un branchement relatif peut cibler une adresse qui n'était pas une frontière d'instruction dans un désassemblage linéaire préalable : aucun balayage linéaire global ne fixe les frontières d'instructions.

Les écritures dans `cpu.mem` sont visibles au prochain fetch. Les tests couvrent le remplacement d'un opcode ainsi que la modification de deux octets d'une instruction avant son exécution. Aucun cache d'instructions n'est maintenu.

Les transferts indirects near et FAR sont testés dans le modèle dynamique, y compris la restauration de CS:IP par CALL FAR / RETF.

## Gestion des flux tronqués

Le fetch construit sa fenêtre uniquement avec les octets effectivement initialisés. Si le décodeur a besoin d'octets supplémentaires et qu'ils ne sont pas disponibles, l'instruction est signalée comme tronquée. Les octets absents ne sont plus synthétisés en `00h`.

Un fetch à une adresse non initialisée échoue explicitement. C'est une politique pédagogique déterministe ; elle ne prétend pas modéliser la valeur réelle de la RAM non initialisée sur une machine physique.

## Limites qui restent

- Le décodeur et l'interpréteur ne couvrent qu'un sous-ensemble du jeu d'instructions original 8086.
- La matrice de décodage ne certifie pas l'exécution correcte des 256 opcodes ni toutes les formes ModR/M.
- Les préfixes répétés, REP/LOCK et leurs interactions complètes ne sont pas couverts ici.
- Le modèle ne simule pas la prélecture BIU, les files d'instructions, les cycles d'horloge, les bus ni les temps d'accès.
- Les interruptions matérielles, DMA, périphériques, modes de fonctionnement et environnement DOS ne constituent pas une émulation complète.
- Les instructions qui utilisent une forme non prise en charge restent refusées ; aucun comportement approximatif n'est revendiqué.

## Conclusion technique

Le critère central de cette phase est atteint : **l'instruction exécutée est décodée depuis les octets actuellement présents en mémoire à CS:IP**. Les branchements dynamiques et l'auto-modification ne dépendent plus d'une table de frontières préparée à l'avance.

La prochaine étape ne devrait pas être d'ajouter massivement des instructions. Il faut d'abord poursuivre l'audit des formes non prises en charge, des préfixes, des effets mémoire et des vecteurs indépendants, puis étendre le jeu d'instructions par familles vérifiées.
