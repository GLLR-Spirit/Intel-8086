# Audit ciblé — instructions de chaîne, préfixes REP et interruptions

**Date :** 25 novembre 2026  
**Branche :** `main`  
**Périmètre :** validation du sous-ensemble exécuté par le laboratoire ; pas de certification d'un 8086 physique.

## 1. Familles de chaîne vérifiées

Les tests binaires indépendants de `tests/dynamic-differential.cjs` vérifient les dix formes suivantes :

| Famille | Octet | Mot | Contrôles effectués |
|---|---|---|---|
| MOVS | MOVSB | MOVSW | transfert DS:SI vers ES:DI, CX, SI et DI |
| LODS | LODSB | LODSW | chargement AL/AX depuis DS:SI, SI et CX |
| STOS | STOSB | STOSW | stockage AL/AX vers ES:DI, DI et CX |
| CMPS | CMPSB | CMPSW | comparaison DS:SI avec ES:DI, arrêt REPE et ZF |
| SCAS | SCASB | SCASW | comparaison AL/AX avec ES:DI, arrêt REPNE et ZF |

Les variantes octet/mot sont exercées avec des données initialisées à des adresses physiques calculées depuis les segments et déplacements. Les résultats sont contrôlés dans les registres et la mémoire, et non par la seule présence d'un mnémonique.

## 2. Préfixes et cas limites

Les vecteurs ajoutés couvrent :

- `REP MOVSB` avec `CX=0` : aucune lecture/écriture de chaîne, SI et DI inchangés ;
- `REP MOVSB` avec `CX=1` : une seule itération, CX devient nul et les index avancent d'un octet ;
- répétition sur deux éléments pour les variantes byte/word ;
- `REPE CMPSB/CMPSW` : arrêt au premier désaccord, CX conserve le nombre d'éléments non traités et ZF vaut zéro ;
- `REPNE SCASB/SCASW` : arrêt à la première égalité, CX conserve le nombre d'éléments non traités et ZF vaut un ;
- `DF=1` avec `CS: REP MOVSB` : SI et DI décrémentent, le préfixe CS remplace DS pour la source et la destination reste ES:DI.

Le test d'override CS exécute le flux dans le segment CS correspondant à la zone mémoire de source. Il vérifie ainsi l'adresse effective réelle, pas uniquement l'octet de préfixe assemblé.

## 3. Règles architecturales retenues

- MOVS : source `segment-source:SI`, destination toujours `ES:DI`.
- LODS : source `segment-source:SI`, destination implicite AL ou AX.
- STOS : source implicite AL ou AX, destination toujours `ES:DI`.
- CMPS : compare la source `segment-source:SI` à `ES:DI`.
- SCAS : compare AL ou AX à `ES:DI`.
- DF détermine l'incrément ou le décrément de SI/DI ; il n'est pas effacé par une instruction de chaîne.
- CX est décrémenté à chaque itération répétée. REP/REPE/REPNE terminent lorsque le compteur atteint zéro ; REPE/REPNE ajoutent la condition ZF appropriée pour les comparaisons.
- L'override de segment concerne l'opérande source des instructions qui en possèdent un. La destination des MOVS/STOS/CMPS/SCAS demeure ES:DI selon la définition de l'ISA.

## 4. Interruptions et cadre IRET

La suite différentielle contient déjà des tests distincts pour :

- `INT n` binaire avec lecture de l'entrée IVT initialisée en mémoire ;
- empilement du contexte et retour `IRET` ;
- restauration de IP, CS et FLAGS ;
- retour depuis un gestionnaire avec pile équilibrée ;
- cadre IRET brut préinitialisé en mémoire ;
- rejet explicite d'une entrée IVT absente ou tronquée et d'un IRET sans cadre exploitable.

Le chemin source utilisant `VECTOR` reste une abstraction pédagogique. Il ne doit pas être confondu avec la preuve d'une gestion matérielle complète des interruptions.

## 5. Exercices intégrateurs

Le parcours contient maintenant 27 exercices avec corrections guidées exécutables. Deux exercices avancés supplémentaires combinent :

1. `REP MOVSB`, comparaison mémoire, branchement conditionnel, sauvegarde/restauration par PUSH/POP et `INT 30h/IRET`.
2. `STD`, `REP MOVSW` en parcours inverse, `CLD`, comparaison d'un mot, pile et `INT 31h/IRET`.

