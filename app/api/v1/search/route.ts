import { NextRequest, NextResponse } from 'next/server';

function ok(data: unknown) { return NextResponse.json(data); }
function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }); }

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return err('Query parameter "q" is required', 400);
  }

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from search engine: ${response.statusText}`);
    }

    const html = await response.text();
    const results: Array<{ title: string; link: string; snippet: string }> = [];
    
    // DuckDuckGo HTML web results are separated by divs containing the 'web-result' class
    const resultsBlock = html.split(/<div\s+class="[^"]*web-result[^"]*"\s*>/i);
    const blocks = resultsBlock.slice(1, 8); // Retrieve top 7 results
    
    for (const block of blocks) {
      // Matches result links where class order or other attributes may vary
      const linkMatch = block.match(/<a\s+[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      
      // Matches snippet links or spans where class order or other attributes may vary
      const snippetMatch = block.match(/<a\s+[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
        ?? block.match(/<span\s+[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      
      if (linkMatch) {
        let link = linkMatch[1];
        // Clean up proxy redirects
        if (link.includes('uddg=')) {
          const urlParam = link.split('uddg=')[1]?.split('&')[0];
          if (urlParam) {
            link = decodeURIComponent(urlParam);
          }
        }
        
        // Ensure absolute protocol link
        if (link.startsWith('//')) {
          link = 'https:' + link;
        }
        
        // Decode HTML entities in title & clean tags
        const title = linkMatch[2]
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
          
        const snippet = snippetMatch 
          ? snippetMatch[1]
              .replace(/<[^>]*>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#x27;/g, "'")
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .trim() 
          : '';
        
        results.push({ title, link, snippet });
      }
    }
    
    return ok({ results });
  } catch (error: any) {
    console.error('[Search API Error]', error);
    return err(error.message || 'Internal Search Failure', 500);
  }
};
