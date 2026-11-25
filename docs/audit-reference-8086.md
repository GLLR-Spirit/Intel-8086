# Audit de précision — Référence Intel 8086

**État :** audit en cours — ne pas présenter la rubrique comme une encyclopédie exhaustive.

## Inventaire canonique — première passe

Le registre distinct des graphies mnémotechniques, synonymes, préfixes et éléments hors périmètre est maintenu dans [instruction-inventory-8086.md](instruction-inventory-8086.md). La matrice d'audit statique, fondée sur le code actuel, est maintenant consignée dans [coverage-audit-8086.md](coverage-audit-8086.md). Son dénominateur de travail est de 93 entrées canoniques ; les 58 cartes de l'interface ne sont pas utilisées comme dénominateur. Les graphies dont le statut historique est incertain (notamment FWAIT, XLATB et RETF) restent explicitement à confirmer et ne sont pas déclarées instructions canoniques sur la seule base de leur présence dans des assembleurs.

## Réconciliation initiale des opcodes

Une première table de correspondance mnémotechnique/opcode ou groupe d'opcodes a été ajoutée à `instruction-inventory-8086.md`. Elle distingue notamment les préfixes LOCK/REP, les groupes ModR/M et les alias conditionnels. Les formes AAD/AAM sont limitées à la séquence 8086 documentée avec l'immédiat 0Ah ; les opcodes de décalage à compte immédiat C0h/C1h sont explicitement exclus du 8086. Cette table demeure un index de familles : elle ne remplace pas les fiches par forme, et les graphies FWAIT, XLATB, RETF et certains synonymes restent à confirmer dans le manuel d'assembleur primaire.

## Périmètre vérifié dans cette passe

L'interface actuelle expose 58 entrées documentaires. Ce nombre correspond aux cartes affichées, pas au nombre de mnémotechniques distincts : plusieurs cartes regroupent des alias ou des familles, et certaines décrivent des concepts non-instructions (adressage mémoire, directive pédagogique `VECTOR`).

Les fiches doivent être auditées au niveau de chaque forme d'encodage, et non uniquement au niveau du mnémotechnique. Une fiche regroupée ne prouve donc pas que toutes les variantes sont décrites.

## Première matrice des formes d'opérandes

La fiche [operand-encoding-8086.md](operand-encoding-8086.md) détaille une première passe sur MOV, ADD, ADC, SUB, SBB et CMP : formes registre/mémoire, formes immédiates, opcodes, champs ModR/M, restrictions et FLAGS. Le registre [form-coverage-register-8086.md](form-coverage-register-8086.md) décompose maintenant ces six mnémotechniques en 59 formes documentaires distinctes et distingue présence du code et validation indépendante. Elle corrige également une confusion d'indexation : 8Dh correspond à LEA, et ne doit pas être inclus dans la plage des opcodes MOV.

La suite indépendante couvre désormais MOV, ADD, SUB, CMP, ADC et SBB avec des octets fixes pour l'assembleur et le désassembleur, ainsi que des tests sémantiques du simulateur. Le run CI 210 (24 novembre 2026, commit `48ae8aadf86354dc74283591059e5c7ec2548129`) a validé 354/354 tests de fumée et 40/40 vecteurs indépendants. Cette couverture reste partielle et ne clôt pas l'audit.

## Corrections effectuées

- **ADC et SBB** : implémentées dans le validateur et l'interpréteur, et dans les formes binaires principales du générateur/désassembleur. Les formes 83h à immédiat signé court et l'exhaustivité des formes restent à auditer.
- Les vecteurs indépendants couvrent désormais un sous-ensemble des formes binaires et des cas sémantiques ADC/SBB ; ils ne couvrent pas encore chaque forme d'opérande. Le moteur CPU a bien été modifié pour intégrer ces deux instructions.

## Points de contrôle à appliquer à chaque fiche

