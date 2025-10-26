"use client";

// import ChatLauncher from "@/components/ChatLauncher"; // ⬅️ décommente si le composant existe

import { useState, useEffect, ChangeEvent } from "react";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell,
} from "recharts";

import BudgetForm from "../../components/budget/BudgetForm";
import BudgetTable from "../../components/budget/BudgetTable";
import { BudgetsProvider } from "../../components/budget/useBudgets";

// IA locale
import { suggestCategory, learnCategory, Categorie as CatAI } from "../../lib/aiCategorizer";

/* =========================
   Types & Constantes
========================= */
type Categorie =
  | "Logement" | "Alimentation" | "Transport" | "Santé" | "Loisirs"
  | "Abonnements" | "Shopping" | "Salaire" | "Autre";

const CATEGORIES: Categorie[] = [
  "Logement","Alimentation","Transport","Santé","Loisirs",
  "Abonnements","Shopping","Salaire","Autre",
];

type Transaction = {
  id: number;
  type: "Dépense" | "Revenu";
  description: string;
  montant: number;
  date: string;
  categorie: Categorie | string;
};
type Objectif = { id: number; nom: string; cible: number; epargne: number; };

type FormState = {
  type: "Dépense" | "Revenu";
  description: string;
  montant: string;
  date: string;
  categorie: Categorie | "Autre";
  categorieLibre: string;
};
type ObjectifForm = { nom: string; cible: string; epargne: string; };

const MONTH_LABELS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const FULL_MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

/* =========================
   Utils CSV
========================= */
function csvEscape(v: unknown): string { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
function toCSV<T extends object>(rows: T[], headers: (keyof T)[]) {
  const head = headers.map((h) => csvEscape(String(h))).join(",");
  const body = rows.map((row) => headers.map((h) => csvEscape((row as any)[h])).join(",")).join("\n");
  return `${head}\n${body}`;
}
function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let inQuotes = false;
  for (let i=0;i<text.length;i++){const c=text[i];
    if(inQuotes){ if(c===`"`){ if(text[i+1]===`"`){field+=`"`;i++;} else inQuotes=false;} else field+=c; }
    else { if(c===`"`){inQuotes=true;} else if(c===`,`){row.push(field);field="";} 
      else if(c===`\n`||c===`\r`){ if(c===`\r`&&text[i+1]===`\n`) i++; row.push(field); rows.push(row); row=[]; field=""; }
      else field+=c; } }
  if(field.length>0||row.length>0){row.push(field);rows.push(row);}
  return rows.filter(r=>r.length>1||(r.length===1&&r[0].trim()!==""));
}