Les gestionnaires n'altèrent pas le cadre d'interruption : les données applicatives sont transmises dans un registre et le retour est réalisé par IRET. La pile de données est équilibrée avant l'entrée dans le gestionnaire.

## 6. Résultat CI

Le workflow CI **45515788987** a réussi sur le commit `a3bb746b158c67e3f2ca8c45ea2df96a0ae4e0e5`.

- Audit différentiel : **78 tests réussis, 0 échec**.
- Parcours pédagogique : **17 chapitres, 34 questions, 27 exercices**.
- Toutes les corrections guidées des 27 exercices s'exécutent et satisfont leur validateur.
- Les autres suites du workflow (fumée, vecteurs indépendants, ModR/M, balayage opcode, adressage, FLAGS, contraintes, groupes d'opcodes, pile, branchements et exécution binaire) sont également réussies.

## 7. Limites explicites

Ces résultats valident les scénarios énumérés, pas toutes les combinaisons possibles.

Restent notamment à couvrir ou à distinguer :

- toutes les combinaisons de préfixes, notamment plusieurs overrides, REP et LOCK dans tous les ordres architecturaux ;
- les frontières SI/DI à FFFFh et les bouclages d'offset pour chaque famille et chaque taille ;
- les effets exacts des FLAGS non définis ou conservés pour toutes les variantes ;
- les interruptions matérielles INTR/NMI, l'acquittement et l'arbitrage ;
- le comportement BIU, la prélecture, les cycles bus et les timings réels.

Le simulateur demeure un modèle pédagogique du sous-ensemble implémenté, et non un émulateur matériel cycle-exact.

## 8. Extension des vérifications — frontières, FLAGS, IVT et encodages

La suite a été étendue après l'audit initial :

- SI et DI passent de `FFFFh` à `0000h` en sens croissant et de `0000h` à `FFFFh` en sens décroissant ;
- les transferts de mots à l'offset `FFFFh` vérifient le bouclage séparé de l'octet haut vers l'offset `0000h` ;
- MOVS, LODS et STOS préservent chaque FLAGS modélisé ; CMPS et SCAS actualisent les indicateurs selon la soustraction de comparaison ;
- les overrides CS sont vérifiés sur LODS et CMPS ; SCAS continue à lire ES:DI même si un préfixe de segment source est présent ;
- l'entrée INT binaire vérifie l'ordre physique du cadre : IP au sommet, puis CS, puis FLAGS ;
- un gestionnaire binaire indépendant lit PUSHF pendant son exécution et confirme que IF/TF sont effacés, puis IRET restaure les valeurs pré-interruption ;
- les dix opcodes de chaîne (A4h–A7h et AAh–AFh) ont des vecteurs assembleur et désassembleur indépendants ;
- les préfixes F3h/F2h et le couple override CS + REP sont vérifiés avec des octets machine fixes ;
- les doublons de préfixes REP/segment et LOCK sur instruction de chaîne sont rejetés explicitement par la politique de ce laboratoire.

**CI vérifiée sur le commit `217c0a413c937d1248573e1f1f9f879c57d69ba6` :**
- vecteurs assembleur/désassembleur indépendants : **143 réussis** ;
- audit différentiel : **83 réussis, 0 échec** ;
- parcours pédagogique : **17 chapitres, 34 questions, 27 corrections exécutables validées**.

Ces tests ciblent les frontières et comportements listés. Ils ne constituent pas une preuve exhaustive de toutes les séquences de préfixes ni de tous les états matériels possibles.


## Actualisation CI sur `main` — 26 novembre 2026

Le workflow principal [45729424128](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/45729424128), commit `faef6b83c1e5aba2626148bb6b341fc0079031f5`, a réussi avec **56/56 étapes**.

- `tests/string-instructions-8086.cjs` : **29/29** tests réussis. Chaque scénario utilise les chemins source et binaire, avec contrôle des registres, de la mémoire et des FLAGS pertinents.
- `tests/dynamic-differential.cjs` : **33/33** tests réussis.
- Les dix formes MOVS, CMPS, STOS, LODS et SCAS en byte/word sont assemblées et désassemblées ; les scénarios dédiés vérifient également les overrides, REP/REPE/REPNE, CX=0, DF et les frontières d'offset.

La réussite de ces suites valide les scénarios logiciels décrits ; elle ne modélise pas les interruptions matérielles asynchrones, les signaux du bus, la BIU ni les timings cycle-exact.
