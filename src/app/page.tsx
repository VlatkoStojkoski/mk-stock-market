import StocksTable from "@/components/StocksTable";
import { client } from "@/lib/stocks"

export default async function Home() {
	const data = await client.listIssuers({
		limit: 10
	});

	return (
		<div className="container mx-auto min-h-screen p-8 flex flex-col items-start justify-center">
			{
				data ?
					<StocksTable data={data} /> :
					<div className="text-3xl">Loading...</div>
			}
		</div>
	)
}
