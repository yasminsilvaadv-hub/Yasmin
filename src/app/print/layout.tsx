import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Livros Societários',
}

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
