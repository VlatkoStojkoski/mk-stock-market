import PQueue from "p-queue";
import { AnyNode, Cheerio, load as cheerio } from "cheerio";

function newAbortSignal(timeoutMs: number = 0) {
	const abortController = new AbortController();
	setTimeout(() => abortController.abort(), timeoutMs);

	return abortController.signal;
}

const baseURL = 'https://mse.mk';

async function fetchData(path: string, timeoutMs: number = 5000) {
	const signal = newAbortSignal(timeoutMs);

	const reqUrl = new URL(path, baseURL);

	const res = await fetch(reqUrl, { signal });
	const data = await res.text();

	return {
		data,
		status: res.status,
		statusText: res.statusText,
	};
}

function getTextFromEl(el: Cheerio<AnyNode>) {
	return el.text().trim();
}

type AcceptedDataTypes = 'float' | 'percent' | 'string';

type TableQueryColumns = {
	[columnName: string]: boolean;
};

type TableName = 'financials' | 'ratios';

type TableQuery = {
	name: TableName;
	columns?: TableQueryColumns;
}

type DataSource = 'MSE-YEARLY-LATEST' | 'CUSTOM' | 'STATIC' | 'MSE-DAILY';

export interface ColumnDef {
	label: string;
	idx: number;
	key: string;
	source: DataSource;
	type: AcceptedDataTypes;
};

export type Issuer = {
	key: string;
	ticker: string;
} & {
	[columnName: string]: string;
};

type IssuerWithAllTableData = Record<string, {
	[columnName: string]: string;
}>;

export interface Table {
	name: TableName;
	label: string;
	columnsDef: ColumnDef[];
	issuers: Issuer[];
}

const tableLabels: Record<TableName, string> = {
	financials: 'Financials',
	ratios: 'Ratios'
} as const;

const SELECTORS = {
	issuers: '#exchange-table > tbody:nth-child(2) > tr > td:nth-child(2)',
	issuer: {
		ticker: '#symbols > li:nth-child(1) > a:nth-child(1)',
		years: '#financialData thead th.td-right',
		table: {
			financials: '#financialData',
			ratios: '#financialRatios',
			default: '#financialRatios'
		},
		row: (tableSelector: string, row: number) => `${tableSelector} tbody tr:nth-child(${row}) td.td-right`,
		latestDataRow: (row: number) => `#symbol-data > div:nth-child(${row}) > div:nth-child(2)`
	}
} as const;

