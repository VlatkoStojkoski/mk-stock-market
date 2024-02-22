import StocksTable from "@/components/StocksTable";
import { Table as ITable } from "@/lib/api";

export default async function Home() {
	const res = await fetch('http://localhost:3000/api');
	const data = await res.json() as ITable[];

	return (
		<div className="container mx-auto min-h-screen p-8 flex flex-col items-start justify-center">
			{
				data ?
					<StocksTable tables={data} /> :
					<div className="text-3xl">Loading...</div>
			}
		</div>
	)
}
