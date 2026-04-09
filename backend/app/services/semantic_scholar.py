import httpx
import urllib.parse
import xml.etree.ElementTree as ET
import asyncio
import os
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

async def search_papers(query: str, limit: int = 15, offset: int = 0) -> List[Dict]:
    """
    Tìm kiếm Semantic Scholar API với phân trang (offset). 
    Nếu lỗi, chuyển sang ArXiv API (start).
    """
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "limit": limit,
        "offset": offset,
        "fields": "paperId,title,abstract,authors,year,isOpenAccess"
    }
    # Rất nhiều dịch vụ API chặn HTTP Request nếu không có Header User-Agent
    headers = {
        "User-Agent": "AIResearchAssistant/1.0 (mailto:test@vinuni.edu.vn)"
    }
    api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key
        
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params, headers=headers)
                if response.status_code == 429 or response.status_code == 403:
                    print(f"[Attempt {attempt+1}] Semantic Scholar Rate Limit/Blocked. Retrying...")
                    await asyncio.sleep(1 + attempt)
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                results = []
                for p in data.get("data", []):
                    abstract = p.get("abstract") or "No abstract provided from source."
                        
                    author_list = p.get("authors", [])
                    author_str = ", ".join([a.get("name", "") for a in author_list[:2]])
                    if len(author_list) > 2:
                        author_str += " et al."
                        
                    results.append({
                        "id": p.get("paperId"),
                        "title": p.get("title", ""),
                        "abstract": abstract,  
                        "authors": author_str,
                        "year": p.get("year", "N/A"),
                        "relevance": 95
                    })
                    if len(results) >= 10:
                        break
                
                if results:
                    return results
                    
        except Exception as e:
            if attempt < 2:
                print(f"[Attempt {attempt+1}] Semantic Scholar failed ({e}). Retrying...")
                await asyncio.sleep(1)
            else:
                print(f"[Fallback Info] Semantic Scholar failed permanently ({e}). Switching to ArXiv API...")
                break # Thoát khỏi retry loop và chuyển xuống block ArXiv bên dưới
        
    # FALLBACK: ARXIV API (100% Free, NO API KEY)
    # ==========================================
    print(f"Fetching from Arxiv (start={offset})...")
    arxiv_url = f"http://export.arxiv.org/api/query?search_query=all:{urllib.parse.quote(query)}&start={offset}&max_results={limit}"
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        arxiv_resp = await client.get(arxiv_url)
        arxiv_resp.raise_for_status()
        root = ET.fromstring(arxiv_resp.text)
        
        results = []
        ns = {'arxiv': 'http://www.w3.org/2005/Atom'}
        for entry in root.findall('arxiv:entry', ns):
            title = entry.find('arxiv:title', ns)
            summary = entry.find('arxiv:summary', ns)
            published = entry.find('arxiv:published', ns)
            paper_id = entry.find('arxiv:id', ns)
            
            if title is None or summary is None:
                continue
                
            year = published.text[:4] if published is not None else "N/A"
            authors = [author.find('arxiv:name', ns).text for author in entry.findall('arxiv:author', ns) if author.find('arxiv:name', ns) is not None]
            
            author_str = ", ".join(authors[:2])
            if len(authors) > 2:
                author_str += " et al."
                
            clean_title = title.text.replace('\n', ' ').strip()
            clean_abstract = summary.text.replace('\n', ' ').strip()
            
            p_id = paper_id.text.split('/')[-1] if paper_id is not None else "arxiv_unknown"
            
            results.append({
                "id": p_id,
                "title": clean_title,
                "abstract": clean_abstract,
                "authors": author_str,
                "year": year,
                "relevance": 90
            })
            
            if len(results) >= 10:
                break
                
        return results
