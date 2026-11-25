# Audit pédagogique — Niveau 2, chapitres 6 à 11

**Périmètre :** chapitres 6 à 11, 18 leçons, 54 questions intermédiaires et 60 questions finales.

## Travaux effectués

- Réécriture approfondie des explications des 18 leçons.
- Remplacement des questions intermédiaires génériques par 54 questions liées aux notions effectivement enseignées.
- Remplacement des évaluations finales génériques par 60 questions rédigées individuellement.
- Maintien de trois questions par leçon et dix questions finales par chapitre.
- Conservation des dix catégories d'évaluation : définition, compréhension, syntaxe, restrictions, prédiction, calcul/prédiction, analyse de programme, analyse de résultat, débogage et raisonnement.
- Variation de la position des réponses correctes.
- Ajout de contrôles d'état indépendants pour les exemples exécutables des chapitres 6 à 11.

## Contrôles architecturaux ciblés

| Chapitre | Leçon | Contrôle attendu |
|---|---:|---|
| 6 — Premiers programmes assembleur | 1 | AX=0005h après MOV AX,5 |
| 6 | 2 | AX=0001h après MOV AX,BX puis ADD AX,1 avec BX initialisé à zéro |
| 6 | 3 | AX reste à 0001h : JMP saute MOV AX,2 |
| 7 — Transfert de données | 1 | XCHG échange AX=5678h et BX=1234h |
| 7 | 2 | LEA calcule SI=0104h sans lecture mémoire |
| 7 | 3 | LDS lit un pointeur far dans la mémoire initialisée à zéro ; SI=0 et DS=0 |
| 8 — Arithmétique fondamentale | 1 | ADD/ADC : AL=00h, BL=02h, CF final=0 |
| 8 | 2 | SUB/SBB : AL=FFh, BL=04h, CF final=0 |
| 8 | 3 | NEG 80h : AL=80h, OF=1, CF=1 |
| 9 — Opérations logiques | 1 | AND 0ACh,0Fh produit 0Ch |
| 9 | 2 | XOR F0h,FFh produit 0Fh |
| 9 | 3 | TEST préserve AL=08h et met ZF à 1 |
| 10 — Registre FLAGS | 1 | FFh+1 donne AL=00h, CF=1 et ZF=1 |
| 10 | 2 | CLD/STD/CLD laisse DF=0 |
| 10 | 3 | POPF restaure CF sauvegardé par PUSHF |
| 11 — Débogage et traçage | 1 | AX=0005h |
| 11 | 2 | AX=0007h |
| 11 | 3 | INC FFh donne 00h et préserve CF |

**Attention à la numérotation :** le tableau suit les indices de chapitres du programme. Les noms et exemples sont contrôlés contre le curriculum et les oracles de test.

## Précisions techniques intégrées

- La distinction entre MOV, XCHG et LEA est explicitée : copie, échange et calcul d'adresse sans lecture mémoire.
- Les formes d'adressage sont limitées aux combinaisons historiques du 8086.
- LDS/LES sont expliquées comme chargement d'un pointeur 16:16 : offset dans le registre général, segment dans DS ou ES.
- ADD/ADC et SUB/SBB sont traitées comme chaînes de propagation de retenue ou d'emprunt.
- INC/DEC préservent CF ; NEG 80h constitue un cas de débordement signé.
- AND/OR/XOR/NOT et TEST sont distinguées selon leur effet sur l'opérande et les indicateurs.
- Les FLAGS définis, préservés et indéfinis sont différenciés.
- TF, IF et DF sont présentés sans assimiler la représentation logicielle du simulateur à une émulation complète des événements matériels.
- La méthode de traçage repose sur la première divergence, l'état attendu et les cas limites.

## Limites restantes

- Les oracles de test contrôlent le résultat du moteur du laboratoire ; ils ne remplacent pas une comparaison différentielle exhaustive avec un émulateur de référence indépendant.
- L'exemple LDS du chapitre 6 utilise actuellement une zone mémoire par défaut initialisée à zéro ; un exercice dédié avec un pointeur far explicite en mémoire serait plus démonstratif.
- Le laboratoire ne simule pas les signaux électriques, les cycles de bus réels, l'arbitrage matériel des interruptions ni les effets temporels exacts de TF/IF.
- Les chapitres 12 à 36 restent à auditer selon la même méthode.
- L'audit complet des encodages, des cas invalides et des effets FLAGS doit rester distinct de l'audit pédagogique.

## Validation

La publication de cette phase dépend de la réussite du workflow CI sur le commit final et du déploiement Pages correspondant. Une exécution sans erreur ne suffit pas à prouver la correction architecturale ; les assertions d'état ci-dessus sont donc maintenues séparément.