/* =========================
   Page
========================= */
export default function FinancesPage() {
  /* ---- State ---- */
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState<FormState>({ type:"Dépense", description:"", montant:"", date:"", categorie:"Alimentation", categorieLibre:"" });
  const [editId, setEditId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()+1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [categorieFilter, setCategorieFilter] = useState<string>("Toutes");

  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [objectifForm, setObjectifForm] = useState<ObjectifForm>({ nom:"", cible:"", epargne:"" });

  // --- Edition d'objectif ---
  const [editingObjId, setEditingObjId] = useState<number | null>(null);
  const [editObjForm, setEditObjForm] = useState<{ nom: string; cible: string; epargne: string; addAmount: string }>({
    nom: "",
    cible: "",
    epargne: "",
    addAmount: "",
  });

  // --- IA (suggestion de catégorie) ---
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiHint, setAiHint] = useState<{cat: string; score: number} | null>(null);

  /* ---- LocalStorage ---- */
  useEffect(() => {
    const t = localStorage.getItem("transactions"); if (t) setTransactions(JSON.parse(t));
    const o = localStorage.getItem("objectifs"); if (o) setObjectifs(JSON.parse(o));
  }, []);
  useEffect(() => { localStorage.setItem("transactions", JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem("objectifs", JSON.stringify(objectifs)); }, [objectifs]);

  /* ---- Transactions handlers ---- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.montant || !form.date) return;

    const montantNum = Number(form.montant); if (Number.isNaN(montantNum)) return;
    const montant = form.type === "Dépense" ? -Math.abs(montantNum) : Math.abs(montantNum);
    const finalCategorie = form.categorie === "Autre" && form.categorieLibre.trim()
      ? form.categorieLibre.trim()
      : form.categorie;

    // Aligner les filtres sur la date saisie pour voir immédiatement la ligne
    const d = new Date(form.date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      setSelectedYear(y);
      setSelectedMonth(m);
    }

    // Apprentissage IA (si l’utilisateur a corrigé ou si la suggestion était confiante)
    try {
      if (aiHint && form.description.trim()) {
        const chosen = String(finalCategorie) as CatAI;
        if (aiHint.cat !== chosen || aiHint.score >= 0.6) {
          learnCategory(form.description, chosen);
        }
      }
    } catch {}

    if (editId) {
      setTransactions(prev => prev.map(t => t.id===editId ? { ...t, type:form.type, description:form.description, montant, date:form.date, categorie:finalCategorie } : t));
      setEditId(null);
    } else {
      setTransactions(prev => [...prev, { id: Date.now(), type: form.type, description: form.description, montant, date: form.date, categorie: finalCategorie }]);
    }
    setForm({ type:"Dépense", description:"", montant:"", date:"", categorie:"Alimentation", categorieLibre:"" });
    setAiHint(null);
  };

  const handleDelete = (id:number)=>{ setTransactions(prev=>prev.filter(t=>t.id!==id)); if(editId===id) setEditId(null); };
  const handleEdit = (t:Transaction)=>{
    const inList = CATEGORIES.includes(t.categorie as Categorie);
    setForm({ type:t.type, description:t.description, montant:String(Math.abs(t.montant)), date:t.date, categorie: inList ? (t.categorie as Categorie) : "Autre", categorieLibre: inList ? "" : String(t.categorie) });
    setEditId(t.id);
  };

  /* ---- Objectifs handlers ---- */
  const handleObjectifSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectifForm.nom || !objectifForm.cible) return;
    const cibleNum = Number(objectifForm.cible);
    const epargneNum = objectifForm.epargne ? Number(objectifForm.epargne) : 0;
    if (Number.isNaN(cibleNum) || Number.isNaN(epargneNum)) return;
    setObjectifs(prev=>[...prev, { id: Date.now(), nom: objectifForm.nom, cible: cibleNum, epargne: epargneNum }]);
    setObjectifForm({ nom:"", cible:"", epargne:"" });
  };
  const handleObjectifDelete = (id:number)=> setObjectifs(prev=>prev.filter(o=>o.id!==id));

  const handleObjectifStartEdit = (obj: Objectif) => {
    setEditingObjId(obj.id);
    setEditObjForm({
      nom: obj.nom,
      cible: String(obj.cible),
      epargne: String(obj.epargne),
      addAmount: "",
    });
  };
  const handleObjectifCancelEdit = () => {
    setEditingObjId(null);
    setEditObjForm({ nom: "", cible: "", epargne: "", addAmount: "" });
  };
  const handleObjectifSaveEdit = () => {
    if (editingObjId === null) return;
    const cibleNum = Number(editObjForm.cible);
    const epargneNum = Number(editObjForm.epargne);
    if (Number.isNaN(cibleNum) || Number.isNaN(epargneNum)) return;

    setObjectifs(prev =>
      prev.map(o =>
        o.id === editingObjId ? { ...o, nom: editObjForm.nom, cible: cibleNum, epargne: epargneNum } : o
      )
    );
    handleObjectifCancelEdit();
  };
  const handleObjectifAddAmount = (id: number) => {
    const delta = Number(editObjForm.addAmount);
    if (Number.isNaN(delta) || delta === 0) return;
    setObjectifs(prev => prev.map(o => (o.id === id ? { ...o, epargne: Math.max(0, o.epargne + delta) } : o)));
    setEditObjForm(f => ({ ...f, addAmount: "" }));
  };

  /* ---- Calculs ---- */
  const filteredTransactions = transactions.filter(t=>{
    const d=new Date(t.date);
    const monthMatch=d.getMonth()+1===selectedMonth;
    const yearMatch=d.getFullYear()===selectedYear;
    const searchMatch=t.description.toLowerCase().includes(search.toLowerCase());
    const catMatch=categorieFilter==="Toutes" ? true : String(t.categorie)===categorieFilter;
    return monthMatch && yearMatch && searchMatch && catMatch;
  });
  const solde = filteredTransactions.reduce((acc,t)=>acc+t.montant,0);

  const currentYear=new Date().getFullYear();
  const baseYears=Array.from({length:6},(_,i)=>currentYear-i);
  const txYears=Array.from(new Set(transactions.map(t=>new Date(t.date).getFullYear())));
  const yearsAvailable=Array.from(new Set([...txYears,...baseYears])).sort((a,b)=>b-a);

  const bilanAnnuel = Array.from({length:12},(_,i)=>{
    const m=i+1;
    const tx=transactions.filter(t=>new Date(t.date).getFullYear()===selectedYear && new Date(t.date).getMonth()+1===m);
    const revenu=tx.filter(t=>t.type==="Revenu").reduce((s,t)=>s+t.montant,0);
    const depense=tx.filter(t=>t.type==="Dépense").reduce((s,t)=>s+Math.abs(t.montant),0);
    return { mois: MONTH_LABELS[i], revenu, depense, solde: revenu-depense };
  });

  const recapParCategorie: Record<string, number> = {};
  filteredTransactions.forEach(t=>{ recapParCategorie[String(t.categorie)] = (recapParCategorie[String(t.categorie)]||0) + t.montant; });
  const recapData = Object.entries(recapParCategorie).map(([categorie,total])=>({categorie,total})).sort((a,b)=>Math.abs(b.total)-Math.abs(a.total));
  const barColor = (v:number)=> v>=0 ? "#10b981" : "#ef4444";

  /* ---- Export / Import ---- */
  const exportAll = ()=> download("transactions.csv", toCSV(transactions, ["id","type","description","montant","date","categorie"]));
  const exportFiltered = ()=> download("transactions_filtrees.csv", toCSV(filteredTransactions, ["id","type","description","montant","date","categorie"]));
  const exportObjs = ()=> download("objectifs.csv", toCSV(objectifs, ["id","nom","cible","epargne"]));
  const importCSV = async (e: ChangeEvent<HTMLInputElement>, target:"transactions"|"objectifs")=>{
    const file=e.target.files?.[0]; if(!file) return;
    const text=await file.text(); const rows=parseCSV(text); if(rows.length<2) return;
    const headers=rows[0]; const data=rows.slice(1);
    if(target==="transactions"){
      const newTx:Transaction[]=data.map(r=>({
        id: Number(r[headers.indexOf("id")]) || Date.now()+Math.floor(Math.random()*1000),
        type: (r[headers.indexOf("type")] as "Dépense"|"Revenu") || "Dépense",
        description: r[headers.indexOf("description")] || "",
        montant: Number(r[headers.indexOf("montant")]) || 0,
        date: r[headers.indexOf("date")] || new Date().toISOString().slice(0,10),
        categorie: r[headers.indexOf("categorie")] || "Autre",
      }));
      setTransactions(newTx);
    } else {
      const newObjs:Objectif[]=data.map(r=>({
        id: Number(r[headers.indexOf("id")]) || Date.now()+Math.floor(Math.random()*1000),
        nom: r[headers.indexOf("nom")] || "",
        cible: Number(r[headers.indexOf("cible")]) || 0,
        epargne: Number(r[headers.indexOf("epargne")]) || 0,
      }));
      setObjectifs(newObjs);
    }
    e.target.value="";
  };

  /* ---- UI ---- */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header principal */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">💰 Gestion des finances</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Ajoutez, budgétez et visualisez vos revenus & dépenses.</p>

          {/* Mini navigation interne */}
          <nav className="mt-4 overflow-x-auto">
            <ul className="flex gap-3 text-sm">
              {[
                { href: "#filtres", label: "Filtres & période" },
                { href: "#budgets", label: "Budgets" },
                { href: "#transactions", label: "Transactions" },
                { href: "#recap", label: "Récap catégories" },
                { href: "#graphiques", label: "Graphiques" },
                { href: "#importexport", label: "Import / Export" },
                { href: "#objectifs", label: "Objectifs" },
                { href: "#conseils", label: "Conseils IA" },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="inline-block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Section Filtres */}
        <section id="filtres" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
          <h2 className="text-xl font-semibold mb-3">🎛️ Filtres & période</h2>
          <div className="flex flex-wrap gap-4">
            <select value={selectedMonth} onChange={(e)=>setSelectedMonth(Number(e.target.value))} className="border p-2 rounded bg-white dark:bg-gray-950 dark:border-gray-700">
              {FULL_MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e)=>setSelectedYear(Number(e.target.value))} className="border p-2 rounded bg-white dark:bg-gray-950 dark:border-gray-700">
              {yearsAvailable.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <select value={categorieFilter} onChange={(e)=>setCategorieFilter(e.target.value)} className="border p-2 rounded bg-white dark:bg-gray-950 dark:border-gray-700">
              <option value="Toutes">Toutes catégories</option>
              {Array.from(new Set(transactions.map(t=>String(t.categorie)))).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="Recherche..." value={search} onChange={(e)=>setSearch(e.target.value)} className="border p-2 rounded flex-1 min-w-[200px] bg-white dark:bg-gray-950 dark:border-gray-700"/>
          </div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            Solde {FULL_MONTHS[selectedMonth-1]} {selectedYear} :
            <span className={`font-bold ${solde>=0?"text-green-600":"text-red-500"}`}> {fmt(solde)} $</span>
          </p>
        </section>

        {/* Section Budgets */}
        <section id="budgets" className="space-y-4">
          <h2 className="text-xl font-semibold dark:text-gray-100">🎯 Budgets</h2>
          <p className="text-gray-600 dark:text-gray-400 -mt-2 mb-2">Définissez vos plafonds mensuels par catégorie.</p>

          <BudgetsProvider>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">➕ Ajouter / Mettre à jour un budget</h3>
              <BudgetForm
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                categories={CATEGORIES}
              />
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">📋 Budgets enregistrés</h3>
              <BudgetTable
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                filteredTransactions={filteredTransactions as any}
              />
            </div>
          </BudgetsProvider>
        </section>

        {/* Section Transactions */}
        <section id="transactions" className="space-y-4">
          <h2 className="text-xl font-semibold dark:text-gray-100">💸 Transactions</h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">➕ Ajouter / Modifier une transaction</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <label>Type :</label>
                <select value={form.type} onChange={(e)=>setForm({...form, type: e.target.value as FormState["type"]})} className="border p-2 rounded w-full bg-white dark:bg-gray-950 dark:border-gray-700">
                  <option>Dépense</option><option>Revenu</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label>Catégorie :</label>
                <select
                  value={form.categorie}
                  onChange={(e)=>setForm({...form, categorie: e.target.value as FormState["categorie"]})}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-950 dark:border-gray-700"
                >
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Suggestion IA */}
              {aiEnabled && aiHint && (
                <div className="md:col-span-2 text-sm text-gray-600 dark:text-gray-300">
                  Suggestion IA : <span className="font-medium">{aiHint.cat}</span>{" "}
                  {aiHint.score >= 0.6 ? "👍" : aiHint.score >= 0.35 ? "🤔" : "🪫"}
                  <button
                    type="button"
                    onClick={()=> setForm(f=>({...f, categorie: aiHint.cat as any, categorieLibre: ""}))}
                    className="ml-2 text-indigo-600 hover:underline"
                  >
                    Appliquer
                  </button>
                  <label className="ml-4 inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={aiEnabled} onChange={(e)=>setAiEnabled(e.target.checked)} />
                    <span>Activer la suggestion auto</span>
                  </label>
                </div>
              )}

              {form.categorie==="Autre" && (
                <input type="text" placeholder="Nom de la catégorie" value={form.categorieLibre} onChange={(e)=>setForm({...form, categorieLibre: e.target.value})} className="border p-2 rounded md:col-span-2 bg-white dark:bg-gray-950 dark:border-gray-700"/>
              )}

              <input
                type="text"
                placeholder="Description"
                value={form.description}
                onChange={(e)=>{
                  const description = e.target.value;
                  setForm({...form, description});
                  if (aiEnabled) {
                    const amountAbs = Math.abs(Number(form.montant || "0"));
                    const s = suggestCategory(description, amountAbs);
                    setAiHint({ cat: s.categorie, score: s.score });
                    if (form.categorie === "Autre") {
                      setForm(f => ({ ...f, categorie: (s.categorie as any) }));
                    }
                  }
                }}
                className="border p-2 rounded md:col-span-2 bg-white dark:bg-gray-950 dark:border-gray-700"
              />

              <input
                type="number"
                placeholder="Montant"
                value={form.montant}
                onChange={(e)=>{
                  const montant = e.target.value;
                  setForm({...form, montant});
                  if (aiEnabled && form.description.trim().length > 1) {
                    const amountAbs = Math.abs(Number(montant || "0"));
                    const s = suggestCategory(form.description, amountAbs);
                    setAiHint({ cat: s.categorie, score: s.score });
                    if (form.categorie === "Autre") {
                      setForm(f => ({ ...f, categorie: (s.categorie as any) }));
                    }
                  }
                }}
                className="border p-2 rounded bg-white dark:bg-gray-950 dark:border-gray-700"
              />

              <input type="date" value={form.date} onChange={(e)=>setForm({...form, date:e.target.value})} className="border p-2 rounded bg-white dark:bg-gray-950 dark:border-gray-700"/>

              <div className="md:col-span-2">
                <button type="submit" className={`w-full md:w-auto text-white px-4 py-2 rounded ${editId?"bg-yellow-500 hover:bg-yellow-600":"bg-indigo-600 hover:bg-indigo-700"}`}>
                  {editId ? "✏️ Modifier" : "➕ Ajouter"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5 overflow-x-auto">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">📃 Liste des transactions (période filtrée)</h3>
            <table className="min-w-[720px] w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead><tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Type</th>
                <th className="border px-4 py-2">Catégorie</th>
                <th className="border px-4 py-2">Description</th>
                <th className="border px-4 py-2">Montant</th>
                <th className="border px-4 py-2">Actions</th>
              </tr></thead>
              <tbody>
                {filteredTransactions.map(t=>(
                  <tr key={t.id} className="even:bg-gray-50 dark:even:bg-gray-950/50">
                    <td className="border px-4 py-2">{t.date}</td>
                    <td className={`border px-4 py-2 ${t.type==="Revenu"?"text-green-600":"text-red-500"}`}>{t.type}</td>
                    <td className="border px-4 py-2">{String(t.categorie)}</td>
                    <td className="border px-4 py-2">{t.description}</td>
                    <td className={`border px-4 py-2 ${t.montant>0?"text-green-600":"text-red-500"}`}>{fmt(t.montant)} $</td>
                    <td className="border px-4 py-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={()=>handleEdit(t)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded">✏️ Modifier</button>
                        <button onClick={()=>handleDelete(t.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">🗑️ Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length===0 && (
                  <tr><td className="border px-4 py-3 text-gray-500 dark:text-gray-400" colSpan={6}>Aucune transaction pour cette période.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section Récap catégories */}
        <section id="recap" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
          <h2 className="text-xl font-semibold mb-2 dark:text-gray-100">🧾 Récap par catégorie — {FULL_MONTHS[selectedMonth-1]} {selectedYear}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-[480px] w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead><tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border px-4 py-2 text-left">Catégorie</th>
                <th className="border px-4 py-2 text-right">Total</th>
              </tr></thead>
              <tbody>
                {Object.entries(recapParCategorie).map(([cat,total])=>(
                  <tr key={cat}>
                    <td className="border px-4 py-2">{cat}</td>
                    <td className={`border px-4 py-2 text-right ${total>=0?"text-green-600":"text-red-500"}`}>{fmt(total)} $</td>
                  </tr>
                ))}
                {Object.keys(recapParCategorie).length===0 && (
                  <tr><td className="border px-4 py-3 text-gray-500 dark:text-gray-400" colSpan={2}>Aucune transaction pour cette période.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section Graphiques */}
        <section id="graphiques" className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
            <h2 className="text-xl font-semibold mb-3 dark:text-gray-100">📈 Bilan Mensuel — Séries temporelles</h2>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <LineChart data={filteredTransactions}>
                  <Line type="monotone" dataKey="montant" stroke="#4f46e5" strokeWidth={2}/>
                  <CartesianGrid stroke="#e5e7eb"/><XAxis dataKey="date"/><YAxis/><Tooltip/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
            <h2 className="text-xl font-semibold mb-3 dark:text-gray-100">📊 Récap Catégories — Barres</h2>
            <div className="w-full h-72">
              {recapData.length>0 ? (
                <ResponsiveContainer>
                  <BarChart data={recapData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                    <CartesianGrid stroke="#e5e7eb"/>
                    <XAxis dataKey="categorie" interval={0} tick={{fontSize:12}} angle={-20} dy={20}/>
                    <YAxis/>
                    <Tooltip formatter={(v:number)=>[`${v.toLocaleString("fr-FR")} $`,"Total"]}/>
                    <Legend/>
                    <Bar dataKey="total" name="Total par catégorie">
                      {recapData.map((e,idx)=>(<Cell key={idx} fill={barColor(e.total)} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (<div className="text-gray-500 dark:text-gray-400">Aucune donnée pour ce mois.</div>)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
            <h2 className="text-xl font-semibold mb-3 dark:text-gray-100">📅 Bilan Annuel — {selectedYear}</h2>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <LineChart data={bilanAnnuel}>
                  <Line type="monotone" dataKey="revenu" stroke="#10b981" strokeWidth={2}/>
                  <Line type="monotone" dataKey="depense" stroke="#ef4444" strokeWidth={2}/>
                  <Line type="monotone" dataKey="solde" stroke="#3b82f6" strokeWidth={2}/>
                  <CartesianGrid stroke="#e5e7eb"/><XAxis dataKey="mois"/><YAxis/><Tooltip/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Section Import / Export */}
        <section id="importexport" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
          <h2 className="text-xl font-semibold mb-3 dark:text-gray-100">🔁 Import / Export</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg dark:border-gray-800">
              <h4 className="font-semibold mb-2 dark:text-gray-100">📤 Exporter</h4>
              <div className="flex flex-wrap gap-2">
                <button onClick={exportAll} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded">Toutes les transactions (.csv)</button>
                <button onClick={exportFiltered} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded">Transactions filtrées (.csv)</button>
                <button onClick={exportObjs} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded">Objectifs (.csv)</button>
              </div>
            </div>

            <div className="p-4 border rounded-lg dark:border-gray-800">
              <h4 className="font-semibold mb-2 dark:text-gray-100">📥 Importer</h4>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-sm">Importer transactions (.csv)</label>
                  <input type="file" accept=".csv,text/csv" onChange={(e)=>importCSV(e,"transactions")} className="block w-full border p-2 rounded bg-white dark:bg-gray-950 dark:border-gray-700"/>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Colonnes: id,type,description,montant,date,categorie</p>
                </div>
                <div>
                  <label className="text-sm">Importer objectifs (.csv)</label>
                  <input type="file" accept=".csv,text/csv" onChange={(e)=>importCSV(e,"objectifs")} className="block w-full border p-2 rounded bg-white dark:bg-gray-950 dark:border-gray-700"/>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Colonnes: id,nom,cible,epargne</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Objectifs (avec édition) */}
        <section id="objectifs" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
          <h2 className="text-xl font-semibold mb-3 dark:text-gray-100">🏦 Épargnes & Objectifs</h2>

          {/* Formulaire d'ajout d'objectif */}
          <form onSubmit={handleObjectifSubmit} className="mb-6 flex flex-col gap-3">
            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nom de l'objectif"
                value={objectifForm.nom}
                onChange={(e)=>setObjectifForm({...objectifForm, nom:e.target.value})}
                className="border p-2 rounded w-full bg-white dark:bg-gray-950 dark:border-gray-700"
              />
              <input
                type="number"
                placeholder="Montant cible"
                value={objectifForm.cible}
                onChange={(e)=>setObjectifForm({...objectifForm, cible:e.target.value})}
                className="border p-2 rounded w-full bg-white dark:bg-gray-950 dark:border-gray-700"
              />
              <input
                type="number"
                placeholder="Épargne actuelle"
                value={objectifForm.epargne}
                onChange={(e)=>setObjectifForm({...objectifForm, epargne:e.target.value})}
                className="border p-2 rounded w-full bg-white dark:bg-gray-950 dark:border-gray-700"
              />
            </div>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded w-full md:w-auto">
              ➕ Ajouter Objectif
            </button>
          </form>

          {/* Liste des objectifs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {objectifs.map(obj=>{
              const enEdition = editingObjId === obj.id;
              const progression = obj.cible>0 ? Math.min((obj.epargne/obj.cible)*100, 100) : 0;

              return (
                <div key={obj.id} className="p-4 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-800 shadow space-y-3">
                  {!enEdition ? (
                    <h4 className="font-semibold text-gray-700 dark:text-gray-100">{obj.nom}</h4>
                  ) : (
                    <input
                      type="text"
                      className="border p-2 rounded w-full font-semibold bg-white dark:bg-gray-950 dark:border-gray-700"
                      value={editObjForm.nom}
                      onChange={(e)=>setEditObjForm(s=>({...s, nom: e.target.value}))}
                    />
                  )}

                  {!enEdition ? (
                    <>
                      <p className="text-gray-600 dark:text-gray-300">Épargné : {fmt(obj.epargne)} $ / {fmt(obj.cible)} $</p>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 h-4 rounded-full">
                        <div className="h-4 rounded-full bg-green-500" style={{width:`${progression}%`}} />
                      </div>
                    </>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Cible ($)</label>
                        <input
                          type="number"
                          className="border p-2 rounded w-full bg-white dark:bg-gray-950 dark:border-gray-700"
                          value={editObjForm.cible}
                          onChange={(e)=>setEditObjForm(s=>({...s, cible: e.target.value}))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Épargne ($)</label>
                        <input
                          type="number"
                          className="border p-2 rounded w-full bg-white dark:bg-gray-950 dark:border-gray-700"
                          value={editObjForm.epargne}
                          onChange={(e)=>setEditObjForm(s=>({...s, epargne: e.target.value}))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ajout rapide d'argent */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    <input
                      type="number"
                      placeholder="Ajouter un montant (+/-)"
                      className="border p-2 rounded flex-1 bg-white dark:bg-gray-950 dark:border-gray-700"
                      value={editObjForm.addAmount}
                      onChange={(e)=>setEditObjForm(s=>({...s, addAmount: e.target.value}))}
                    />
                    <button
                      onClick={()=>handleObjectifAddAmount(obj.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded"
                      type="button"
                    >
                      ➕ Ajouter à l'épargne
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {!enEdition ? (
                      <>
                        <button
                          onClick={()=>handleObjectifStartEdit(obj)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                          type="button"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={()=>handleObjectifDelete(obj.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                          type="button"
                        >
                          🗑️ Supprimer
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleObjectifSaveEdit}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded"
                          type="button"
                        >
                          💾 Enregistrer
                        </button>
                        <button
                          onClick={handleObjectifCancelEdit}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
                          type="button"
                        >
                          ❌ Annuler
                        </button>
                        <button
                          onClick={()=>handleObjectifDelete(obj.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-auto"
                          type="button"
                        >
                          🗑️ Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {objectifs.length===0 && (
              <div className="text-gray-500 dark:text-gray-400">Aucun objectif pour l’instant.</div>
            )}
          </div>
        </section>

        {/* Section Conseils IA */}
        <section id="conseils" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg p-5">
          <h2 className="text-xl font-semibold mb-3 dark:text-gray-100">🧠 Conseils d’épargne (IA locale)</h2>
          {(() => {
            // 1) Top catégories dépensières du mois (négatifs)
            const totalsByCat: Record<string, number> = {};
            filteredTransactions.forEach(t => {
              totalsByCat[String(t.categorie)] = (totalsByCat[String(t.categorie)] || 0) + t.montant;
            });
            const topSpenders = Object.entries(totalsByCat)
              .map(([c, v]) => ({ c, depense: v < 0 ? Math.abs(v) : 0 }))
              .filter(x => x.depense > 0)
              .sort((a,b)=>b.depense - a.depense)
              .slice(0, 3);

            // 2) Dépassements de budgets (lecture localStorage "budgets")
            let overBudget: { cat: string; depense: number; budget: number }[] = [];
            try {
              const raw = localStorage.getItem("budgets");
              if (raw) {
                const budgets = JSON.parse(raw) as { categorie: string; montant: number; mois: number; annee: number }[];
                const monthBudgets = budgets.filter(b => b.annee === selectedYear && b.mois === selectedMonth);
                for (const b of monthBudgets) {
                  const depenseCat = Math.abs(
                    filteredTransactions.filter(t => String(t.categorie) === b.categorie && t.montant < 0)
                      .reduce((s,t)=>s+t.montant, 0)
                  );
                  if (depenseCat > b.montant && b.montant > 0) {
                    overBudget.push({ cat: b.categorie, depense: depenseCat, budget: b.montant });
                  }
                }
                overBudget = overBudget.sort((a,b)=> (a.depense - a.budget) < (b.depense - b.budget) ? 1 : -1);
              }
            } catch {}

            // 3) Idées d’actions rapides
            const actions: string[] = [];
            for (const o of overBudget) {
              actions.push(`Réduire ${o.cat} d’environ ${(o.depense - o.budget).toFixed(0)} $ pour revenir sous le budget.`);
            }
            if (topSpenders[0]) actions.push(`Négocier ou substituer dans "${topSpenders[0].c}" (catégorie la plus coûteuse ce mois-ci).`);
            if (topSpenders[1]) actions.push(`Fixer un plafond hebdo pour "${topSpenders[1].c}" (enveloppe cash/compte séparé).`);
            if (solde > 0) actions.push(`Transférer ${Math.max(10, Math.floor(solde * 0.2))} $ vers un objectif d’épargne (20% du solde).`);

            return (
              <div className="space-y-4">
                {overBudget.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">⚠️ Dépassements de budget</h3>
                    <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                      {overBudget.map(o=>(
                        <li key={o.cat}>
                          {o.cat}: {o.depense.toLocaleString("fr-FR")} $ dépensés / budget {o.budget.toLocaleString("fr-FR")} $ — dépassement de {(o.depense - o.budget).toLocaleString("fr-FR")} $
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {topSpenders.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">💡 Top catégories dépensières</h3>
                    <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                      {topSpenders.map(t=>(
                        <li key={t.c}>
                          {t.c}: {t.depense.toLocaleString("fr-FR")} $ ce mois-ci
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {actions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">✅ Actions recommandées</h3>
                    <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                      {actions.map((a,i)=>(<li key={i}>{a}</li>))}
                    </ul>
                  </div>
                )}

                {overBudget.length===0 && topSpenders.length===0 && actions.length===0 && (
                  <p className="text-gray-600 dark:text-gray-300">RAS pour l’instant. Continue comme ça 💪</p>
                )}
              </div>
            );
          })()}
        </section>
      </main>

      {/* {typeof window !== "undefined" && <ChatLauncher />} */}
    </div>
  );
}