const columnsDef: Record<string, ColumnDef[]> = {
	financials: [
		{ label: 'Ticker', key: 'ticker', type: 'string', idx: 0, source: 'STATIC' },
		{ label: 'Price', key: 'price', type: 'float', idx: 7, source: 'MSE-DAILY' },
		{ label: 'Indicator', key: 'indicator', type: 'float', idx: -1, source: 'CUSTOM' },
		{ label: 'Total Revenue', key: 'totalRevenue', type: 'float', idx: 1, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Operating Profit', key: 'operatingProfit', type: 'float', idx: 2, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Net Profit', key: 'netProfit', type: 'float', idx: 3, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Equity', key: 'equity', type: 'float', idx: 4, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Total Liabilities', key: 'totalLiabilities', type: 'float', idx: 5, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Total Assets', key: 'totalAssets', type: 'float', idx: 6, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Market Cap', key: 'marketCap', type: 'float', idx: 7, source: 'MSE-YEARLY-LATEST' },
	],
	ratios: [
		{ label: 'Ticker', key: 'ticker', type: 'string', idx: 0, source: 'STATIC' },
		{ label: 'Return On Sales', key: 'returnOnSales', type: 'percent', idx: 1, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Net Profit Per Share', key: 'netPerShare', type: 'float', idx: 2, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Return On Assets', key: 'returnOnAssets', type: 'percent', idx: 3, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Return On Equity', key: 'returnOnEquity', type: 'percent', idx: 4, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Price To Earnings', key: 'priceToEarnings', type: 'float', idx: 5, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Book Value Per Share', key: 'bookValPerShare', type: 'float', idx: 6, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Price To Book Value', key: 'priceToBookVal', type: 'float', idx: 7, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Dividend Per Share', key: 'dividendPerShare', type: 'float', idx: 8, source: 'MSE-YEARLY-LATEST' },
		{ label: 'Dividend Yield', key: 'dividendYield', type: 'percent', idx: 9, source: 'MSE-YEARLY-LATEST' },
	]
} as const;

const sourceLayers: DataSource[][] = [['STATIC', 'MSE-YEARLY-LATEST', 'MSE-DAILY'], ['CUSTOM']]

const customColumnDataFetchers: Record<string, (issuer: IssuerWithAllTableData) => string> = {
	indicator: ({ ratios: { priceToEarnings, priceToBookVal } }: IssuerWithAllTableData) => {
		if (priceToEarnings === undefined || priceToBookVal === undefined) {
			return '-';
		}

		const formattedPriceToEarnings = decodeData(priceToEarnings, 'float');
		const formattedPriceToBookVal = decodeData(priceToBookVal, 'float');

		if (!formattedPriceToEarnings || !formattedPriceToBookVal || typeof formattedPriceToEarnings !== 'number' || typeof formattedPriceToBookVal !== 'number') {
			return '-';
		}

		return (
			formattedPriceToEarnings * formattedPriceToBookVal
		).toFixed(2);
	}
};

export function decodeData(data: string, type: AcceptedDataTypes) {
	if (type === 'float') {
		return parseFloat(data);
	}

	if (type === 'percent') {
		return parseFloat(data) / 100;
	}

	if (type === 'string') {
		return data;
	}

	throw new Error(`Unknown data type: ${type}`);
}

async function getMseIssuerInfo({ url, tableSelector, columnsDef, sources }: {
	url: string;
	tableSelector: string;
	columnsDef: ColumnDef[];
	sources: DataSource[];
}): Promise<Issuer> {
	const { data: issuerHtml } = await fetchData(url);

	const $ = cheerio(issuerHtml);

	const ticker = getTextFromEl($(SELECTORS.issuer.ticker));

	if (ticker === '' || ticker === undefined) {
		throw new Error(`Ticker is empty. ${$(SELECTORS.issuer.ticker).html()}`);
	}

	const data: Issuer = {
		key: ticker,
		ticker,
	};

	for (const column of columnsDef) {
		if (!sources.includes(column.source)) continue;

		if (column.source === 'MSE-YEARLY-LATEST') {
			const columnDataSelector = SELECTORS.issuer.row(tableSelector, column.idx);
			const yearlyData = $(columnDataSelector).toArray().map((el) => getTextFromEl($(el)));

			data[column.key] = yearlyData[0];
		} else if (column.source === 'MSE-DAILY') {
			const latestDataSelector = SELECTORS.issuer.latestDataRow(column.idx);
			const latestData = getTextFromEl($(latestDataSelector));

			data[column.key] = latestData;
		}
	}

	return data;
}

async function getMseTable({ name: tableName, selector: tableSelector, columnsDef, sources }: {
	name: TableName;
	selector: string;
	columnsDef: ColumnDef[];
	sources: DataSource[];
}): Promise<Table> {
	const { data: issuersHtml } = await fetchData("/en/issuers/shares-listing");

	const $ = cheerio(issuersHtml);

	const issuersEls = $(SELECTORS.issuers).toArray();

	const fetchIssuersQueue = new PQueue({ concurrency: 1 });
	const issuers = await fetchIssuersQueue.addAll(issuersEls.map((el, idx) => async () => {
		const issuerUrl = $(el).find('a').attr('href');

		if (issuerUrl === undefined) {
			throw new Error(`Issuer (${idx}) URL is undefined. ${$(el).html()}`);
		}

		const issuerInfo = await getMseIssuerInfo({
			url: issuerUrl,
			tableSelector,
			columnsDef,
			sources
		});

		return issuerInfo;
	}));

	return {
		name: tableName,
		label: tableLabels[tableName],
		columnsDef,
		issuers,
	};
}

async function getNextTablesData({ tables, sources }: {
	tables: Table[];
	sources: DataSource[];
}): Promise<Table[]> {
	const nextTables: Table[] = tables;

	const issuers: Record<string, IssuerWithAllTableData> = {};

	for (const table of tables) {
		for (const issuer of table.issuers) {
			issuers[issuer.key] = {
				[table.name]: {
					...issuer
				}
			};
		}
	}

	for (const table of tables) {
		for (const columnDef of table.columnsDef) {
			if (columnDef.source === 'CUSTOM' && sources.includes(columnDef.source)) {
				const customFetcher = customColumnDataFetchers[columnDef.key];

				if (customFetcher === undefined) {
					throw new Error(`Custom fetcher for column ${columnDef.key} is not defined.`);
				}

				for (const issuer of table.issuers) {
					const issuerData = issuers[issuer.key];
					issuer[columnDef.key] = customFetcher(issuerData);
				}
			}
		}
	}

	return nextTables;
}

export default async function getLatestTableData(queries: TableQuery[]): Promise<Table[]> {
	const mseTables = await Promise.all(queries.map(async (query) => {
		const queryColumnNames: TableQueryColumns = query.columns ?? {};

		const filteredColumnsDef =
			query.columns === undefined ?
				columnsDef[query.name] :
				columnsDef[query.name].filter((column) => queryColumnNames[column.key] === true);

		const sources = sourceLayers[0];

		const table = await getMseTable({
			name: query.name,
			selector: SELECTORS.issuer.table[query.name] || SELECTORS.issuer.table.default,
			columnsDef: filteredColumnsDef,
			sources
		});

		return table;
	}));

	let tables: Table[] = mseTables;

	for (const sourcesLayer of sourceLayers.slice(1)) {
		const nextTables = await getNextTablesData({ tables, sources: sourcesLayer });
		tables = nextTables;
	}

	return tables;
}