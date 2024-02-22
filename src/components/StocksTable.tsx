'use client';

import { Table as ITable, decodeData } from "@/lib/api";
import React, { useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tabs, Tab, getKeyValue, Chip } from "@nextui-org/react";

export default function StocksTable({
	tables
}: {
	tables: ITable[];
}) {
	const [selectedTableIdx, setSelectedTableIdx] = useState<number>(0);

	return (
		<div className="flex flex-col gap-3 mx-auto flex-grow max-w-full">
			<Tabs onSelectionChange={(key) => setSelectedTableIdx(+key)}>
				{
					tables.map((table, tIdx) => (
						<Tab key={tIdx} title={table.label}></Tab>
					))
				}
			</Tabs>
			<Table aria-label="Example table with dynamic content" className='' classNames={{
				th: 'px-2 !text-[0.75rem]'
			}}>
				<TableHeader columns={tables[selectedTableIdx].columnsDef}>
					{
						(tables[selectedTableIdx].columnsDef).map((column) => (
							<TableColumn key={column.key}>{column.label}</TableColumn>
						))
					}
				</TableHeader>
				<TableBody items={tables[selectedTableIdx].issuers}>
					{(item) => (
						<TableRow key={item.key}>
							{(columnKey) => {
								const val = getKeyValue(item, columnKey);
								const floatVal = decodeData(val, 'float');

								if (columnKey === 'indicator' && typeof floatVal === 'number' && !Number.isNaN(floatVal)) {
									const color = floatVal < 22.5 ? 'success' : 'danger';

									return <TableCell>
										<Chip color={color} size='sm'>{floatVal}</Chip>
									</TableCell>;
								}

								return <TableCell>{val}</TableCell>;
							}}
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}