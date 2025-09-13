import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
	const { description } = await request.json();

	return json({ "hello": "world" }, { status: 201 });
}