- [ ] Mnémotechnique matériel 8086 confirmé ; distinguer alias, préfixe, directive et concept d'adressage.
- [ ] Toutes les formes 8/16 bits et formes registre/mémoire/immédiat réellement autorisées sont listées.
- [ ] Champs ModR/M, extensions `/digit`, opcodes compacts et préfixes documentés séparément.
- [ ] Restrictions 8086 distinguées des extensions apparues sur les processeurs ultérieurs.
- [ ] Chaque indicateur FLAGS est qualifié : modifié, conservé, conditionnel, effacé, positionné, restauré ou indéfini.
- [ ] Les temps sont associés à la forme exacte et séparent base, `+EA`, transferts mémoire/pile et branchement pris/non pris.
- [ ] Les statuts du simulateur, de l'assembleur et du désassembleur sont vérifiés séparément contre le code et les tests.
- [ ] Une source primaire et une localisation précise (table, section ou page) sont associées à la famille.

## Anomalies et limites encore ouvertes

1. **Exhaustivité des mnémoniques et alias :** une première matrice de 93 entrées canoniques est maintenant publiée dans coverage-audit-8086.md. Le décompte est un inventaire de travail, pas encore une certification historique exhaustive ; il reste à confirmer chaque entrée, alias et opcode avec les tables primaires Intel.
2. **Formes d'opérandes :** une première matrice détaillée existe maintenant pour MOV, ADD, ADC, SUB, SBB et CMP dans operand-encoding-8086.md. Les autres familles restent à décomposer ; pour ces six instructions, les formes mémoire/immédiat et les cas limites FLAGS doivent encore être mieux couverts par les vecteurs.
3. **FLAGS indéfinis :** certaines fiches mentionnent les indicateurs indéfinis, mais il faut vérifier chaque instruction et chaque variante contre la table Intel. « Indéfini » ne signifie ni « conservé » ni « égal à zéro ».
4. **Cycles :** les valeurs regroupées ou formulées « variable » restent insuffisantes pour une référence de précision. Les coûts EA doivent être appliqués uniquement aux formes mémoire concernées. Les effets de prélecture BIU, les transferts de mots non alignés et les branchements doivent rester des notes distinctes.
5. **Statuts de support :** les statuts doivent être testés par forme exacte. Une instruction interprétée mais non encodée n'est pas « prise en charge » par l'assembleur ; un opcode reconnu partiellement n'est pas un désassembleur complet.
6. **Familles à réexaminer en priorité :** ADC/SBB/NEG, rotations et décalages, ajustements ASCII/BCD, transferts d'E/S, instructions de chaîne et préfixes REP, appels/retours proches et lointains, interruptions, instructions coprocesseur et WAIT/LOCK.

## Sources primaires de référence

- Intel, *8086 Family User's Manual*, octobre 1979 — tables d'instructions, effets des indicateurs, temps d'exécution et calcul des adresses effectives : https://www.inf.pucrs.br/~calazans/undergrad/orgcomp_EC/mat_microproc/intel-8086_family_Users_Manual.pdf
- Intel, *MCS-86 Macro Assembly Language Reference Manual*, septembre 1979 — syntaxe d'assemblage et formes d'opérandes : https://mark-ogden.uk/files/intel/publications/9800640-02%20MCS-86%20Macro%20Assembly%20Language%20Reference%20Manual-Sep79.pdf

## Critère de clôture de l'audit

L'audit ne sera considéré comme terminé que lorsque l'inventaire canonique aura une fiche traçable pour chaque instruction/alias pertinent, que chaque forme aura des opérandes/restrictions/FLAGS/cycles vérifiés, et que les statuts de support seront confirmés par des tests positifs et négatifs. Les entrées non applicables devront être explicitement marquées « sans objet », pas laissées ambiguës.


## Mise à jour — ADC / SBB

ADC et SBB ont été ajoutées au validateur, à l'interpréteur, à l'assembleur et au désassembleur. Le support est partiel : les formes principales registre/mémoire et immédiates 80h/81h sont implémentées ; l'encodage court 83h, les timings détaillés par forme et l'audit exhaustif des variantes restent à vérifier. Les tests indépendants doivent confirmer le comportement avant clôture de cette phase.


**Validation de la phase ADC/SBB :** run CI 210 réussi — 354 tests de fumée et 40 vecteurs indépendants. Les timings exacts SUB/SBB et l'exhaustivité de la couverture 8086 restent ouverts.


## Matrice de couverture actuelle

