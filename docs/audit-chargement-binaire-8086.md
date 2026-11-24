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

La suite `tests/byte-offset-execution.cjs` valide **33 scénarios**, sans échec dans le workflow CI vérifié. Elle couvre notamment :

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


## Audit différentiel des moteurs — 24 novembre 2026

Nouvelle suite : [`tests/dynamic-differential.cjs`](../tests/dynamic-differential.cjs), exécutée dans le workflow CI principal après l'audit du chargeur binaire.

**29 tests réussis, 0 échec** sur le commit testé `8f0069c68ca794be47dc54582d1321796c7e47b0` :
- 5 vecteurs arithmétiques ADD/ADC/SUB/SBB, comparés entre moteurs et à des formules indépendantes de CF, ZF, SF, OF, PF et AF ;
- 4 cas AND/OR/XOR/TEST avec contrôle du résultat et des indicateurs définis ;
- 4 cas de registres : INC/DEC, NOT/NEG, écritures AL/AH et XCHG ;
- 5 cas mémoire/préfixes : DS par défaut, ES explicite, SS par défaut via BP, CS explicite, octet/mot et déplacement négatif ;
- 5 cas de contrôle/pile : CALL/RET near direct, CALL/RET near indirect, CALL FAR/RETF, branchements conditionnels/LOOP et JMP near indirect ;
- 3 cas IRET : restauration d'un cadre VECTOR dans le moteur source, exécution binaire depuis un cadre brut préchargé en mémoire, et rejet d'un cadre binaire absent ;
- 4 cas négatifs : cadres RET/RETF incompatibles, RET avec ajustement impair, extensions réservées et préfixes de segment répétés.

La comparaison porte sur les registres, les indicateurs modélisés, le nombre d'instructions, la sortie, les métadonnées de pile et des adresses mémoire de données explicitement ciblées. Les octets de code chargés dans le moteur binaire ne sont pas assimilés à des écritures de données du moteur source.

**Interprétation :** le test différentiel repère des divergences entre les deux chemins, mais les moteurs partagent certaines primitives et certaines règles d'interprétation. Les oracles indépendants ne couvrent que les vecteurs explicitement déclarés. Ce résultat ne constitue donc pas une preuve indépendante exhaustive de l'architecture 8086.

Registre détaillé des statuts par famille : [`registre-validation-dynamique-8086.md`](registre-validation-dynamique-8086.md). Aucun mnémonique n'est déclaré entièrement validé dans toutes ses formes 8086 ; le statut général demeure partiel.


## Correctif différentiel — IRET binaire et oracle arithmétique indépendant

Le chemin binaire ne se limite plus à rejeter `IRET` lorsqu'aucune métadonnée pédagogique de pile n'existe. L'exécution de `IRET` lit désormais les trois mots architecturaux depuis la mémoire à `SS:SP`, dans l'ordre de dépilement IP, CS, FLAGS. Lorsque le moteur source possède des métadonnées typées, leur cohérence reste contrôlée ; pour un binaire chargé, un cadre brut en mémoire suffit.

`executeBinary` accepte un quatrième argument facultatif `initialState` destiné à initialiser explicitement les registres, FLAGS, octets mémoire (adresses physiques 20 bits) et, facultativement, les métadonnées de pile. Le schéma est validé strictement ; les champs inconnus et valeurs hors plage sont rejetés. Aucun cadre d'interruption n'est créé implicitement.

Le nouveau vecteur IRET place un cadre brut dans la mémoire, change réellement CS, restaure IP et FLAGS, puis vérifie le bouclage de SP de `FFFEh` vers `0000h`. Il ne dépend pas de la directive source `VECTOR`.

La suite différentielle ajoute aussi un oracle de référence arithmétique indépendant : balayage exhaustif de **393 216** combinaisons 8 bits pour ADD, ADC, SUB et SBB avec les états de retenue pertinents, **800** vecteurs 16 bits aux frontières, et **1 350** exécutions binaires ALU à partir d'octets machine bruts, sans passer par l'assembleur du laboratoire.

