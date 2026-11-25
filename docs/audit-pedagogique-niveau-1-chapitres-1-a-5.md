# Audit pédagogique — Niveau 1, chapitres 1 à 5

**Périmètre audité :** chapitres 1 à 5, 15 leçons, 45 questions intermédiaires et 50 questions finales.  
**Commit de travail :** `9c4c8dd17016d88b05f0145f1b94c69b299e591d` (les validations CI sont à consulter pour ce commit).

## Résumé des interventions

- Approfondissement des 15 explications de leçon.
- Réécriture des 45 questions intermédiaires : trois questions dédiées à chaque leçon, avec distracteurs liés au concept.
- Remplacement des 50 questions finales des chapitres 1 à 5 par des questions rédigées individuellement.
- Conservation des dix dimensions d'évaluation dans chaque chapitre : définition, compréhension, syntaxe, restrictions, prédiction, calcul/prédiction, analyse de programme, analyse de résultat, débogage et raisonnement.
- Rotation des positions des bonnes réponses sans modifier leur association avec les explications.
- Ajout de 15 oracles d'état pour les 15 exemples des chapitres 1 à 5.
- Contrôle des octets mémoire little-endian et des indicateurs CF, OF, ZF, SF, PF et AF sur les exemples arithmétiques.

## Résultats techniques vérifiés

| Chapitre | Leçon | Contrôle attendu |
|---|---:|---|
| 1 | 1 | AX=1234h |
| 1 | 2 | Leçon de capacité théorique : le code ne prétend pas calculer 1 Mio |
| 1 | 3 | AX=8086h |
| 2 | 1 | AX=0007h après ADD |
| 2 | 2 | DS=1000h |
| 2 | 3 | AX reste à 0001h ; le saut évite MOV AX,2 |
| 3 | 1 | AX=000Ah |
| 3 | 2 | AL=2Ah (vérifié via AX, registre 16 bits exposé par le moteur) |
| 3 | 3 | AX=00FFh |
| 4 | 1 | AX=1234h ; octet 34h à DS:0100h et 12h à DS:0101h avec DS=0000h |
| 4 | 2 | Après FFh+1 : AL=00h, CF=1, ZF=1, OF=0, PF=1, AF=1 |
| 4 | 3 | Après 7Fh+1 : AL=80h, OF=1, CF=0, SF=1, ZF=0, PF=0, AF=1 |
| 5 | 1 | AX=1256h après modification de AL |
| 5 | 2 | SI=0100h, DI=0200h, BP=0300h, SP=0400h |
| 5 | 3 | DS=1000h |

Ces oracles vérifient l'état produit par le moteur du laboratoire. Les règles architecturales correspondantes sont également explicitées dans le cours ; les tests ne transforment pas le simulateur en modèle électrique du processeur physique.

## Précisions et limites pédagogiques restantes

### Chapitre 1 — Introduction au microprocesseur

La leçon sur les caractéristiques distingue désormais les trois largeurs souvent confondues : registres généraux 16 bits, bus de données 16 bits et bus d'adresses 20 bits. La capacité est présentée comme un résultat théorique de (2^{20}) adresses d'octets, soit 1 Mio. Le programme de cette leçon ne réalise pas ce calcul ; il sert de support à l'explication et le texte le précise explicitement.

### Chapitre 2 — Architecture interne

Le contenu distingue l'EU, la BIU, l'ALU et la file de prélecture de six octets du 8086. Il précise que le chevauchement BIU/EU n'est pas une exécution superscalaire. Le programme du saut illustre le changement de flot, mais le simulateur ne mesure pas le remplissage réel de la file ni les cycles de bus.

### Chapitre 3 — Systèmes de numération

Les conversions binaires, hexadécimales et décimales ont été détaillées ; les tailles d'AL et AX et leurs plages sont explicitées. Les trois exemples sont contrôlés par leur état de registre.

### Chapitre 4 — Représentation des données

Le premier exemple démontre maintenant réellement l'ordre little-endian par une écriture mémoire ; le précédent exemple qui ne faisait que charger AX ne pouvait pas prouver cet ordre. Les cas FFh+1 et 7Fh+1 distinguent retenue non signée et débordement signé, avec vérification de plusieurs FLAGS.

### Chapitre 5 — Registres

La distinction AH/AL est expliquée avec conservation de l'octet non modifié. Les exemples couvrent maintenant explicitement SI, DI, BP et SP. Les rôles de CS:IP, DS, SS et ES et l'interdiction de charger CS par MOV sont détaillés.

## Limites qui ne doivent pas être masquées

- Le programme du chapitre 1 sur le bus d'adresses est une illustration théorique, pas une mesure matérielle.
- L'exemple BIU du chapitre 2 montre le chargement de DS ; il ne simule pas les transactions physiques du bus.
- Le programme du chapitre 2 sur le saut illustre le flot de contrôle ; il ne donne pas le timing exact de vidage et de réalimentation de la file de prélecture.
- Le programme du chapitre 5 sur les segments illustre DS ; les rôles des quatre segments et de IP sont expliqués séparément.
- Les commentaires automatiques accolés aux instructions restent des aides génériques. Ils ne remplacent pas une trace ligne par ligne des valeurs et des FLAGS.

## Validation

La validation CI doit réussir sur le commit final avant de considérer cette phase comme publiée. La réussite de l'exécution des exemples ne valide pas à elle seule l'ensemble des explications théoriques ; les limites ci-dessus restent explicites.

**Prochaine étape :** audit des chapitres 6 à 11, en conservant la même méthode : approfondissement du cours, exemples contrôlés par oracles, questions rédigées et vérification des limites du simulateur.
