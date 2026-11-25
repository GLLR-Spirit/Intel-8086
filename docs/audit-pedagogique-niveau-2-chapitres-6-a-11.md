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
| 6 — Premiers programmes assembleur | 1 | XCHG échange AX et BX |
| 6 | 2 | LEA calcule BX+4 sans lecture de la mémoire pointée |
| 6 | 3 | LDS lit un pointeur far en mémoire ; l'exemple actuel utilise une zone initialisée à zéro |
| 7 — Transfert de données | 1 | ADD puis ADC propagent la retenue et produisent BL=02h |
| 7 | 2 | SUB puis SBB propagent l'emprunt et produisent BL=04h |
| 7 | 3 | NEG 80h conserve le motif 80h et active OF |
| 8 — Arithmétique fondamentale | 1 | AND 0ACh,0Fh produit 0Ch |
| 8 | 2 | XOR F0h,FFh produit 0Fh |
| 8 | 3 | TEST préserve AL et met ZF à 1 lorsque le masque ne correspond pas |
| 9 — Opérations logiques | 1 | FFh+1 donne AL=00h, CF=1 et ZF=1 |
| 9 | 2 | CLD/STD/CLD laisse DF=0 |
| 9 | 3 | POPF restaure CF sauvegardé par PUSHF |
| 10 — Registre FLAGS | 1 | L'exemple de trace aboutit à AX=0005h |
| 10 | 2 | L'exemple de diagnostic aboutit à AX=0007h |
| 10 | 3 | INC FFh donne 00h et préserve CF |
| 11 — Débogage et traçage | 1–3 | Les exemples sont couverts par les oracles du chapitre et les validations générales d'exécution |

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