L'audit différentiel a été étendu à 768 combinaisons registre-direct 8/16 bits, 512 cas couvrant les 16 conditions Jcc sur les 32 combinaisons CF/ZF/SF/OF/PF, les huit formes d'adressage mémoire et les quatre overrides de segment. Le chemin binaire décode désormais `INT imm8`, lit le vecteur dans l'IVT à l'adresse physique `vector × 4`, empile FLAGS/CS/IP et transfère le contrôle vers le gestionnaire ; le test vérifie le retour par IRET.

Validation CI : [run 45505775488](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45505775488), commit `39b342f1611e5f323c951e02830f8274b7109839`, workflow **success** ; suite différentielle **39/39 réussites**.

La portée reste bornée : ce renforcement ne transforme pas le moteur en émulateur matériel complet et ne prouve pas les formes qui ne sont pas implémentées.

## Extension du sous-ensemble binaire — 25 novembre 2026

Une passe d'implémentation couvre maintenant les familles précédemment absentes : LOOPE/LOOPNE/JCXZ, ajustements ASCII/BCD, CBW/CWD, rotations et décalages, IN/OUT, INTO, XLAT, LAHF/SAHF, WAIT, ESC et les préfixes REP/LOCK.

Les opcodes 8086 concernés sont intégrés à l'assembleur et au désassembleur ; l'exécution source et le fetch/décodage/exécution binaire prennent en charge les formes ciblées. Les chaînes sont répétées dynamiquement par CX et les conditions ZF appropriées ; IN/OUT utilisent une carte de ports logicielle initialisable explicitement.

**Limites qui restent importantes :** les ports ne représentent aucun périphérique matériel ; WAIT ne modélise pas l'entrée TEST ; ESC ne simule pas un coprocesseur 8087 ; LOCK ne produit aucune atomicité observable dans le moteur mono-thread ; les interactions arbitraires de préfixes et tous les vecteurs de FLAGS ne sont pas exhaustivement validés. Les familles nouvellement ajoutées restent donc marquées **partielles**.

Les tests spécialisés source/binaire et les validations CI associées déterminent le périmètre réellement vérifié. Cette extension ne constitue pas une certification d'émulation matérielle 8086 complète.

## Validation finale de l'extension des familles — 25 novembre 2026

Le workflow CI [45509976522](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45509976522) a terminé en **success** sur le commit `99d0da55965f7d020199184c4eaf609e1f3ebbb8`.

- Suite différentielle : **66/66 tests réussis**.
- Vecteurs indépendants : **114 tests réussis**.
- Oracle ALU : 393 216 cas 8 bits et 800 cas 16 bits.
- Décalages/rotations : 20 736 cas 8 bits et 504 cas 16 bits.
- Ajustements : 3 072 cas AAA/AAS/DAA/DAS, 256 AAM et 65 536 AAD.
- Extension de signe : 256 CBW et 65 536 CWD ; SAHF/LAHF : 32 combinaisons ; ESC : 64 codes.
- Les tests de formes comprennent les branches rel8 aux limites, les huit formes IN/OUT, les instructions de chaîne répétées, les overrides de segment, LOCK (y compris avec override ES) et INTO.

Les familles précédemment absentes sont désormais présentes dans les chemins ciblés de l'exécution source, de l'assembleur, du désassembleur et du moteur binaire. Elles restent classées **partielles** dans le registre : le modèle des ports est logiciel, WAIT ne simule pas TEST, ESC ne simule pas le coprocesseur, LOCK ne simule pas l'atomicité du bus, et les matrices exhaustives de toutes les formes/FLAGS/interactions de préfixes ne sont pas achevées.

Ce résultat valide les tests déclarés, pas l'exhaustivité matérielle de l'Intel 8086.
