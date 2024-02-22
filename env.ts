export const PUBLIC_URL =
	process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL ||
	process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;

if (PUBLIC_URL === undefined) {
	throw new Error('PUBLIC_URL is undefined');
}