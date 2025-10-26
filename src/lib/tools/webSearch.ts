type SearchOptions = { maxResults?: number; timeRange?: string };

export async function runSearch(query: string, options: SearchOptions = {}) {
  const provider = (process.env.SEARCH_PROVIDER || "tavily").toLowerCase();

  if (provider === "tavily") {
    const key = process.env.TAVILY_API_KEY;
    if (!key) {
      return { error: "TAVILY_API_KEY manquant" };
    }
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tavily-Api-Key": key },
      body: JSON.stringify({
        query,
        max_results: options.maxResults || 5,
        include_answer: true,
        include_images: false,
        // time_range: options.timeRange, // si besoin
      }),
    });
    const data = await resp.json();
    // Normalisation
    return {
      provider: "tavily",
      answer: data.answer,
      results:
        data.results?.map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
        })) || [],
    };
  }

  if (provider === "serpapi") {
    const key = process.env.SERPAPI_KEY;
    if (!key) return { error: "SERPAPI_KEY manquant" };

    const params = new URLSearchParams({
      engine: "google",
      q: query,
      api_key: key,
      hl: "fr",
      num: String(options.maxResults || 5),
    });

    const resp = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    const data = await resp.json();
    const organic = data.organic_results || [];
    return {
      provider: "serpapi",
      results: organic.slice(0, options.maxResults || 5).map((r: any) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
      })),
    };
  }

  return { error: `SEARCH_PROVIDER inconnu: ${provider}` };
}
