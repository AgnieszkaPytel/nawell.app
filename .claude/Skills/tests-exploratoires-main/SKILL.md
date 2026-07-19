---
name: exploratory-tests
description: À utiliser quand l'utilisateur demande des tests exploratoires, des tests UX, un scénario ou parcours utilisateur (« user journey »), un test guidé par persona, ou un test d'acceptation manuel d'une feature. Pour explorer une interface « dans la peau d'un utilisateur » — pas pour la régression automatisée.
---

# Skill : Tests exploratoires guidés par persona

## Quand utiliser ce skill

Quand l'utilisateur demande des **tests exploratoires**, des tests UX guidés par utilisateur fictif, ou une revue d'une fonctionnalité « dans la peau d'un vrai utilisateur ». Mots-clés typiques : *tests exploratoires*, *scénario utilisateur*, *user journey*, *persona*.

Ce skill remplace **les tests Playwright automatisés** uniquement pour l'exploration. Les tests automatisés (spec files) gardent leur place pour la régression.

## ⚙️ Premier lancement (onboarding)

> **À faire une seule fois, au tout premier appel du skill dans un projet** — avant « Outils requis » et la suite.

Quand quelqu'un colle ce fichier dans son projet, les valeurs propres au projet sont encore des placeholders (`<repo>`, le Brief produit, et les Environnements `<env>` / `<BASE_URL>` / `<ENTRY_PATH>` / `<AUTH>`). Au tout premier appel :

1. **Vérifier l'état** dans le bloc « Configuration du projet » ci-dessous.
   - État `CONFIGURÉ ✓` → l'onboarding est déjà fait, passer directement à « Outils requis ».
   - État `NON CONFIGURÉ` → exécuter les étapes suivantes **avant toute autre chose**.

2. **Auto-détecter** ce qui peut l'être, sans déranger l'utilisateur :
   - `<repo>` = basename de la racine git (`git rev-parse --show-toplevel`). Confirmer seulement si ambigu.

