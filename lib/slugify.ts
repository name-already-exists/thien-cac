export function slugify(text: string): string {
  return text
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function chapterSlug(num: number, title: string): string {
  const s = slugify(title)
  return s ? `chuong-${num}-${s}` : `chuong-${num}`
}

// Parses the chapter number from slugs like "chuong-5352" or "chuong-5352-nhan-gian-dao-dai"
export function parseChapterNum(slug: string): number {
  const m = slug.match(/^chuong-(\d+)/)
  return m ? parseInt(m[1], 10) : 1
}
