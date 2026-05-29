import { createClient } from '@/lib/supabase'

export default async function HomePage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('test')
    .select('message')
    .single()

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🎉 It works!</h1>
        {error ? (
          <p className="text-red-500">Lỗi: {error.message}</p>
        ) : (
          <p className="text-2xl text-green-600">{data?.message}</p>
        )}
      </div>
    </main>
  )
}