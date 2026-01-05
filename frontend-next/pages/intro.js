import Link from 'next/link'
export default function Intro(){
  return (
    <div className="wrap">
      <h1>Intro</h1>
      <p>This mirrors <code>frontend/intro.html</code>. More UI to be ported next.</p>
      <p><Link href="/"><a>Back</a></Link></p>
    </div>
  )
}