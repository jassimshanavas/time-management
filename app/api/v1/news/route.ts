/**
 * /api/v1/news — Live tech news from HackerNews Firebase API
 * No auth required. Categorizes stories by keyword matching.
 */
import { NextResponse } from 'next/server';

interface HNStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  score: number;
  time: number;
  descendants?: number;
  type: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  category: 'ai' | 'tech' | 'jobs' | 'trends';
  url?: string;
}

const AI_KEYWORDS = ['ai', 'llm', 'gpt', 'gemini', 'claude', 'anthropic', 'openai', 'machine learning', 'neural', 'deepmind', 'mistral', 'llama', 'transformer', 'agent', 'copilot', 'diffusion', 'chatgpt', 'artificial intelligence'];
const JOB_KEYWORDS = ['hiring', 'job', 'remote', 'engineer', 'developer', 'salary', 'position', 'career', 'recruit', 'h1b', 'layoff', 'laid off', 'ask hn: who is hiring'];
const TRENDS_KEYWORDS = ['trend', 'startup', 'vc', 'funding', 'raise', 'series', 'growth', 'market', 'launch', 'product'];

function categorize(title: string): 'ai' | 'tech' | 'jobs' | 'trends' {
  const lower = title.toLowerCase();
  if (AI_KEYWORDS.some(k => lower.includes(k))) return 'ai';
  if (JOB_KEYWORDS.some(k => lower.includes(k))) return 'jobs';
  if (TRENDS_KEYWORDS.some(k => lower.includes(k))) return 'trends';
  return 'tech';
}

function timeAgo(unixTs: number): string {
  const diffMs = Date.now() - unixTs * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function extractDomain(url?: string): string {
  if (!url) return 'news.ycombinator.com';
  try { return new URL(url).hostname.replace('www.', ''); } catch { return 'HN'; }
}

export async function GET() {
  try {
    // Fetch top 60 story IDs from HackerNews
    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      next: { revalidate: 300 }, // cache 5 mins
    });
    if (!idsRes.ok) throw new Error('HN API unavailable');
    const ids: number[] = await idsRes.json();
    const topIds = ids.slice(0, 60);

    // Fetch story details in parallel (batches of 10)
    const stories: HNStory[] = [];
    const BATCH = 10;
    for (let i = 0; i < topIds.length; i += BATCH) {
      const batch = topIds.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(id =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
            .then(r => r.json())
        )
      );
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.title && r.value?.type === 'story') {
          stories.push(r.value);
        }
      });
      // Stop early once we have enough
      if (stories.length >= 30) break;
    }

    // Map to NewsItem
    const news: NewsItem[] = stories.slice(0, 25).map(s => ({
      id: String(s.id),
      title: s.title,
      summary: s.url
        ? `${s.score} points · ${s.descendants ?? 0} comments on HackerNews · via ${extractDomain(s.url)}`
        : `${s.score} points · ${s.descendants ?? 0} comments on HackerNews`,
      source: extractDomain(s.url),
      time: timeAgo(s.time),
      category: categorize(s.title),
      url: s.url ?? `https://news.ycombinator.com/item?id=${s.id}`,
    }));

    return NextResponse.json({ news });
  } catch (error: any) {
    console.error('[News API Error]', error);
    return NextResponse.json({ error: error.message, news: [] }, { status: 500 });
  }
}
