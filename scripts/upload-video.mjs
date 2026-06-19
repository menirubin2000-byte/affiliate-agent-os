import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const envRaw = readFileSync(resolve(root, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const productName = process.argv[2]
const videoPath = process.argv[3]

if (!productName || !videoPath) {
  console.error('Usage: node upload-video.mjs "Product Name" "/path/to/video.mp4"')
  process.exit(1)
}

const { data: product, error: findErr } = await sb
  .from('products')
  .select('id, name, video_url, video_status')
  .ilike('name', `%${productName}%`)
  .limit(5)

if (findErr) { console.error('Find error:', findErr.message); process.exit(1) }
if (!product?.length) { console.error('No product found matching:', productName); process.exit(1) }

console.log('Found products:')
for (const p of product) {
  console.log(`  ${p.id} — ${p.name} — video_status: ${p.video_status ?? 'null'}`)
}

const target = product[0]
console.log(`\nUploading to product: ${target.name} (${target.id})`)

const buffer = readFileSync(videoPath)
const ext = videoPath.split('.').pop() ?? 'mp4'
const storagePath = `product-videos/${target.id}/video.${ext}`

console.log(`Storage path: ${storagePath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)

const { error: uploadErr } = await sb.storage
  .from('media')
  .upload(storagePath, buffer, { contentType: `video/${ext}`, upsert: true })

if (uploadErr) { console.error('Upload error:', uploadErr.message); process.exit(1) }

const { data: urlData } = sb.storage.from('media').getPublicUrl(storagePath)
console.log(`Public URL: ${urlData.publicUrl}`)

const { error: updateErr } = await sb
  .from('products')
  .update({
    video_url: urlData.publicUrl,
    video_status: 'ready',
    asset_synced_at: new Date().toISOString(),
  })
  .eq('id', target.id)

if (updateErr) { console.error('Update error:', updateErr.message); process.exit(1) }

console.log('Done! video_url and video_status=ready updated.')