Consulter [coverage-audit-8086.md](coverage-audit-8086.md) pour les statuts séparés du simulateur, de l'assembleur, du désassembleur et des tests. Les nombres sont des décomptes de mnémotechniques canoniques ; ils ne doivent pas être convertis en taux de couverture des formes d'encodage tant que le registre détaillé des formes n'est pas terminé.


## Révision de la matrice 8C/8E et balayage structurel — 25 novembre 2026

La réinspection de la table 4-13 du manuel Intel 8086 Family User's Manual a révélé une erreur dans une ancienne hypothèse de test : le champ de sélection du registre de segment est `0SR`, et non un champ 3 bits replié par `reg & 3`. Les sélecteurs `/0` à `/3` désignent ES, CS, SS et DS ; `/4` à `/7` sont indiqués « not used ». Le désassembleur et les suites de tests ont été corrigés en conséquence. `MOV CS, r/m16` via `8E /1` reste accepté dans le mode 8086 original.

La CI inclut désormais un balayage structurel des 256 valeurs d'opcode primaire et des 256 valeurs ModR/M pour chacune des 67 familles décodées avec ModR/M. Le test vérifie l'absence de crash, la progression continue des offsets et la consommation exacte des octets. Il ne valide pas le sens de chaque opcode ni les effets d'exécution : ces assertions exigent toujours des oracles indépendants spécifiques.

Le même lot corrige le désassembleur pour que son traitement de LOCK reste cohérent avec le sous-ensemble verrouillable accepté par l'analyseur du laboratoire : destination mémoire obligatoire pour les opérations prises en charge, avec traitement distinct de XCHG mémoire. Cela ne constitue pas une simulation de la sortie LOCK, du bus ou de l'arbitrage.

Validation CI : run 45512297498, commit `f0573072cf57ad741a0b6e33165f0ffa61d9cd75` — success, toutes les étapes exécutées.

## Recoupement indépendant par assembleur externe — 25 novembre 2026

Un contrôle différentiel a été ajouté dans `tests/gnu-as-crosscheck.cjs` et intégré au workflow CI. Il assemble le même programme avec l'assembleur du laboratoire et GNU `as` en mode `.code16`, extrait le segment `.text` avec `objcopy`, puis compare les flux octet par octet.

Le vecteur couvre explicitement :

- MOV immédiat vers AX et BX ;
- CMP registre-registre et accumulateur-immédiat ;
- JMP direct court, JMP direct near hors portée rel8 et JMP indirect par BX ;
- les 16 opcodes Jcc de `70h` à `7Fh` ;
- LOOPNE, LOOPE, LOOP et JCXZ (`E0h` à `E3h`).

Les 209 octets du programme sont comparés intégralement entre les deux assembleurs. En outre, 59 octets clés sont épinglés à des valeurs fixes indépendantes afin d'éviter qu'une même erreur de génération ne passe simplement par égalité entre deux sorties. Le contrôle local a été exécuté avec GNU Binutils 2.44 ; le workflow CI sur le commit `56dd1e4d40220856fd72f940fa688f430f31242b` a réussi, y compris cette nouvelle étape.

**Portée et limites :** ce recoupement confirme uniquement les formes et les cas présents dans ce vecteur. GNU `as` constitue une implémentation d'assemblage indépendante, pas un oracle matériel Intel ni une preuve d'exhaustivité. Il ne valide pas l'exécution réelle, les effets FLAGS, les indicateurs indéfinis, les cycles, les signaux de bus ou toutes les combinaisons ModR/M. Ces contrôles restent ouverts et doivent être étendus instruction par instruction.

## Décalages, rotations et FLAGS — contrôle architectural ciblé — 25 novembre 2026

La table Intel du *8086 Family User's Manual*, section « Shifts » et « Rotates » (p. 2-39), précise que le compteur peut être fourni par `CL` et atteindre 255 sur le 8086. Contrairement aux générations suivantes, le 8086 ne réduit pas le compteur aux cinq bits de poids faible. La même section précise notamment :

