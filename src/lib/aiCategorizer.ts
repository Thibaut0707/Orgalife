// src/lib/aiCategorizer.ts
export type Categorie =
  | "Logement" | "Alimentation" | "Transport" | "Santé" | "Loisirs"
  | "Abonnements" | "Shopping" | "Salaire" | "Autre";

type LearnMap = Record<string, Categorie>; // token -> catégorie

const STORAGE_KEY = "ai_learn_map_v1";

// Petit lexique de mots-clés (tu peux l’enrichir)
const KEYWORDS: Record<Categorie, string[]> = {
  Logement:      ["loyer","rent","hypothèque","mortgage","airbnb","logement"],
  Alimentation:  ["carrefour","iga","metro","supermarché","épicerie","grocery","resto","restaurant","ubereats","doordash","pizza","kfc","mcdonald","café","coffee","aliment","food"],
  Transport:     ["stm","rtc","opal","bus","metro","train","uber","taxi","essence","gas","station","autoroute","parking","vélo","carburant","transit"],
  Santé:         ["pharmacie","pharma","pharmaprix","jean coutu","dentiste","optique","médic","assurance santé","mutuelle","docteur","clinic","health"],
  Loisirs:       ["ciné","cinema","netflix","spotify","concert","parc","loisir","jeux","game","playstation","xbox","nintendo","stade","match"],
  Abonnements:   ["abonnement","subscription","subscribe","netflix","spotify","prime","icloud","office 365","adobe","notion","canva"],
  Shopping:      ["zara","hm","amazon","ikea","best buy","boutique","magasin","vêtement","clothes","chaussure","shoes","achat","shopping"],
  Salaire:       ["salaire","payroll","paiement employeur","paycheque","paycheck","versement employeur","revenu"],
  Autre:         [],
};

function loadLearn(): LearnMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveLearn(map: LearnMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}

// Normalisation pour matching
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

// Score par catégories avec pondération
export function suggestCategory(description: string, montantAbs: number): { categorie: Categorie; score: number } {
  const learn = loadLearn();
  const text = norm(description);

  // 1) Si appris par token exact (mots >=3 lettres)
  const tokens = Array.from(new Set(text.split(/[^a-z0-9]+/g).filter(t => t.length >= 3)));
  const learnedHits: Record<Categorie, number> = {};
  for (const tok of tokens) {
    const c = learn[tok];
    if (c) learnedHits[c] = (learnedHits[c] || 0) + 1;
  }
  const learnedBest = Object.entries(learnedHits).sort((a,b)=>b[1]-a[1])[0];
  if (learnedBest && learnedBest[1] >= 2) { // au moins 2 tokens appris concordants
    return { categorie: learnedBest[0] as Categorie, score: 0.95 };
  }

  // 2) Heuristique par mots-clés
  const scores: Record<Categorie, number> = Object.fromEntries(Object.keys(KEYWORDS).map(k => [k, 0]));
  const isIncome = /(salaire|payroll|paycheque|paycheck|employeur|revenu)/.test(text);
  if (isIncome) scores["Salaire"] += 2;

  for (const [cat, words] of Object.entries(KEYWORDS) as [Categorie, string[]][]) {
    for (const w of words) {
      if (text.includes(norm(w))) scores[cat] += 1;
    }
  }

  // 3) Pondération par montant (ex: logement tend à être élevé, mais soft)
  if (montantAbs >= 800) scores["Logement"] += 0.5;

  // 4) Choix final
  const best = (Object.entries(scores) as [Categorie, number][])
    .sort((a,b)=>b[1]-a[1])[0];

  const categorie = (best?.[0] ?? "Autre") as Categorie;
  const score = best?.[1] ? Math.min(0.9, best[1] / 5) : 0.2;
  return { categorie, score };
}

// Apprentissage à partir d’une correction utilisateur
export function learnCategory(description: string, chosen: Categorie) {
  const map = loadLearn();
  for (const tok of norm(description).split(/[^a-z0-9]+/g)) {
    if (tok.length >= 3) {
      map[tok] = chosen;
    }
  }
  saveLearn(map);
}
 