import cheerio from "cheerio";
import PQueue from "p-queue";

function newAbortSignal(timeoutMs: number = 0) {
	const abortController = new AbortController();
	setTimeout(() => abortController.abort(), timeoutMs);

	return abortController.signal;
}

export type IssuerDataTableName = 'financials' | 'ratios';

type AcceptedDataTypes = 'float' | 'percent';

export type IssuerDataRow = {
	name: string;
	data: {
		[year: string]: number;
	};
	isCustom?: false;
	type: AcceptedDataTypes;
};

interface BaseColumnDescriptor {
	label: string;
	key: string;
	type: AcceptedDataTypes;
}

interface DefaultColumnDescriptor extends BaseColumnDescriptor {
	isCustom?: false;
	idx: number;
}

interface CustomColumnDescriptor extends BaseColumnDescriptor {
	isCustom: true;
	dataFetcher: (issuer: IssuerDataPreCustomProcessing) => IssuerDataRow;
}

type ColumnDescriptor = DefaultColumnDescriptor | CustomColumnDescriptor;

export interface IssuerData {
	ticker: string;
	years: number[];
	data: {
		[tableName in IssuerDataTableName]: {
			[column: string]: IssuerDataRow;
		};
	}
}

interface IssuerDataPreCustomProcessing {
	ticker: string;
	years: number[];
	data: {
		[tableName in IssuerDataTableName]: {
			[column: string]: {
				name: string;
				isCustom: true;
				dataFetcher: (issuer: IssuerDataPreCustomProcessing) => IssuerDataRow;
				type: AcceptedDataTypes;
			} | IssuerDataRow;
		};
	}
}

type IssuerColumns = {
	[tableName in IssuerDataTableName]: ColumnDescriptor[];
}

type ClientIssuerColumns = {
	[tableName in IssuerDataTableName]: BaseColumnDescriptor[];
}

export interface IssuersList {
	columns: ClientIssuerColumns;
	issuers: IssuerData[];
}

class MseClient {
	baseURL: string = "https://www.mse.mk";

	columns: IssuerColumns = {
		financials: [
			{ label: 'Total Revenue', key: 'totalRevenue', type: 'float', idx: 1 },
			{ label: 'Operating Profit', key: 'operatingProfit', type: 'float', idx: 2 },
			{ label: 'Net Profit', key: 'netProfit', type: 'float', idx: 3 },
			{ label: 'Equity', key: 'equity', type: 'float', idx: 4 },
			{ label: 'Total Liabilities', key: 'totalLiabilities', type: 'float', idx: 5 },
			{ label: 'Total Assets', key: 'totalAssets', type: 'float', idx: 6 },
			{ label: 'Market Cap', key: 'marketCap', type: 'float', idx: 7 },
		],
		ratios: [
			{
				label: 'Indicator',
				key: 'indicator',
				type: 'float',
				isCustom: true,
				dataFetcher: (issuer: IssuerDataPreCustomProcessing) => {
					return {
						name: 'Indicator',
						type: 'float',
						data: Object.fromEntries(
							// @ts-ignore
							Object.entries<number>(issuer.data.ratios.priceToEarnings.data).map(
								([year, priceToEarnings]) => {
									// @ts-ignore
									const priceToBookVal = issuer.data.ratios.priceToBookVal.data[year] as number;

									return [year, priceToEarnings / priceToBookVal];
								}
							)
						),
					};
				},
			},
			{ label: 'Return On Sales', key: 'returnOnSales', type: 'percent', idx: 1 },
			{ label: 'Net earnings per share (EPS)', key: 'netPerShare', type: 'float', idx: 2 },
			{ label: 'Return on assets', key: 'returnOnAssets', type: 'percent', idx: 3 },
			{ label: 'Return on equity', key: 'returnOnEquity', type: 'percent', idx: 4 },
			{ label: 'Price to earnings', key: 'priceToEarnings', type: 'float', idx: 5 },
			{ label: 'Book value per share', key: 'bookValPerShare', type: 'float', idx: 6 },
			{ label: 'Price to Book Value', key: 'priceToBookVal', type: 'float', idx: 7 },
			{ label: 'Dividend Per Share', key: 'dividendPerShare', type: 'float', idx: 8 },
			{ label: 'Dividend yield', key: 'dividendYield', type: 'percent', idx: 9 },
		]
	}