- décalages : `AF` indéfini ; `PF/SF/ZF` mis à jour ; `CF` reçoit le dernier bit sorti ; `OF` indéfini pour un compte multibit et défini pour un décalage d'un bit ;
- rotations : seuls `CF` et `OF` sont affectés ; `CF` reçoit le dernier bit tourné ; `OF` est indéfini pour un compte multibit ;
- un compte nul ne modifie ni l'opérande ni les FLAGS.

Le fichier `tests/shift-rotate-8086.cjs` compare le simulateur à un modèle de référence indépendant pour `SHL`, `SAL`, `SHR`, `SAR`, `ROL`, `ROR`, `RCL` et `RCR`, en 8 et 16 bits. Il couvre six motifs initiaux par taille, les deux états initiaux de CF et treize comptes (`0, 1, 2, 7, 8, 9, 15, 16, 17, 31, 32, 33, 255`). Il vérifie aussi huit encodages group-2 et le rejet des comptes immédiats autres que 1 sur le 8086.

Résultat : **2 505 assertions réussies** dans le workflow CI du commit `03bff143da3561216842ee7bc1a10025d6805d2b` ([exécution CI](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45579293315)). Les indicateurs architecturaux indéfinis ne sont jamais comparés à une valeur arbitraire : `AF` des décalages et `OF` des opérations multibit sont exclus des assertions.

La fiche d'instructions a été clarifiée pour énoncer explicitement les cas `OF` indéfini et le cas du compte nul. Le modèle logiciel peut produire une valeur concrète pour un indicateur indéfini ; cette valeur ne doit pas être présentée comme une garantie architecturale.

**Limites :** ce lot valide les sémantiques testées du simulateur par rapport au modèle dérivé du manuel Intel. Il ne constitue pas une mesure sur silicium, ne vérifie pas les timings matériels et ne clôt pas l'audit des autres familles d'instructions ou de tous les cas de bord.

## Ajustements BCD/ASCII et multiplication/division — 25 novembre 2026

Une suite de référence distincte a été ajoutée dans `tests/bcd-multiply-divide-8086.cjs` et intégrée à la CI.

### Ajustements décimaux et ASCII

Les vecteurs couvrent les six instructions :

- `AAA` et `AAS` : toutes les 256 valeurs initiales de AL, les deux états de AF et les deux états de CF, avec contrôle de AL, AH, AF et CF ;
- `AAM` et `AAD` : la base implicite décimale 10 du 8086, des valeurs réparties sur AX et toutes les valeurs de AL avec AH nul ou non nul ;
- `DAA` et `DAS` : toutes les 256 valeurs de AL avec les quatre combinaisons AF/CF, contrôle du résultat, AF, CF, SF, ZF et PF.

Les six encodages canoniques sont comparés à des octets fixes et leur désassemblage est vérifié. Les indicateurs indéfinis ne sont pas comparés : SF/ZF/PF/OF après AAA/AAS, AF/CF/OF après AAM/AAD, et OF après DAA/DAS.

### Multiplication et division

- `MUL` et `IMUL` : 1 300 vecteurs 8/16 bits, contrôle des produits complets dans AX ou DX:AX et des seuls indicateurs définis CF/OF.
- `DIV` et `IDIV` : 340 vecteurs couvrant les tailles 8/16 bits, les dividendes signés/non signés, les quotients valides, les dépassements de quotient et la division par zéro. Les FLAGS ne sont pas comparés, car ils sont indéfinis après ces opérations.

### Résultat CI et correction de métadonnées

Sur le commit `e1da4b507dc9786fc7cc19905dcc3732f365979f`, la CI a réussi avec **6 772 assertions** et aucune défaillance ([run CI](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45581069336)). Le total comprend 2 048 vecteurs AAA/AAS, 1 024 AAM/AAD, 2 048 DAA/DAS, 1 300 MUL/IMUL, 340 DIV/IDIV et 12 vérifications d'encodage/désassemblage BCD.

La fiche de `NEG` contenait un statut erroné « Non pris en charge » alors que l'assembleur, le désassembleur et le moteur d'exécution possèdent des chemins pour cette instruction. Son statut a été corrigé en « Pris en charge » pour le simulateur et « Partiel » pour l'assembleur et le désassembleur, en attendant l'audit complet des formes mémoire. Les trois fiches BCD ont été mises à « Pris en charge » dans les trois composants, car leurs formes implicites uniques sont testées en exécution, assemblage et désassemblage.

