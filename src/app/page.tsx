import StocksTable from "@/components/StocksTable";
import { client } from "@/lib/stocks"

export default async function Home() {
	const data = await client.listIssuers({
		limit: 10
	});

	return (
		<div className="min-h-screen p-8 flex flex-col items-start justify-center">
			<StocksTable data={data} />
			{/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
		</div>
	)
}
