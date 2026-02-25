# Formulaire de Projet - Suggestions de Réponses

## 1. Titre Projet (*) - OBLIGATOIRE

**Suggestion :**
```
GoFit - Plateforme de Fitness Complète
```

**Autres options :**
- GoFit : Application Mobile et Panel d'Administration pour le Suivi de Fitness
- GoFit - Solution Complète de Gestion de Fitness
- Plateforme GoFit : Mobile et Web pour le Suivi d'Entraînement

---

## 2. Description Projet

**Suggestion complète :**

```
GoFit est une plateforme de fitness complète et innovante composée de trois composants principaux :

1. **Application Mobile (GoFitMobile)** : 
   Une application React Native (Expo) offrant aux utilisateurs :
   - Authentification sécurisée (création de compte, connexion, récupération de mot de passe)
   - Gestion de profil et paramètres (objectifs, informations personnelles, unités kg/lbs, préférences)
   - Workout Planner : planification de séances, calendrier, gestion des répétitions et séries, minuteur intégré, historique complet
   - Bibliothèque d'exercices complète avec images, animations et explications détaillées
   - Suivi de progression avec graphiques clairs pour poids, mensurations et progrès
   - Meal Planner : création de repas, calcul automatique des calories et macronutriments, vue hebdomadaire
   - IA Génération Repas : plan alimentaire personnalisé adapté aux objectifs (calories, macros)
   - IA Mesures Corporelles : analyse de photos pour estimer automatiquement les mensurations (taille, hanches, etc.)
   - Notifications et rappels automatiques personnalisables

2. **Marketplace de Coaches** :
   Un écosystème connectant coaches et clients :
   - Coach Onboarding : création de profil coach avec compétences, upload de CV et vérification de certifications
   - Marketplace : vue client des profils de coaches avec filtrage par compétences et notes
   - Packs de Sessions : système d'achat de packs de sessions (1, 10 ou plus) avec suivi du solde
   - Programmes Personnalisés : portail permettant aux coaches d'envoyer des plans d'entraînement et nutrition personnalisés aux clients
   - Live Vidéo Call : fonctionnalité de visioconférence 1-à-1 pour séances d'entraînement à distance
   - Gestion Calendrier : calendrier de réservation de séances avec rappels automatisés
   - Wallet & Paiement : gestion des revenus du coach et paiements sécurisés
   - Instant Chat : messagerie texte en temps réel entre coach et client

3. **Panel d'Administration** :
   Une application web Next.js 15 permettant aux administrateurs de :
   - Gérer les utilisateurs, coaches et leurs profils
   - Créer et modifier la bibliothèque d'exercices et de repas (CRUD complet)
   - Gérer les entraînements natifs avec support des splits multi-jours
   - Visualiser les statistiques et analytics de la plateforme
   - Configurer les paramètres et notifications

**Stack Technique :**
- Frontend Mobile : React Native (Expo), TypeScript, NativeWind (Tailwind CSS)
- Frontend Web : Next.js 15 (App Router), TypeScript, shadcn/ui, Tailwind CSS
- Backend : Supabase (PostgreSQL, Authentication, Storage)
- IA : Intégration d'API d'intelligence artificielle pour génération de repas et analyse d'images
- Paiements : Système de wallet et paiements sécurisés
- Architecture : Monorepo avec ressources partagées (base de données, documentation)
```

**Version courte :**

```
GoFit est une plateforme de fitness complète intégrant une application mobile React Native pour le suivi personnel (entraînements, nutrition, progression avec IA), un marketplace connectant coaches et clients (vidéo calls, programmes personnalisés, paiements), et un panel d'administration web Next.js pour la gestion du contenu. La plateforme combine suivi de fitness, planification nutritionnelle intelligente, coaching à distance, et outils d'administration avancés.
```

---

## 3. Problématique Projet (*) - OBLIGATOIRE

**Suggestion complète :**