	clientColumns: ClientIssuerColumns = {
		financials: this.columns.financials.map((column) => ({
			label: column.label,
			key: column.key,
			type: column.type,
		})),
		ratios: this.columns.ratios.map((column) => ({
			label: column.label,
			key: column.key,
			type: column.type,
		}))
	}

	constructor() {
	}

	async get(path: string, timeoutMs: number = 1000) {
		const signal = newAbortSignal(timeoutMs);

		const res = await fetch(this.baseURL + path, {
			signal,
		});

		const data = await res.text();

		return {
			data,
			status: res.status,
			statusText: res.statusText,
		};
	}

	async getIssuerInfo(issuerUrl: string): Promise<IssuerData> {
		const { data: issuerData } = await this.get(issuerUrl);
		const $ = cheerio.load(issuerData);

		const ticker = $('#symbols > li:nth-child(1) > a:nth-child(1)').text();

		const dataTableYears = $('#financialData thead th.td-right').map((idx, el) => parseInt($(el).text().trim())).get();

		function fetchRow(tableSelector: string, row: number, name: string, type: 'float' | 'percent', dataFormatter: (arg: string) => number) {
			const rowData = $(`${tableSelector} tbody tr:nth-child(${row}) td.td-right`).map((idx, el) => $(el).text().trim()).get();

			const res: IssuerDataRow = {
				name: name,
				data: Object.fromEntries(rowData.map((value, idx) => [
					dataTableYears[idx],
					dataFormatter(value)
				])),
				type
			};

			return res;
		}

		const FINANCIALS = '#financialData';
		const RATIOS = '#financialRatios';

		const formatFloat = (arg: string) => parseFloat(arg.replace(/\D/g, ''));
		const formatPercent = (arg: string) => parseFloat(arg) / 100;

		function getRow(tableSelector: string, column: ColumnDescriptor): {
			name: string;
			isCustom: true;
			dataFetcher: (issuer: IssuerDataPreCustomProcessing) => IssuerDataRow;
			type: AcceptedDataTypes;
		} | IssuerDataRow {
			if (column.isCustom) {
				return {
					name: column.label,
					isCustom: true,
					dataFetcher: column.dataFetcher,
					type: column.type
				}
			}

			return fetchRow(tableSelector, column.idx, column.label, column.type, column.type === 'float' ? formatFloat : formatPercent)
		}

		const dataForCustomProcessing: IssuerDataPreCustomProcessing = {
			ticker,
			years: dataTableYears,
			data: {
				financials: Object.fromEntries(this.columns.financials.map((column) => [
					column.key,
					getRow(FINANCIALS, column)
				])),
				ratios: Object.fromEntries(this.columns.ratios.map((column) => [
					column.key,
					getRow(RATIOS, column)
				])),
			}
		};

		const res: IssuerData = {
			...dataForCustomProcessing,
			data: {
				financials: Object.fromEntries(Object.entries(dataForCustomProcessing.data.financials).map(([column, data]) => data.isCustom ? [
					column,
					data.dataFetcher(dataForCustomProcessing)
				] : [column, data])),
				ratios: Object.fromEntries(Object.entries(dataForCustomProcessing.data.ratios).map(([column, data]) => data.isCustom ? [
					column,
					data.dataFetcher(dataForCustomProcessing)
				] : [column, data])),
			}
		};

		return res;
	}

	async listIssuers({ limit: argLimit }: {
		limit?: number;
	} = {
			limit: 10,
		}): Promise<IssuersList> {
		const limit = argLimit ?? 10;

		const { data: listingsData } = await this.get("/en/issuers/shares-listing");
		const $ = cheerio.load(listingsData);

		const issuers = $('#exchange-table > tbody:nth-child(2) > tr > td:nth-child(2)')

		const queue = new PQueue({ concurrency: 1 });

		const queueEntries = issuers.slice(0, limit).toArray().map((element, idx) => async () => {
			const el = $(element);
			const name = el.text();
			const url = el.find('a').attr('href') || '';

			const issuerInfo = await this.getIssuerInfo(url);

			return {
				name,
				url,
				...issuerInfo
			}
		});

		const issuersInfo = await queue.addAll(queueEntries);

		return {
			columns: this.clientColumns,
			issuers: issuersInfo
		};
	}
}

export default MseClient;

// const client = new MseClient();

// const res = client.listIssuers({
// 	includeExtraInfo: true,
// 	limit: 10
// });

// console.log(JSON.stringify(res, null, 2), res.length);
