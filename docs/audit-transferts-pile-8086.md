# Audit — POP r/m16, RET near/far et transferts indirects 8086

**Dépôt :** `GLLR-Spirit/Intel-8086`  
**Branche :** `main`  
**Périmètre :** Intel 8086 original ; encodage, décodage et simulation pédagogique.  
**Règle d'audit :** une forme architecturalement valide peut être assemblée/désassemblée sans que son exécution soit nécessairement simulée.

## 1. POP r/m16 — opcode 8F

- L'extension **8F /0** encode `POP r/m16`.
- Les huit registres généraux sont des opérandes valides en ModR/M `mod=11`, même si l'assembleur choisit les opcodes compacts `58h–5Fh` pour `POP r16`.
- Les formes mémoire utilisent `8F /0`, avec les huit modes d'adressage et leurs déplacements.
- Les extensions **/1 à /7 sont réservées**. Le désassembleur conserve l'encodage sous forme `DB` au lieu de les présenter comme des instructions POP valides.
- L'exécution de `POP r/m16` réutilise la primitive de dépilement existante ; le mot est écrit dans le registre ou l'emplacement mémoire demandé.

## 2. RET proche

| Opcode | Forme | Sémantique |
|---|---|---|
| `C3` | `RET` | Dépile IP |
| `C2 iw` | `RET imm16` | Dépile IP, puis ajoute l'immédiat à SP |

L'immédiat est un mot little-endian. L'assembleur et le désassembleur couvrent les deux formes.

Dans le simulateur, un `CALL` proche empile l'adresse de retour logique, et `RET` la restaure. `RET imm16` dépile ensuite les mots d'arguments du cadre suivi par le laboratoire.

## 3. RET lointain

| Opcode | Forme | Sémantique |
|---|---|---|
| `CB` | `RETF` | Dépile IP puis CS |
| `CA iw` | `RETF imm16` | Dépile IP puis CS, puis ajuste SP |

Le pointeur lointain en mémoire est un couple `m16:16` : déplacement IP à l'adresse effective, puis segment CS aux deux octets suivants.

Pour un `CALL FAR PTR [mem]`, le simulateur empile CS puis IP : IP se trouve donc au sommet et est dépilé en premier par `RETF`. Le retour restaure les deux composantes du couple CS:IP.

## 4. CALL/JMP indirects

Les extensions du groupe `FF` pertinentes sont :

| Extension | Forme | Opérandes architecturaux |
|---|---|---|
| /2 | `CALL r/m16` | Registre ou mémoire |
| /3 | `CALL m16:16` | Mémoire uniquement |
| /4 | `JMP r/m16` | Registre ou mémoire |
| /5 | `JMP m16:16` | Mémoire uniquement |

Le laboratoire assemble et désassemble les formes near et far couvertes. La syntaxe pédagogique du pointeur lointain est `FAR PTR [adresse]`, sans qualificateur BYTE/WORD.

L'interpréteur exécute désormais les transferts indirects :
- near : la cible provient d'un registre 16 bits ou d'un mot mémoire ;
- far : la cible IP et le segment CS sont lus dans les quatre octets du pointeur mémoire ;
- CALL empile l'adresse de retour ; JMP ne modifie pas la pile ;
- les cibles IP indirectes doivent désigner une instruction existante dans le programme simulé.

## 5. Modèle d'exécution et limites explicites

Le simulateur n'est pas un émulateur binaire chargé à une adresse physique. Son `IP` est un **indice logique dans la liste des instructions analysées**, et non l'offset octet réel du code machine. Par conséquent, les tests indirects utilisent des valeurs de cible correspondant à ces indices. Le décodage binaire, lui, calcule les offsets d'instructions selon les octets.

Le suivi de pile enregistre des mots et leur rôle (`data`, `return`, `return-ip`, `return-cs`, etc.). Pour préserver la cohérence de ces métadonnées, l'exécution de `RET imm16` et `RETF imm16` est limitée aux ajustements pairs qui retirent un nombre entier de mots suivis. Un ajustement impair reste une forme machine valide, et reste encodable/décodable, mais l'interpréteur le refuse explicitement. Cette restriction appartient au modèle pédagogique de pile, pas à l'architecture 8086.

Les erreurs de pile (pile vide, type de retour incompatible, segment de retour absent, argument non marqué comme donnée) sont signalées plutôt que de produire un état CS:IP artificiel.

## 6. Batterie de tests

Nouvelle suite : [`tests/control-stack.cjs`](../tests/control-stack.cjs).

Elle couvre :
- les 256 valeurs ModR/M de `8F`, dont /0 valide et /1–/7 réservés ;
- les formes POP registre compact et POP mémoire ;
- les encodages fixes C2/C3/CA/CB et leurs immédiats little-endian ;
- les formes FF /2 à /5 near/far, y compris les contraintes mémoire des pointeurs lointains ;
- les flux tronqués ;
- l'exécution CALL/JMP indirecte par registre et mémoire ;
- la restauration de CS:IP et les effets sur SP ;
- `RET imm16` et `RETF imm16`, y compris la limite explicite des ajustements impairs.

La suite est exécutée dans le workflow CI principal. Les nombres de réussite définitifs sont ceux du dernier run associé au commit audité ; ce document ne doit pas être interprété comme une certification matérielle du processeur.

## 7. Conclusion

Cette phase étend la couverture de POP, RET proche/lointain et des transferts indirects. Elle conserve une distinction stricte entre encodages réservés, formes valides, décodage disponible et sémantique réellement simulée. La limite majeure restante est l'absence d'un modèle d'exécution basé sur les offsets octet réels d'un segment de code chargé.
