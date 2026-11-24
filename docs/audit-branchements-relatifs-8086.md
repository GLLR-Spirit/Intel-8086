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

## 6. Cohérence entre octets et exécution

Lorsque toutes les instructions d'un programme sont encodables, l'interpréteur construit une image d'exécution à partir du listing de `assembleProgram` :

- `offsets[index]` associe chaque indice d'instruction à son offset binaire ;
- `offsetToIndex[offset]` retrouve l'instruction qui commence à un offset donné ;
- les étiquettes sont résolues par le chemin étiquette → offset octet → indice d'instruction ;
- `IP` est actualisé avec l'offset octet de l'instruction courante, puis avec celui de la prochaine instruction.

Les branchements directs conditionnels, JMP, LOOP, CALL et les gestionnaires VECTOR passent par cette table. Les transferts indirects near interprètent leur cible comme un offset IP et refusent une adresse qui ne correspond pas au début d'une instruction. CALL near empile l'offset octet suivant CALL ; RET dépile cet offset et le résout en indice d'instruction. Les cadres IRET utilisent également des offsets octet. CALL FAR/RETF conservent l'ordre CS:IP et résolvent l'offset de retour dans l'image de code du laboratoire.

Pour un flux de exactement 65 536 octets, le passage séquentiel de l'octet FFFFh au suivant fait revenir IP à 0000h et l'exécution reprend au premier octet. Pour les images plus petites, atteindre la fin du programme reste une fin d'exécution pédagogique et ne provoque pas un rebouclage artificiel.

Si une instruction n'est pas encodable par le sous-ensemble de l'assembleur, l'exécution utilise explicitement le mode de repli `logical-fallback` (IP logique). Le résultat expose `execution.mode` et `execution.codeSize` pour distinguer les deux modèles.

### Limites restantes

Ce changement n'est pas un chargement de binaire brut ni un émulateur matériel complet. L'image d'exécution est reconstruite à partir du source assemblé et ne représente qu'un segment de code pédagogique. Les transferts FAR peuvent changer CS, mais le laboratoire ne charge pas une image mémoire indépendante pour chaque valeur de CS : la résolution de l'offset reste liée à l'image source courante. Les cibles indirectes doivent être des frontières d'instructions connues ; les préfixes, les octets de données mélangés au code, les recouvrements de flux et le comportement de prélecture BIU ne sont pas simulés.

La relaxation automatique ne propose pas de syntaxe pour forcer un JMP near lorsque la cible est également accessible en short ; l'assembleur privilégie EB dans ce cas. E9 reste utilisé dès que rel8 ne suffit pas.

## 7. Batterie de tests

- [`tests/relative-branches.cjs`](../tests/relative-branches.cjs) : relaxation JMP, limites rel8/rel16, seize conditions, FLAGS, LOOP et flux tronqués (**187 vecteurs**).
- [`tests/byte-offset-execution.cjs`](../tests/byte-offset-execution.cjs) : table d'offsets, IP séquentiel, branchements, CALL/RET et segment de 65 536 octets (**7 scénarios indépendants**).
- [`tests/control-stack.cjs`](../tests/control-stack.cjs) : transferts indirects near/far, pile, retours et contraintes POP/RET.

Le total CI doit être lu sur le dernier workflow validé pour le commit concerné ; les résultats antérieurs de la phase relative ne valident pas cette phase d'intégration.


## Chargement et exécution initiale d'un flux binaire

Le laboratoire accepte maintenant un tableau d'octets avec un `CS:IP` initial choisi. Les octets sont copiés dans la mémoire simulée selon l'adresse physique 8086 sur 20 bits, et le décodeur existant produit une table des frontières d'instructions. Les branchements relatifs vers ces frontières, ainsi que CALL/RET, sont exécutés dans le modèle chargé. Les octets non pris en charge ou les cibles au milieu d'une instruction sont refusés explicitement.

**Cette étape n'est pas encore un fetch/decode dynamique.** Le décodage reste linéaire et préalable au démarrage ; le moteur n'effectue pas encore la lecture et le décodage d'un opcode depuis la mémoire à chaque instruction. Voir [l'audit du chargeur binaire](audit-chargement-binaire-8086.md).
