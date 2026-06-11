import { createClient } from './supabase'
import type { Story, Chapter } from './data'

// Columns fetched for every story query
const STORY_SELECT = `
  id, slug, title, han, han_short, han1, han2,
  status, chapter_count, word_count, reader_count, review_count, rating,
  palette, seal_color, description,
  is_featured, featured_order, featured_quote,
  last_chapter_at, weekly_views, monthly_views, created_at,
  authors ( name ),
  translators ( name ),
  genres ( name ),
  story_tags ( tags ( name ) )
`.trim()

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (diff === 0) return 'Hôm nay'
  if (diff === 1) return 'Hôm qua'
  return `${diff} ngày trước`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStory(row: any): Story {
  const tags: string[] = (row.story_tags ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((st: any) => st.tags?.name as string | undefined)
    .filter(Boolean)

  return {
    id:          row.slug,
    dbId:        row.id,
    title:       row.title,
    han:         row.han,
    hanShort:    row.han_short  ?? '',
    han1:        row.han1       ?? '',
    han2:        row.han2       ?? '',
    author:      row.authors?.name      ?? '',
    translator:  row.translators?.name  ?? '',
    genre:       row.genres?.name       ?? '',
    tags,
    status:      row.status as 'ongoing' | 'completed',
    chapters:    row.chapter_count,
    words:       formatCount(row.word_count   ?? 0),
    rating:      Number(row.rating),
    readers:     formatCount(row.reader_count ?? 0),
    reviews:     formatCount(row.review_count ?? 0),
    palette:     row.palette as [string, string],
    sealColor:   row.seal_color ?? '#8B2331',
    desc:        row.description ?? '',
    // metadata used by home.tsx
    isFeatured:    row.is_featured,
    featuredOrder: row.featured_order  ?? undefined,
    featuredQuote: row.featured_quote  ?? undefined,
    weeklyViews:   row.weekly_views,
    monthlyViews:  row.monthly_views,
    lastChapterAt: row.last_chapter_at ?? undefined,
    createdAt:     row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChapter(row: any): Chapter {
  return {
    num:  row.chapter_number,
    name: row.title,
    date: formatDate(row.published_at),
    read: false,
  }
}

// ----------------------------------------------------------------
// Queries
// ----------------------------------------------------------------

/** Một truyện theo slug */
export async function fetchStoryBySlug(slug: string): Promise<Story | null> {
  const { data, error } = await createClient()
    .from('stories')
    .select(STORY_SELECT)
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapStory(data as any)
}

/** Tất cả truyện — dùng cho home (derive ranked/featured/recent client-side) và library */
export async function fetchAllStories(): Promise<Story[]> {
  const { data, error } = await createClient()
    .from('stories')
    .select(STORY_SELECT)
    .order('weekly_views', { ascending: false })
  if (error || !data) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(mapStory)
}

/** Top 5 truyện đề cử theo weekly_views, loại trừ truyện hiện tại */
export async function fetchRecommendedStories(excludeDbId: number): Promise<Story[]> {
  const { data, error } = await createClient()
    .from('stories')
    .select(STORY_SELECT)
    .neq('id', excludeDbId)
    .order('weekly_views', { ascending: false })
    .limit(5)
  if (error || !data) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(mapStory)
}

/** Danh sách chương của một truyện (không load nội dung) */
export async function fetchChapters(storyDbId: number): Promise<Chapter[]> {
  const PAGE = 1000
  const all: Chapter[] = []
  let from = 0

  while (true) {
    const { data, error } = await createClient()
      .from('chapters')
      .select('chapter_number, title, published_at')
      .eq('story_id', storyDbId)
      .eq('is_published', true)
      .order('chapter_number', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...(data as any[]).map(mapChapter))
    if (data.length < PAGE) break
    from += PAGE
  }

  return all
}

/** Nội dung một chương cụ thể */
export async function fetchChapterContent(
  storyDbId: number,
  chapterNumber: number,
): Promise<{ chapterNumber: number; title: string; content: string } | null> {
  const { data, error } = await createClient()
    .from('chapters')
    .select('chapter_number, title, chapter_contents ( content )')
    .eq('story_id', storyDbId)
    .eq('chapter_number', chapterNumber)
    .maybeSingle()
  if (error || !data) return null

  // chapter_contents là 1-1 (PK FK) — Supabase trả về object hoặc array
  const cc = data.chapter_contents as unknown
  const content: string =
    Array.isArray(cc)
      ? ((cc[0] as { content: string })?.content ?? '')
      : ((cc as { content: string } | null)?.content ?? '')

  return { chapterNumber: data.chapter_number, title: data.title, content }
}
