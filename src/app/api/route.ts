import getLatestTableData from "@/lib/api";

export async function GET() {
	const data = await getLatestTableData([
		{
			name: 'financials',
		}, {
			name: 'ratios',
		}
	]);

	return Response.json(data);
}