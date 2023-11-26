'use client';

import React, { useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tabs, Tab, getKeyValue, Chip } from "@nextui-org/react";
import { client } from "@/lib/stocks";
import { IssuerData, IssuersList } from "@/lib/MseClient";

export default function StocksTable({
	data
}: {
	data: IssuersList;
}) {
	// console.log(JSON.stringify(data, null, 2));

	const [selectedInfo, setSelectedInfo] = useState<keyof IssuerData['data']>('ratios');

	const formatPercent = (arg: number) => `${(arg * 100).toFixed(2)}%`;
	const formatFloat = (arg: number) => arg.toLocaleString('en-US');

	const rows = data.issuers.map((issuer) => ({
		key: issuer.ticker,
		ticker: issuer.ticker,
		...Object.fromEntries(Object.entries(issuer.data[selectedInfo]).map(([key, ratio]) => ([
			key, (
				ratio.type === 'float' ?
					formatFloat(ratio.data[2022]) :
					ratio.type === 'percent' ?
						formatPercent(ratio.data[2022]) :
						'undefined'
			)
		])))
	}));

	const columns = [
		{
			label: 'Ticker',
			key: 'ticker'
		},
		...data.columns[selectedInfo]
	];

	return (
		<div className="w-full flex flex-col gap-3 mx-auto flex-grow max-w-full">
			{/* @ts-ignore */}
			<Tabs onSelectionChange={(key: 'ratios' | 'financials') => setSelectedInfo(key)}>
				<Tab key='ratios' title='Ratios'></Tab>
				<Tab key='financials' title='Financials'></Tab>
			</Tabs>
			<Table aria-label="Example table with dynamic content" className='' classNames={{
				th: 'px-2 !text-[0.75rem]'
			}}>
				<TableHeader columns={columns}>
					{(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
				</TableHeader>
				<TableBody items={rows}>
					{(item) => (
						<TableRow key={item.key}>
							{(columnKey) => {
								const val = getKeyValue(item, columnKey);

								if (columnKey === 'indicator') {
									return (
										<TableCell className="">
											<Chip color={
												!Number.isFinite(+val) ? 'default' : +val < 22.5 ? 'success' : 'danger'
											} className='min-w-[100%] text-center'>
												{val}
											</Chip>
										</TableCell>
									)
								}
								return <TableCell>{val}</TableCell>
							}}
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