3. **Mener l'onboarding section par section** — une section à la fois, en **attendant la réponse avant de passer à la suivante**. Ne **jamais** tout demander d'un seul bloc de texte. Utiliser le **mode question interactif** du runtime (sous Claude Code : l'outil `AskUserQuestion` — choix sélectionnables + option de saisie libre), pas un mur de texte. Règle simple : champ à valeurs finies (nombre d'environnements, protégé oui/non, page d'entrée par défaut) → proposer des **choix** ; champ ouvert (nom, promesse, cas d'usage, utilisateurs) → poser la question et laisser **saisir**.

   **Section 1 — Brief produit** (pour ancrer des personas pertinents) :
   - Nom / marque du produit ?
   - Sa promesse (qu'est-ce qu'il résout) ?
   - Ses principaux cas d'usage (« le produit permet de… ») ?
   - Qui sont ses utilisateurs ? (profils types)

   **Section 2 — Environnements** : quels environnements peut-on tester ? Pour **chacun** : un nom (`dev` / `staging` / `prod`), son URL de base, sa page d'entrée pour le healthcheck (défaut `/login`), et s'il est protégé — mécanisme (mot de passe d'environnement, SSO, header de bypass, IP allowlist) + **où récupérer** le token / les identifiants. Un seul environnement suffit ; plusieurs sont la norme.

4. **Écrire les réponses dans CE fichier** (édition en place) :
   - Remplir le « Brief produit » de la Configuration (tokens `<PRODUIT_NOM>`, `<PRODUIT_PROMESSE>`, `<PRODUIT_CAS_USAGE>`, `<PRODUIT_UTILISATEURS>`).
   - Remplir le tableau « Environnements » : **une ligne par environnement** (dupliquer la ligne modèle autant que nécessaire), en remplaçant les tokens `<env>`, `<BASE_URL>`, `<ENTRY_PATH>`, `<AUTH>`.
   - Renseigner `<repo>` et passer l'état à `CONFIGURÉ ✓`.

5. **Protéger les sorties** : s'assurer que le dossier `playwright/` est ignoré par git. S'il ne l'est pas, ajouter la ligne `playwright/` au `.gitignore` à la racine. Les screenshots et rapports peuvent contenir des données réelles affichées à l'écran — ils ne doivent **jamais** être committés.

6. **Confirmer** : récap des valeurs enregistrées à l'utilisateur, puis reprendre le déroulé normal du skill.

⚠️ **Secrets** : si l'utilisateur fournit un token de bypass ou un mot de passe et que ce fichier peut être committé dans un repo public, le **prévenir**. Deux options : garder ce fichier gitignored, ou stocker le secret dans une variable d'environnement / un fichier de config local et n'inscrire ici qu'une **référence** vers cet emplacement (jamais le secret en clair).

## Configuration du projet

> **État : `NON CONFIGURÉ`** — tant que cette valeur n'est pas `CONFIGURÉ ✓`, exécuter d'abord « Premier lancement » ci-dessus.

**Repo** (`<repo>`) : `<repo>`

**Brief produit** — ce qu'est le produit, pour ancrer des personas pertinents :
- Nom / marque : `<PRODUIT_NOM>`
- Promesse : `<PRODUIT_PROMESSE>`
- Cas d'usage (le produit permet de…) : `<PRODUIT_CAS_USAGE>`
- Utilisateurs : `<PRODUIT_UTILISATEURS>`

**Environnements** — une ligne par environnement testable (l'utilisateur choisit lequel au début de chaque session) :

| Env | URL de base | Page d'entrée | Protection d'accès |
|---|---|---|---|
| `<env>` | `<BASE_URL>` | `<ENTRY_PATH>` | `<AUTH>` |

## Outils requis

- **Playwright MCP** (`mcp__playwright__*`) : navigation, clic, saisie, snapshot, screenshot. **Si ces outils ne sont pas disponibles dans le runtime, proposer de l'installer avant de continuer** — ex. Claude Code :
  ```bash
  claude mcp add playwright npx @playwright/mcp@latest
  ```
  (autres runtimes : voir la doc du serveur `@playwright/mcp`). Ne pas démarrer la session tant que le MCP n'est pas joignable.
- Une ou plusieurs **cibles accessibles** définies à l'onboarding (voir Configuration → Environnements) ; la cible de la session est vérifiée par `curl` avant de démarrer.
- Accès en écriture à `playwright/<session-id>/` à la racine du repo (screenshots + rapport HTML) et au texte du chat (journal). Ce dossier doit être **gitignored** (voir Premier lancement).
- **Superpowers** (plugin Claude Code) — *optionnel mais recommandé*. Apporte deux skills très utilisés ici : `writing-skills` (modifier / maintenir ce skill) et `using-git-worktrees` (le worktree des pré-requis). Installation :
  ```
  /plugin install superpowers@claude-plugins-official
  ```
  Source : https://github.com/obra/superpowers

## Pré-requis avant de commencer

1. **Demander la feature à tester** (obligatoire, pas de fallback) :
   > « Quelle feature on teste précisément ? (ex : tunnel d'inscription, parcours de paiement, refonte d'une page…) »
   La réponse fournit le `<slug>` en kebab-case et définit `SESSION_ID = YYYY-MM-DD-<slug>`. Ne pas commencer sans cette réponse.

2. **Choisir l'environnement de la session** parmi ceux de la Configuration. L'utilisateur le précise souvent (« on teste sur la prod », « sur staging ») ; sinon, demander lequel. **Toutes** les URLs, pages d'entrée et protections de la session viennent de la ligne correspondante — on ne mélange pas deux environnements dans une même session.

3. **Créer un worktree sibling en lecture seule** avant d'écrire quoi que ce soit :
   ```bash
   git worktree add ../<repo>-explore-<slug> HEAD
   mkdir -p playwright/<session-id>/screenshots
   ```
   Le worktree fige le code que Claude lit pendant la session ; le développement peut continuer sur la branche de travail en parallèle sans interférence. **Aucune écriture dedans** — tous les outputs (screenshots, rapport HTML) vont dans `playwright/<session-id>/` au sein du workspace principal (dossier gitignored, cf. Premier lancement).

4. **Vérifier que la cible est accessible** : un `curl -sS -o /dev/null -w "%{http_code}\n"` sur l'URL de base + la page d'entrée de l'environnement choisi. Si pas 200, demander à l'utilisateur.

   **Si l'environnement choisi est protégé** (mot de passe d'environnement, SSO, header de bypass, IP allowlist…) : récupérer les identifiants / le token de contournement à l'emplacement noté dans la Configuration. Les injecter à la fois dans les requêtes HTTP (header / query string) **et** dans la session navigateur Playwright (cookie ou header selon le mécanisme). **Ne jamais coder un secret en dur dans le skill** — il vit dans la config locale de l'utilisateur.

5. **Emails de test** : ne jamais fabriquer d'emails ad hoc au fil de l'eau (adresses jetables, alias `+test1@…`, TLD `.test`) — ça pollue la base et les fournisseurs d'auth les rejettent souvent. Si le projet dispose d'une adresse ou d'un pattern de test dédié, l'employer systématiquement.

## Logique du parcours

```
┌──────────────────────────────────────────────────────────┐
│  1. Création du persona                                  │
│  2. Création d'une série d'objectifs (3 à 6 scénarios)   │
│  3. Scope : tout le site / une fonctionnalité            │
│                                                          │
│  POUR CHAQUE SCÉNARIO :                                  │
│  ┌────────────────────────────────────────────┐          │
│  │  a. Énoncer l'objectif spécifique          │          │
│  │  b. Navigation + clic                      │          │
│  │  c. Screenshot                             │          │
│  │  d. Réflexion 3 axes :                     │          │
│  │     - Ce que le persona voit correspond-il │          │
│  │       à ce qu'il attend ?                  │          │
│  │     - Est-il plus proche de son objectif ? │          │
│  │     - Y a-t-il un frein, un doute, un bug ?│          │
│  │  e. Noter les frictions (❌/⚠️/✅)          │          │
│  │  f. Continuer jusqu'à l'objectif atteint   │          │
│  │     OU jusqu'à un blocage manifeste        │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  4. Rapport final : bugs hiérarchisés + frictions UX +   │
│     recommandations priorisées par parcours              │
└──────────────────────────────────────────────────────────┘
```

## Étape 1 — Création du persona

**Partir du Brief produit** (Configuration), jamais d'une page blanche : choisir un des profils d'utilisateurs décrits, puis l'incarner. Le persona doit être détaillé sur 4 axes :

- **Identité** : nom, âge, rôle, taille d'équipe/entreprise
- **Objectif** : ce qui l'amène sur le produit — relié à un **cas d'usage du brief** (le résultat concret qu'il veut obtenir)
- **Familiarité** : jamais utilisé le produit / utilisateur avancé / revient après une longue absence
- **Contrainte forte** : ce qui le frustrera particulièrement (rapidité, clarté, confiance, conformité…)

**Garde-fou de pertinence** : avant d'aller plus loin, justifier en une phrase pourquoi ce persona est plausible pour CE produit — quel profil utilisateur du brief il représente, quel cas d'usage il poursuit. S'il ne se rattache à aucun profil ni cas d'usage du brief, le retravailler.

Éviter les personas génériques (« Sarah, utilisatrice »). Donner un vrai métier et un vrai stress de contexte.

## Étape 2 — Création des objectifs

Entre **3 et 6 scénarios** par session. Chaque scénario :

- A **un but concret et atomique** (un objectif précis et unique — pas « utiliser le produit »)
- Est **atteignable en moins de 10 actions**
- Teste **une surface différente** du produit (création / consultation / erreur / flow secondaire)
- Inclut au moins **un scénario d'échec attendu** (ex : quota dépassé, lien invalide, ressource pleine) pour observer le comportement de l'app sur les edge cases

> ⚙️ **À construire à chaque session** : la série de scénarios est propre au produit et à la feature du jour — la dériver des cas d'usage du Brief produit et des surfaces réelles. Garder l'esprit ci-dessus (un but atomique par scénario, surfaces variées, au moins un échec attendu).

## Étape 3 — Cadrer la cible

La feature / le périmètre a déjà été donné au pré-requis 1 — l'interpréter, sans reposer la question :

- **« Tout le site »** → liste d'objectifs couvrant les grandes surfaces (vitrine + app + flows secondaires)
- **Une fonctionnalité précise** → concentrer 3 à 6 scénarios sur ses edge cases

Si la réponse était « fais ton choix », proposer une liste de scénarios **avant** de naviguer et attendre validation (1 aller-retour, pas plus).

## Étape 4 — La boucle par scénario

> 📊 **Suivi des métriques (toute la session)** : avant le 1er scénario, noter l'heure de départ (`date`) ; tenir un compteur de **clics** (`browser_click`) et de **pages consultées** (URLs distinctes via `browser_navigate`). Ces valeurs alimentent l'en-tête du rapport (Étape 5).

Pour **chaque clic** ou transition majeure :

1. **Appeler** `mcp__playwright__browser_navigate` ou `mcp__playwright__browser_click`
2. **Capturer** via `mcp__playwright__browser_take_screenshot` dans `playwright/<session-id>/screenshots/` (nom clair : `sN-stepM-what.png`)
3. **Réflexion explicite dans le chat** en 3 points :
   - ✅ / ⚠️ / ❌ sur la cohérence avec l'attente du persona
   - Progression (proche du but, encore à mi-chemin, bloqué)
   - Friction ou bug observé
4. **Annoter** ce que le persona dirait à voix haute (« ça veut dire quoi, ce terme ? »)

Règles importantes :

- **Jamais 2 actions sans screenshot** : on perd le fil d'observation
- **Ne pas compenser les bugs** : si un bouton ne marche pas via `browser_click`, tenter `browser_evaluate({ function: '...' })` mais **noter le bug de sélecteur**.
- **Accepter l'échec d'un scénario** : si le persona est bloqué, conclure ce scénario avec le blocage et passer au suivant. Ne pas contourner le bug en tant qu'admin.
- **Tolérer les erreurs serveur attendues** : si une API externe (paiement, email, etc.) échoue en dev/staging, noter le comportement UI exactement comme un utilisateur final le verrait.

## Étape 5 — Rapport final

Le rapport est **un unique fichier HTML auto-suffisant** posé à `playwright/<session-id>/report.html`. Screenshots inlinés en base64 (`<img src="data:image/png;base64,...">`), aucun asset externe — partageable par mail / Slack / drag-drop. `<style>` inline, pas de framework, screenshots dans `<details><summary>` collapsibles pour ne pas saturer le fichier.

Structure obligatoire des sections HTML :

### 📊 En-tête — métriques de session
Bandeau tout en haut du rapport, **avant** le recap :
- ⏱️ **Durée** : début → fin de session (calculée depuis les timestamps `date`)
- 🖱️ **Clics** : nombre d'actions `browser_click`
- 📄 **Pages consultées** : nombre d'URLs distinctes visitées
- 🪙 **Tokens consommés** : si le runtime expose l'info, sinon `n/a`

### ✅ Ce qui fonctionne bien
Liste courte (5-10 items max) des succès notables, factuels.

### 🐛 Bugs critiques
Tableau :

| # | Gravité | Bug | Correction suggérée |
|---|---|---|---|
| B1 | 🔴 Critique | Description précise + fichier/URL | Fix concret en une phrase |

Gravités :
- 🔴 **Critique** : utilisateur final voit un message technique, perte de données, blocage majeur
- 🟠 **Haut** : incohérence fonctionnelle, flow cassé avec détour
- 🟡 **Moyen** : friction visible, décevant mais contournable

### ⚠️ Frictions UX (non bloquantes)
Liste à puces. Une ligne par friction. Distinguer les **anglicismes**, les **boutons ambigus**, les **informations manquantes**, les **branding incohérents**.

### 💡 Recommandations par parcours
**Une section par scénario**, par priorité décroissante. Pour chaque scénario :
- Résumé : objectif atteint / partiellement / bloqué
- 2-3 recommandations concrètes et actionnables (pas « améliorer l'UX », mais « remplacer le bouton "Go" par "Créer la campagne" »)

### Annexes
- Screenshots collapsibles, inlinés en base64 dans le HTML
- Liste des comptes/données créés pendant la session (pour nettoyage éventuel)

### Ouvrir le rapport (serveur local)
Une fois `report.html` écrit, le servir sur **`http://localhost:4567/report.html`** pour que l'utilisateur l'ouvre directement :

- **Vérifier d'abord que le port 4567 est libre** (`lsof -i:4567` / `netstat` selon l'OS). S'il est occupé, prendre le port libre suivant (4568, 4569…).
- Lancer un serveur statique **en arrière-plan** sur le dossier de la session, puis **annoncer l'URL finale** (cliquable) à l'utilisateur :
  ```bash
  python3 -m http.server 4567 --directory playwright/<session-id>
  # ou : npx http-server playwright/<session-id> -p 4567
  ```

### Cleanup en fin de session
```bash
git worktree remove --force ../<repo>-explore-<slug>
```
Le rapport survit dans `playwright/<session-id>/` (gitignored), le worktree est détruit.

## Contraintes de qualité

- **Court, dry, spécifique** : pas de phrases creuses, chaque recommandation est actionnable
- **Chiffres > adjectifs** : « 3 clics vs 1 attendu », pas « trop de clics »
- **Ne pas se censurer sur les bugs internes** : si une erreur d'API externe (paiement, email…) sort en clair à l'utilisateur, c'est un bug critique à reporter
- **Ne pas polluer la base** : préfixer les entités créées par `[TEST]` et noter ce qui reste en base à la fin

## Exemple d'ouverture de session

Gabarit à remplir au début de chaque session (les valeurs concrètes dépendent du produit et de la feature testée) :

> **Persona : [nom]**, [âge], [rôle] dans [contexte / taille d'entreprise], [objectif concret]. [Niveau de familiarité avec le produit]. Ce qui compte pour lui/elle : [contrainte forte]. *(Profil du brief : [profil utilisateur] — cas d'usage : [cas d'usage visé].)*
>
> **Scénarios**
> 1. [scénario atomique 1]
> 2. [scénario atomique 2]
> 3. [persona secondaire, si pertinent]
> 4. [scénario de consultation / flow secondaire]
> 5. [scénario d'échec attendu]
> 6. [scénario d'échec attendu, persona secondaire]
>
> **Cible** : [périmètre testé].
>
> *Je vérifie le serveur, je me connecte, et j'exécute.*
