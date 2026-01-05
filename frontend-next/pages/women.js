import Link from 'next/link'
export default function Women(){
  return (
    <div className="wrap">
      <h1>Women</h1>
      <p>Placeholder for the women page. Will port markup from <code>frontend/women.html</code>.</p>
      <p><Link href="/"><a>Back</a></Link></p>
    </div>
  )
}