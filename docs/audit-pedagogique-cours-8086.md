# Audit pédagogique du cours — Intel 8086

**État : première passe automatisée, audit sémantique approfondi en cours.**  
**Périmètre :** 36 chapitres, 108 exemples de leçon, 324 questions intermédiaires et 360 questions finales.

## 1. Contrôle d'exécutabilité des exemples

Le test `tests/learning-quality.cjs` exécute maintenant chaque exemple de la structure canonique `curriculum` à travers le moteur source du laboratoire.

Résultat initial : **106/108** exemples s'exécutaient sans erreur.

Deux cas ont été corrigés :

- **Chapitre 13 — Saut indirect et choix de forme :** `MOV BX, OFFSET CIBLE` n'était pas accepté par l'assembleur du laboratoire. L'exemple utilise désormais une cible d'offset explicite (`0008h`) et précise que cette valeur dépend de l'image assemblée à l'offset initial `0000h`.
- **Chapitre 25 — Erreurs et plage du quotient :** l'exemple provoquait volontairement un dépassement de quotient. Il a été remplacé par le cas frontière valide `AX=00FFh, BL=1`, qui produit `AL=FFh` et `AH=00h`. Le texte explique ensuite que `AX=0100h` avec le même diviseur dépasse la capacité du quotient 8 bits.

La passe suivante a confirmé **108/108 exemples exécutables sans erreur du simulateur**.

**Interprétation du résultat :** cette vérification prouve uniquement que les exemples passent dans le moteur source actuel. Elle ne prouve pas que chaque résultat annoncé, chaque état de FLAGS ou chaque effet mémoire est exact. Les exemples qui dépendent d'un état initial, d'une mémoire préchargée, d'un vecteur ou d'une convention de chargement exigent une vérification dédiée.

## 2. Corrections de précision pédagogique

- Clarification de la distinction entre `BH` (octet fort de `BX`) et `BL` (octet faible de `BX`) dans l'explication des registres.
- Le saut indirect du chapitre 13 explicite désormais l'hypothèse de positionnement de l'image ; un offset codé en dur ne doit pas être présenté comme une adresse universelle.
- La leçon sur la division présente maintenant un cas valide à la limite de capacité, puis distingue ce cas de l'exception de division provoquée par un quotient hors plage.

## 3. Contrôles automatiques des questions

Les tests vérifient désormais :

- 3 propositions non vides et distinctes pour chaque question ;
- un index de bonne réponse dans la plage des propositions ;
- une explication non vide et suffisamment développée ;
- aucune répétition exacte de l'énoncé parmi les 10 questions finales d'un même chapitre ;
- aucune répétition exacte entre les questions intermédiaires d'une leçon et l'évaluation finale du chapitre ;
- conservation des 324 questions intermédiaires et des 360 questions finales.

Ces contrôles détectent des défauts structurels. **Ils ne certifient pas la justesse technique de chacune des 360 réponses.** L'audit humain et architectural reste nécessaire pour les conditions FLAGS, les restrictions d'opérandes, les plages numériques, les encodages 8086 et les limites du simulateur.

## 4. Limites du modèle à signaler dans le cours

Les explications doivent distinguer le processeur physique du modèle logiciel du laboratoire. Les audits techniques existants documentent notamment :

- l'absence de simulation des cycles bus, de la prélecture BIU et de l'arbitrage matériel ;
- le modèle logiciel des ports d'entrée-sortie, sans périphériques physiques ;
- l'absence de simulation d'un coprocesseur 8087 pour `ESC` ;
- l'absence d'atomicité observable du bus pour `LOCK` dans le moteur mono-thread ;
- les limites de la modélisation des segments de code FAR et de l'IVT matérielle ;
- le caractère partiel de la validation de nombreuses familles et formes d'encodage.

Les registres de référence à consulter sont `audit-reference-8086.md`, `registre-validation-dynamique-8086.md`, `audit-chargement-binaire-8086.md`, `audit-chain-strings-8086.md` et `audit-groupes-opcodes-8086.md`.

## 5. Étapes suivantes

1. Vérifier les résultats annoncés de chacun des 108 exemples, et pas seulement leur absence d'erreur.
2. Contrôler les effets sur les registres, la mémoire et chaque indicateur FLAGS défini, conservé ou indéfini.
3. Auditer les 360 questions finales individuellement : bonne réponse, distracteurs, niveau, explication et compatibilité 8086.
4. Approfondir les explications théoriques et les démonstrations chapitre par chapitre, en commençant par les niveaux débutants.
5. Conserver la séparation entre Cours, Exercices et Atelier ; aucune fonctionnalité supplémentaire n'est prioritaire à ce stade.

## 6. Règle de validation

Aucun exemple ou item pédagogique ne doit être marqué « vérifié architecturalement » sur la seule base d'une exécution réussie dans le simulateur. La validation finale exige une justification indépendante à partir des règles du 8086 et des capacités effectivement implémentées et testées.
