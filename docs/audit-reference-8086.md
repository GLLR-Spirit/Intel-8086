# Audit de précision — Référence Intel 8086

**État :** audit en cours — ne pas présenter la rubrique comme une encyclopédie exhaustive.

## Inventaire canonique — première passe

Le registre distinct des graphies mnémotechniques, synonymes, préfixes et éléments hors périmètre est maintenu dans [instruction-inventory-8086.md](instruction-inventory-8086.md). Il sert de base au décompte de couverture ; les 58 cartes de l'interface ne sont pas utilisées comme dénominateur. Les graphies dont le statut historique est incertain (notamment FWAIT, XLATB et RETF) restent explicitement à confirmer et ne sont pas déclarées instructions canoniques sur la seule base de leur présence dans des assembleurs.

## Réconciliation initiale des opcodes

Une première table de correspondance mnémotechnique/opcode ou groupe d'opcodes a été ajoutée à `instruction-inventory-8086.md`. Elle distingue notamment les préfixes LOCK/REP, les groupes ModR/M et les alias conditionnels. Les formes AAD/AAM sont limitées à la séquence 8086 documentée avec l'immédiat 0Ah ; les opcodes de décalage à compte immédiat C0h/C1h sont explicitement exclus du 8086. Cette table demeure un index de familles : elle ne remplace pas les fiches par forme, et les graphies FWAIT, XLATB, RETF et certains synonymes restent à confirmer dans le manuel d'assembleur primaire.

## Périmètre vérifié dans cette passe

L'interface actuelle expose 58 entrées documentaires. Ce nombre correspond aux cartes affichées, pas au nombre de mnémotechniques distincts : plusieurs cartes regroupent des alias ou des familles, et certaines décrivent des concepts non-instructions (adressage mémoire, directive pédagogique `VECTOR`).

Les fiches doivent être auditées au niveau de chaque forme d'encodage, et non uniquement au niveau du mnémotechnique. Une fiche regroupée ne prouve donc pas que toutes les variantes sont décrites.

## Première matrice des formes d'opérandes

La fiche [operand-encoding-8086.md](operand-encoding-8086.md) détaille une première passe sur MOV, ADD, ADC, SUB, SBB et CMP : formes registre/mémoire, formes immédiates, opcodes, champs ModR/M, restrictions et FLAGS. Elle corrige également une confusion d'indexation : 8Dh correspond à LEA, et ne doit pas être inclus dans la plage des opcodes MOV.

La suite indépendante couvre désormais MOV, ADD, SUB, CMP, ADC et SBB avec des octets fixes pour l'assembleur et le désassembleur, ainsi que des tests sémantiques du simulateur. Le run CI 210 (24 novembre 2026, commit `48ae8aadf86354dc74283591059e5c7ec2548129`) a validé 354/354 tests de fumée et 40/40 vecteurs indépendants. Cette couverture reste partielle et ne clôt pas l'audit.

## Corrections effectuées

- **ADC et SBB** : implémentées dans le validateur et l'interpréteur, et dans les formes binaires principales du générateur/désassembleur. Les formes 83h à immédiat signé court et l'exhaustivité des formes restent à auditer.
- Les tests dédiés consignent explicitement cette absence de support ; ils ne la corrigent pas.\n- Aucun changement n'a été apporté au moteur CPU pendant cette phase de tests.

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

1. **Exhaustivité des mnémoniques et alias :** un premier inventaire distinct est maintenant consigné dans instruction-inventory-8086.md. Il reste à le confronter ligne par ligne aux tables Intel et à décider explicitement du statut des graphies historiques/propres aux assembleurs avant de calculer un taux de couverture.
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
