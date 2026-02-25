# Instructions pour créer le Diagramme de Gantt

## Méthode 1 : Google Sheets (RECOMMANDÉ - Gratuit et Rapide)

1. Allez sur https://sheets.google.com
2. Créez un nouveau tableur
3. Importez le fichier `GANTT_EXCEL_READY.csv` :
   - Fichier → Importer → Téléverser
   - Sélectionnez `GANTT_EXCEL_READY.csv`
4. Sélectionnez toutes les données
5. Insertion → Graphique
6. Dans l'éditeur de graphique :
   - Type : Graphique en barres
   - Série : Sélectionnez "Début" et "Fin" comme séries
   - Axe horizontal : "Tâche"
7. Formatez les couleurs selon le statut
8. Exportez en PDF : Fichier → Télécharger → PDF

## Méthode 2 : Excel

1. Ouvrez Excel
2. Importez `GANTT_EXCEL_READY.csv`
3. Sélectionnez les colonnes : Tâche, Début, Fin
4. Insertion → Graphiques → Barres empilées
5. Ajustez les dates pour créer les barres de Gantt
6. Enregistrez et exportez en PDF

## Méthode 3 : GanttProject (Logiciel Gratuit)

1. Téléchargez : https://www.ganttproject.biz/download
2. Installez et ouvrez GanttProject
3. Créez un nouveau projet
4. Ajoutez chaque phase :
   - Clic droit → Ajouter une tâche
   - Nom : "Phase 1 - Cahier des charges et UI/UX"
   - Date de début : 23 Jan 2026
   - Durée : 21 jours
5. Répétez pour toutes les phases
6. Exportez : Fichier → Exporter en PDF

## Méthode 4 : Outil en ligne - TeamGantt (Gratuit)

1. Allez sur https://www.teamgantt.com/
2. Créez un compte gratuit
3. Créez un nouveau projet "GoFit"
4. Ajoutez les phases avec les dates
5. Exportez en PDF

## Structure des Phases

### Phase 1 : Cahier des charges et UI/UX (3 semaines)
- Définition fonctionnalités, objectifs, parcours utilisateur
- Intégration maquettes Figma
- Setup environnement iOS/Android

### Phase 2 : Setup et authentification (2 semaines)
- Configuration React Native + Expo
- Configuration Next.js + Supabase
- Système authentification complet

### Phase 3 : Fonctionnalités de base mobile (5 semaines)
- Workout Planner
- Bibliothèque d'exercices
- Suivi progression
- Notifications

### Phase 4 : IA et fonctionnalités avancées (3 semaines)
- Intégration MediaPipe
- IA Mesures Corporelles

### Phase 5 : Marketplace de coaches (4 semaines)
- Onboarding coaches
- Marketplace
- Packs sessions
- Programmes personnalisés
- Vidéo calls (WebRTC)
- Calendrier
- Wallet & Paiement
- Chat (Socket.io)

### Phase 6 : Panel d'administration (2 semaines) ✅
- Interface web Next.js
- Gestion utilisateurs/coaches
- CRUD exercices/workouts
- Statistiques

### Phase 7 : Tests et optimisation (3 semaines)
- Tests iOS/Android
- Performance
- Optimisation
- Bugs fixes

### Phase 8 : Déploiement (4 semaines)
- Publication Play Store
- Publication App Store
- Déploiement panel admin
- Monitoring

## Dates Clés (PFE)

- **Début projet** : 26 Janvier 2026
- **Fin estimée** : 26 Juillet 2026
- **Durée totale** : 6 mois exactement (26 semaines)

## Planning Détaillé

- **Phase 1** : 26 Jan - 16 Fév 2026 (3 semaines)
- **Phase 2** : 16 Fév - 2 Mar 2026 (2 semaines)
- **Phase 3** : 2 Mar - 6 Avr 2026 (5 semaines)
- **Phase 4** : 6 Avr - 27 Avr 2026 (3 semaines)
- **Phase 5** : 27 Avr - 25 Mai 2026 (4 semaines)
- **Phase 6** : 25 Mai - 8 Jun 2026 (2 semaines) ✅
- **Phase 7** : 8 Jun - 29 Jun 2026 (3 semaines)
- **Phase 8** : 29 Jun - 26 Jul 2026 (4 semaines)

## Format de Fichier pour Upload

Le fichier doit être en format :
- **PDF** (recommandé)
- **Image** (PNG, JPG)
- **Excel** (XLSX)

Créez le diagramme avec l'une des méthodes ci-dessus, puis exportez en PDF pour l'uploader dans le formulaire.
