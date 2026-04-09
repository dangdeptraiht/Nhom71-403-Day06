const API_BASE = "http://localhost:8000/api/v1";

export async function searchPapers(query: string) {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 10 }),
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.detail);
  return data.data;
}

export async function extractPapers(papers: any[]) {
  const res = await fetch(`${API_BASE}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ papers }),
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.detail);
  return data.data;
}
