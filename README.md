#  OrgaLife — Gestion des finances personnelles (Next.js + IA)

![Build passing](https://img.shields.io/badge/build-passing-brightgreen)
![Vercel](https://img.shields.io/badge/deploy-vercel-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

> Application web moderne de gestion financière, budgétaire et d’épargne avec intelligence artificielle intégrée.  
> Développée avec **Next.js 15**, **React 19**, **TypeScript**, **TailwindCSS** et **Recharts**.

---

##  Fonctionnalités principales

###  Finances
- Suivi des **revenus et dépenses** mensuels.
- **Catégorisation automatique** des transactions grâce à une IA locale.
- **Budgets** par catégorie, avec détection automatique des dépassements.
- **Graphiques interactifs** (courbes et barres) pour visualiser revenus, dépenses et soldes.
- **Filtres puissants** par mois, année, catégorie, recherche texte.
- **Import/Export CSV** pour la portabilité des données.

###  Épargnes & Objectifs
- Création d’objectifs d’épargne avec **barres de progression dynamiques**.
- Modification en direct (nom, cible, épargne actuelle).
- Ajout rapide d’argent avec suivi instantané.
- Suggestions d’actions intelligentes selon ton comportement financier.

###  IA intégrée
- **IA locale** pour la catégorisation automatique des transactions.
- **Conseils personnalisés** d’épargne et de gestion de budget.
- Module prévu pour connexion à **l’assistant OpenAI / OpenRouter**.

###  Apparence & UX
- **Mode clair / sombre** (Dark mode toggle dans le header).
- Interface **épurée, fluide et responsive**.
- Navigation par sections : Filtres, Budgets, Transactions, Graphiques, Objectifs, IA.
- Compatible **mobile / tablette / desktop**.

---

##  Technologies utilisées

| Technologie | Usage |
|-------------|-------|
| **Next.js 15.4.5** | Framework React avec App Router |
| **React 19** | Interface utilisateur |
| **TypeScript** | Typage et robustesse du code |
| **TailwindCSS 4** | Design moderne et réactif |
| **Recharts 3.1.2** | Graphiques et visualisations |
| **OpenAI SDK** | API IA pour les conseils et chat assistant |
| **LocalStorage** | Sauvegarde persistante des données utilisateur |

---

##  Installation & Lancement

```bash
# Cloner le dépôt
git clone https://github.com/<ton-utilisateur>/orgalife.git
cd orgalife

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Ouvre ton navigateur sur :
http://localhost:3000




(Il n'est pas encore complet)