```
Les solutions de fitness actuelles présentent de nombreuses limitations qui fragmentent l'expérience utilisateur et limitent l'efficacité du suivi :

1. **Séparation entre entraînement et nutrition** : 
   Les applications existantes traitent l'entraînement et la nutrition séparément, obligeant les utilisateurs à utiliser plusieurs outils pour un suivi complet. Il manque une intégration fluide entre planification de repas et planification d'entraînements.

2. **Absence d'intelligence artificielle pour la personnalisation** :
   Les solutions actuelles ne proposent pas de génération automatique de plans alimentaires adaptés aux objectifs spécifiques (calories, macros), ni d'analyse intelligente des mensurations corporelles à partir de photos, nécessitant une saisie manuelle fastidieuse.

3. **Manque de connectivité coach-client** :
   Il n'existe pas de plateforme unifiée permettant aux coaches de proposer leurs services, de créer des programmes personnalisés, de communiquer en temps réel avec leurs clients, et de gérer leurs revenus. Les coaches doivent utiliser plusieurs outils non intégrés (calendrier, paiement, communication).

4. **Expérience utilisateur fragmentée** :
   Les utilisateurs doivent jongler entre plusieurs applications : une pour les entraînements, une autre pour la nutrition, une pour communiquer avec leur coach, et d'autres pour le suivi de progression. Cette fragmentation réduit l'engagement et la cohérence du suivi.

5. **Manque de flexibilité dans la planification** :
   Les applications offrent des entraînements prédéfinis sans possibilité de créer des splits personnalisés sur plusieurs jours, ni de recevoir des programmes adaptés directement de leur coach.

6. **Absence de système de paiement intégré** :
   Les coaches doivent gérer manuellement les paiements, les packs de sessions, et leurs revenus, sans outil dédié intégré à la plateforme.

7. **Suivi de progression limité** :
   Les solutions existantes ne fournissent pas un système complet de suivi avec graphiques clairs, historique détaillé, et analyse automatique des mensurations.

GoFit résout ces problèmes en proposant une plateforme unifiée intégrant entraînement, nutrition intelligente avec IA, marketplace de coaches avec communication en temps réel, système de paiement intégré, et outils d'administration complets, créant une expérience utilisateur cohérente et complète.
```

**Version courte :**

```
Les solutions de fitness actuelles fragmentent l'expérience utilisateur entre entraînement et nutrition, manquent d'intelligence artificielle pour la personnalisation, n'offrent pas de connectivité coach-client intégrée, et nécessitent l'utilisation de multiples outils non connectés. GoFit résout ces problèmes en proposant une plateforme unifiée intégrant suivi personnel avec IA (génération de repas, analyse de mensurations), marketplace de coaches (vidéo calls, programmes personnalisés, paiements), et administration complète, créant une expérience cohérente et complète.
```

---

## Conseils pour compléter le formulaire

1. **Titre Projet** : Restez concis mais descriptif (50-100 caractères idéalement)
2. **Description** : Détaillez les fonctionnalités principales et la stack technique
3. **Problématique** : Expliquez clairement les problèmes que votre projet résout

---

## Informations supplémentaires que vous pourriez avoir besoin

### Objectifs du Projet :
- Créer une expérience utilisateur fluide pour le suivi de fitness
- Fournir un outil d'administration complet pour gérer le contenu
- Offrir une flexibilité maximale dans la planification d'entraînements
- Assurer la scalabilité avec une architecture moderne

### Technologies Utilisées :
- React Native (Expo) pour l'application mobile
- Next.js 15 pour le panel d'administration
- Supabase pour le backend (PostgreSQL, Auth, Storage)
- TypeScript pour la sécurité de type
- Tailwind CSS pour le styling

### Public Cible :
- Utilisateurs finaux : Personnes souhaitant suivre leurs entraînements et progression
- Administrateurs : Gestionnaires de contenu et administrateurs de la plateforme
