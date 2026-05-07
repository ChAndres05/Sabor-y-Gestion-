import { NextResponse } from 'next/server';
import { validateProductText } from '../../productos/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text : '';
    const label = typeof body?.label === 'string' ? body.label : 'El texto';

    const validation = await validateProductText(text, label);

    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    return NextResponse.json({ value: validation.value ?? text });
  } catch {
    return NextResponse.json({ error: 'Error al validar el texto' }, { status: 500 });
  }
}
