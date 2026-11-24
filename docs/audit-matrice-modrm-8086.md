# Audit de couverture ModR/M — Intel 8086

**Date :** 24 novembre 2026  
**Branche auditée :** `main`  
**Fichier moteur :** `index.html`  
**Fichiers de test :** `tests/smoke.cjs`, `tests/instruction-vectors.cjs`  
**Nature :** audit statique des tests existants ; aucun changement du moteur CPU, de l'assembleur ou du désassembleur.

## 1. Conclusion exécutive

Le moteur contient une implémentation générique des champs ModR/M et le désassembleur sait reconstruire les huit expressions d'adresse mémoire. Des tests représentatifs existent déjà, y compris un round-trip qui utilise les huit valeurs `r/m` mémoire.

En revanche, les tests ne constituent pas une exploration exhaustive des 256 octets ModR/M possibles pour chaque opcode concerné. Ils ne couvrent pas systématiquement le produit cartésien :

- `mod` : 4 valeurs ;
- `reg` : 8 valeurs ;
- `r/m` : 8 valeurs.

Soit **256 octets ModR/M par opcode** (dont les interprétations et restrictions dépendent de l'opcode). L'absence d'un test systématique ne signifie pas que le moteur échoue sur le cas : elle signifie que le cas n'est pas encore certifié.

## 2. Matrice structurelle complète

Un octet ModR/M se décompose ainsi :

```text
7       6 5       3 2       0
+---------+---------+---------+
|   mod   |   reg   |   r/m   |
+---------+---------+---------+
  2 bits    3 bits    3 bits
```

### 2.1 Matrice des modes

| `mod` | Nombre de valeurs `r/m` | Interprétation | Octets ModR/M possibles |
|---|---:|---|---:|
| `00` | 8 | Mémoire sans déplacement ; `r/m=110` signifie adresse directe `disp16` | 64 (8 × 8 valeurs `reg`) |
| `01` | 8 | Mémoire avec déplacement signé `disp8` | 64 |
| `10` | 8 | Mémoire avec déplacement `disp16` | 64 |
| `11` | 8 | Opérande `r/m` en registre | 64 |
| **Total** | **32** | **256 valeurs ModR/M** | **256** |

Pour un opcode donné, les 256 octets ne sont pas tous nécessairement valides : les extensions `reg` peuvent réserver ou interdire certaines valeurs.

### 2.2 Décodage des huit adresses effectives

| `r/m` | Expression mémoire | Segment par défaut attendu |
|---|---|---|
| `000` | `[BX+SI]` | DS |
| `001` | `[BX+DI]` | DS |
| `010` | `[BP+SI]` | SS |
| `011` | `[BP+DI]` | SS |
| `100` | `[SI]` | DS |
| `101` | `[DI]` | DS |
| `110` | `[BP]`, sauf `mod=00` | SS |
| `111` | `[BX]` | DS |

Cas spécial obligatoire : `mod=00, r/m=110` encode une adresse directe `disp16`, et non `[BP]`.

## 3. Familles de formes ModR/M repérées dans le moteur

L'inspection de `encodingBytes` et de `disassembleBytes` confirme des chemins ModR/M pour les familles suivantes :

| Famille | Opcodes/formes repérés | Particularité à auditer |
|---|---|---|
| MOV général | `88`–`8B` | Deux directions, tailles 8/16 bits |
| MOV segment | `8C`, `8E` | `reg` désigne Sreg ; CS interdit en destination de `8E` |
| MOV immédiat | `C6`, `C7` | Extension `/0` seulement |
| Arithmétique/logique | `00`–`03`, `08`–`0B`, `10`–`13`, `18`–`1B`, `20`–`23`, `28`–`2B`, `30`–`33`, `38`–`3B` | `reg` est un registre général ; sens déterminé par D |
| Groupes immédiats | `80`, `81`, `83` | `reg` est une extension d'opération |
| TEST | `84`, `85`, `F6`, `F7` | Groupe `F6/F7` : extension `/0` pour TEST |
| XCHG | `86`, `87` | Deux largeurs |
| INC/DEC | `FE`, `FF` | Extensions `/0` et `/1` reconnues dans le décodeur |
| LEA / LES / LDS | `8D`, `C4`, `C5` | Exigent une opérande mémoire ; `mod=11` ne doit pas être présenté comme valide |
| Autres familles | À inventorier selon les branches effectives | Ne pas déduire la prise en charge des seules fiches de référence |

Cette table décrit les branches identifiées, pas une certification de toutes les combinaisons.

## 4. Couverture de tests effectivement repérée

### 4.1 Tests smoke dans `index.html`

Les tests existants comprennent notamment :

- MOV mémoire avec les huit expressions d'adresse effective, dans un seul test round-trip ;
- des exemples registre-direct, `disp8`, `disp16` et adresse directe ;
- des cas de déplacement positif et négatif ;
- plusieurs préfixes de segment explicites et le segment SS par défaut pour BP ;
- des cas isolés de `C6/C7`, de groupes arithmétiques et d'extensions non prises en charge ;
- quelques cas `FE/FF`, `8C/8E`, `LEA/LES/LDS`.

**Limite :** ces cas sont représentatifs. Ils ne parcourent pas chaque valeur `reg` pour chaque couple `mod/r/m`, ni chaque opcode de chaque famille.

### 4.2 Vecteurs binaires indépendants

Le fichier `tests/instruction-vectors.cjs` contient des octets littéraux pour des formes MOV, arithmétiques, immédiates, moffs et quelques déplacements. Il vérifie également certains cas invalides, notamment `C7 /1`.

**Limite :** les vecteurs ne forment pas encore une matrice exhaustive ModR/M. Les vecteurs assembleur et désassembleur sont indépendants l'un de l'autre, mais leur nombre et leur variété ne suffisent pas à couvrir les 256 valeurs par opcode.

## 5. Matrice de couverture actuelle et lacunes

Légende :
- **Partiel** : au moins un cas représentatif existe.
- **Non systématique** : la famille n'est pas parcourue sur toutes les valeurs du champ concerné.
- **À établir** : l'audit statique n'a pas trouvé de preuve de test exhaustive.

| Dimension | État constaté | Lacune à combler |
|---|---|---|
| `mod=00`, huit `r/m` | Partiel | Tester les 8 valeurs avec plusieurs valeurs `reg` et les opcodes applicables |
| `mod=01`, huit `r/m` | Partiel | Tester chaque EA et les bornes `disp8=-128,+127` |
| `mod=10`, huit `r/m` | Partiel | Tester chaque EA, les bornes de déplacement 16 bits et l'ordre little-endian |
| `mod=11`, huit `r/m` | Partiel | Tester les 8 registres pour chaque largeur et direction |
| Champ `reg` général | Partiel | Parcourir les 8 codes registre pour chaque famille directionnelle |
| Champ `reg` d'extension | Partiel | Matrice positive/négative par opcode de groupe |
| Adresse directe `mod=00,r/m=110` | Partiel | Distinguer explicitement de `[BP]` pour chaque forme mémoire |
| Préfixes de segment | Partiel | Combiner chaque override avec les modes mémoire pertinents |
| Représentation assembleur | Partiel | Vérifier les octets exacts, pas seulement le round-trip |
| Décodage binaire externe | Partiel | Fournir des octets fixes pour chaque classe et chaque extension |
| Exécution mémoire | Partiel | Vérifier EA effective, segment par défaut, override, lecture/écriture et largeur |

**Bilan quantitatif certifiable à ce stade :** 256 valeurs structurelles sont définies par opcode ModR/M, mais aucun décompte exhaustif de ces valeurs testées ne peut être attribué à la suite actuelle. Les tests ciblés connus démontrent une couverture représentative, pas un pourcentage exhaustif fiable.

## 6. Plan de génération de la matrice de certification

La prochaine suite devra générer des cas à partir d'une table de référence indépendante du moteur :

1. Pour chaque opcode ModR/M retenu, énumérer `mod=0..3`, `reg=0..7`, `r/m=0..7`.
2. Classer chaque combinaison : valide, invalide, ou dépendante d'une contrainte de forme.
3. Pour chaque combinaison valide :
   - comparer les octets attendus de l'assembleur ;
   - désassembler un flux d'octets écrit dans le test ;
   - vérifier la longueur et la frontière de l'instruction ;
   - vérifier les opérandes reconstruits.
4. Pour chaque combinaison invalide :
   - vérifier le rejet par l'assembleur lorsque la syntaxe correspondante est interdite ;
   - vérifier que le désassembleur ne l'affiche pas comme une instruction valide ;
   - vérifier qu'il ne désynchronise pas le flux suivant.
5. Ajouter séparément les valeurs de déplacement et les préfixes de segment ; ils ne sont pas codés dans les 8 bits ModR/M eux-mêmes.
6. Exécuter la suite existante sans modification et conserver les références de base : 354 tests smoke et 114 vecteurs indépendants, sous réserve de confirmation par une nouvelle exécution CI.

## 7. Règles de comptage pour éviter les faux taux de couverture

Ne pas confondre :
- nombre de valeurs ModR/M structurelles ;
- nombre de combinaisons valides pour un opcode donné ;
- nombre de cas assemblés ;
- nombre de vecteurs de désassemblage indépendants ;
- nombre de cas d'exécution du simulateur.

Un test round-trip unique qui contient les huit expressions d'adresse ne valide pas les 8 × 8 valeurs `reg`, les quatre valeurs `mod`, ni toutes les familles d'opcodes. De même, la présence d'une branche générique dans le moteur ne prouve pas que ses 256 octets ont été testés.

## 8. Décision de cet audit

- **Aucun changement moteur effectué.**
- **Aucun test existant modifié.**
- Les huit expressions d'adresse mémoire sont déjà exercées dans un test smoke représentatif.
- La couverture exhaustive ModR/M n'est pas démontrée.
- Les lacunes exactes sont les croisements non systématiques des champs `mod`, `reg`, `r/m`, par famille d'opcodes, ainsi que les tests positifs/négatifs des extensions.

La phase suivante pourra ajouter une suite de certification dédiée et indépendante, sans toucher au moteur tant que la matrice attendue n'est pas spécifiée.
