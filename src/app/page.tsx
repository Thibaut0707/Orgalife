export default function Home() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800">Bienvenue sur OrgaLife 🚀</h2>
      <p className="mt-2 text-gray-600">
        Gérez vos <span className="font-semibold">finances</span>, vos <span className="font-semibold">voyages</span>, vos <span className="font-semibold">projets</span> et vos <span className="font-semibold">vacances</span> au même endroit.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
        <div className="p-6 bg-white shadow rounded-xl">
          <h3 className="text-lg font-semibold">💰 Finances</h3>
          <p className="text-gray-600">Suivi des dépenses et revenus.</p>
        </div>
        <div className="p-6 bg-white shadow rounded-xl">
          <h3 className="text-lg font-semibold">✈️ Voyages</h3>
          <p className="text-gray-600">Organisez vos déplacements.</p>
        </div>
        <div className="p-6 bg-white shadow rounded-xl">
          <h3 className="text-lg font-semibold">📂 Projets</h3>
          <p className="text-gray-600">Planifiez vos projets personnels.</p>
        </div>
        <div className="p-6 bg-white shadow rounded-xl">
          <h3 className="text-lg font-semibold">🌴 Vacances</h3>
          <p className="text-gray-600">Planifiez vos congés et loisirs.</p>
        </div>
      </div>
    </div>
  );
}
