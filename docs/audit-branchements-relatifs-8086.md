# Audit — transferts de contrôle relatifs 8086

**Dépôt :** `GLLR-Spirit/Intel-8086`  
**Branche :** `main`  
**Périmètre :** Intel 8086 original ; encodage, décodage et exécution pédagogique des branchements directs.

## 1. Formes binaires couvertes

| Forme | Opcode | Déplacement | Taille |
|---|---:|---:|---:|
| CALL near direct | E8 | rel16 signé | 3 octets |
| JMP near direct | E9 | rel16 signé | 3 octets |
| JMP short direct | EB | rel8 signé | 2 octets |
| Jcc (16 conditions) | 70h–7Fh | rel8 signé | 2 octets |
| LOOP | E2 | rel8 signé | 2 octets |

Les déplacements sont relatifs à l'adresse de l'octet suivant l'instruction. Le désassembleur calcule la cible à partir de cet offset après consommation du déplacement.

## 2. Relaxation de JMP

L'assembleur choisit automatiquement :
- `EB rel8` si la cible tient dans l'intervalle signé -128 à +127 ;
- `E9 rel16` sinon.

La première passe attribue provisoirement trois octets aux JMP directs. Une relaxation monotone réduit ensuite les JMP éligibles à deux octets et recalcule les offsets et symboles jusqu'à stabilisation. Cette étape est importante : raccourcir un saut peut déplacer les étiquettes suivantes et rendre d'autres sauts courts possibles.

Les tests couvrent les limites exactes +127, -128, +128 et -129, ainsi que l'ajustement des symboles après relaxation.

## 3. Déplacements rel16 et arithmétique IP

Pour CALL et JMP near, le déplacement est sérialisé sur 16 bits en little-endian. Le calcul est normalisé modulo 65536 puis interprété comme valeur signée dans [-32768, +32767]. L'addition à IP s'effectue modulo 16 bits : les tests incluent les valeurs -32768 et +32767 ainsi qu'un cas de franchissement de la frontière 16 bits.

Cette distinction est essentielle : une différence linéaire d'offset supérieure à +32767 peut représenter un déplacement négatif valide après bouclage de IP dans le même segment de code. Il ne faut donc pas rejeter arbitrairement tous les écarts linéaires hors de l'intervalle signé avant normalisation.

## 4. Conditions Jcc

Les seize opcodes 70h à 7Fh sont contrôlés individuellement :
- JO/JNO : OF ;
- JB/JAE : CF ;
- JE/JNE : ZF ;
- JBE/JA : CF et ZF ;
- JS/JNS : SF ;
- JP/JNP : PF ;
- JL/JGE : SF comparé à OF ;
- JLE/JG : ZF et comparaison SF/OF.

Les tests différentiels calculent indépendamment les FLAGS attendus d'une soustraction 16 bits et vérifient chaque condition sur plusieurs couples d'opérandes. Les alias (JC/JB, JZ/JE, etc.) partagent les opcodes canoniques correspondants.

## 5. LOOP

`LOOP rel8` décrémente CX modulo 65536 et branche si le résultat n'est pas nul. Il ne modifie pas les FLAGS. Le cas initial CX=0 est explicitement vérifié : CX devient FFFFh et le branchement est pris.

## 6. Limites du modèle

L'assembleur et le désassembleur travaillent sur de véritables offsets octet dans le flux produit. En revanche, l'interpréteur pédagogique continue de représenter son IP comme un indice logique dans la liste des instructions analysées. L'exécution des branches directes utilise les étiquettes résolues du programme, et ne constitue donc pas encore une simulation complète de CS:IP sur un segment de code binaire chargé.

La relaxation automatique ne propose pas de syntaxe pour forcer un JMP near lorsque la cible est également accessible en short ; l'assembleur privilégie EB dans ce cas. E9 reste utilisé dès que rel8 ne suffit pas.

## 7. Batterie de tests

Suite dédiée : [`tests/relative-branches.cjs`](../tests/relative-branches.cjs).

Elle couvre la relaxation JMP, les limites rel8, les limites rel16, les seize conditions et leurs FLAGS, LOOP, les offsets de désassemblage et les flux tronqués. Le workflow CI [45484177621](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45484177621) a réussi sur le commit `aa8b455e9cce132c0c437b2fc1f1ce30306b1f51`. Les **187 vecteurs** de cette suite passent, et le workflow complet valide **8 736 vérifications avec 0 échec**.
