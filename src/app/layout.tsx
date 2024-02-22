import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import MyNextUIProvider from './nextui-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
	title: 'Berza',
	description: 'Look up data from the Macedonian Stock Exchange.',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" className='dark'>
			<body className={`${inter.className} min-h-screen dark`}>
				<MyNextUIProvider>
					{children}
				</MyNextUIProvider>
			</body>
		</html>
	)
}
