import StocksTable from "@/components/StocksTable";
import { env } from "@/env";
import { Table as ITable } from "@/lib/api";

export default async function Home() {
	// console.log('fetching', env.NEXT_PUBLIC_URL);
	// const res = await fetch(new URL('/api', env.NEXT_PUBLIC_URL));
	// const data = await res.json() as ITable[];

	return (
		<div className="container mx-auto min-h-screen p-8 flex flex-col items-start justify-center">
			{/* <StocksTable tables={data} /> */}
		</div>
	)
}