**Limites :** ces vecteurs valident le sous-ensemble décrit, pas toutes les formes mémoire ni l'ensemble des interactions entre instructions. Ils ne constituent pas une mesure sur processeur physique. Les comportements exacts des cas d'exception matériels, des timings et des indicateurs indéfinis restent hors de cette validation logicielle.

## Complément — limite négative propre à IDIV sur 8086 — 25 novembre 2026

Le manuel Intel *8086 Family User's Manual* d'octobre 1979 (section IDIV, p. 2-37) donne les plages de quotient suivantes pour le 8086 original :

- diviseur 8 bits : −127 à +127 ;
- diviseur 16 bits : −32 767 à +32 767.

Le manuel précise qu'un quotient en dehors de ces plages déclenche l'interruption de type 0. Les processeurs ultérieurs ont élargi la borne négative et acceptent −128 et −32 768. Cette différence est également décrite dans la note Microsoft Q68599 sur les processeurs 8086/8088.

L'ancien moteur acceptait à tort les deux valeurs minimales négatives. La borne basse de `executeMultiplyDivide` a été corrigée, les tests intégrés ont été adaptés, et la suite indépendante couvre maintenant explicitement `AX=FF80h, IDIV BL=1` ainsi que `DX:AX=FFFF8000h, IDIV BX=1` comme cas de dépassement.

La CI sur le commit `2ebc6c23543694bbfa51ee42cd97edf501fa36bc` a réussi avec **6 792 assertions** : [run CI](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45581647925).

**État à ce commit historique :** le simulateur signalait encore ces divisions invalides par une erreur contrôlée. Le complément ci-dessous décrit la correction ultérieure sur la même branche.

## Interruption de division — raccordement au vecteur 0 — 25 novembre 2026

Les erreurs de `DIV` et `IDIV` sont désormais raccordées au mécanisme d'interruption déjà présent dans le simulateur, au lieu d'être systématiquement remontées comme des erreurs terminales.

- Dans l'exécution du programme source, un gestionnaire `VECTOR 0, ETIQUETTE` reçoit les divisions par zéro et les dépassements de quotient.
- Dans l'exécution binaire, le moteur lit l'entrée IVT du vecteur 0 aux adresses physiques `00000h` à `00003h` (offset IP puis segment CS).
- Les deux chemins empilent `FLAGS`, `CS` et l'IP de reprise dans cet ordre, effacent `IF` et `TF` à l'entrée, puis transfèrent le contrôle au gestionnaire.
- `IRET` restaure le cadre et reprend après l'instruction `DIV`/`IDIV` fautive, conformément au comportement historique du 8086 pour cette exception.
- Si le gestionnaire source n'est pas déclaré ou si l'entrée IVT binaire est absente/incomplète, le simulateur conserve un diagnostic explicite au lieu de poursuivre silencieusement.

La suite `tests/divide-error-interrupt-8086.cjs` vérifie huit scénarios source et les huit scénarios correspondants en exécution binaire : division par zéro et dépassement de quotient, `DIV` et `IDIV`, opérandes 8 et 16 bits. Elle contrôle aussi la conservation de `AX`/`DX` sur le chemin d'exception, l'exécution du gestionnaire, l'effacement temporaire de `IF`/`TF`, la restauration des FLAGS, le retour à l'instruction suivant la division et la restauration de `SS:SP`. Deux cas supplémentaires vérifient le diagnostic en l'absence de gestionnaire.

La suite complète de CI du commit `12239566043af5befb6201c58ca7ce11c8e5e06d` a réussi ; l'étape dédiée « Run 8086 divide-error interrupt tests » est verte (https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45583099100).

**Périmètre restant :** cette correction modélise l'exception logicielle de type 0 dans le moteur pédagogique. Elle ne simule pas les signaux électriques, les cycles, l'arbitrage des interruptions matérielles INTR/NMI ni le matériel physique. Les formes mémoire de `MUL`/`IMUL`/`DIV`/`IDIV` et l'audit approfondi de `NEG` restent à traiter séparément.