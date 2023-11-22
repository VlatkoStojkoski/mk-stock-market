export type IssuersInfo = Promise<{
	name: string;
	url: string;
}[] | {
	name: string;
	url: string;
	ticker: string;
	years: number[];
	data: {
		totalRevenue: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		operatingProfit: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		netProfit: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		equity: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		totalLiabilities: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		totalAssets: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		marketCap: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
	};
	ratios: {
		returnOnSales: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		netPerShare: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		returnOnAssets: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		returnToEarnings: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		bookValPerShare: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		priceToBookVal: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		dividendPerShare: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
		dividendYield: {
			name: string;
			data: {
				[key: number]: number;
			}
		};
	}
}[]>