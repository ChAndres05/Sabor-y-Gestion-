import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'restaurant_config.json');
const DEFAULT_LAT = -17.391537153336852;
const DEFAULT_LNG = -66.15233613739282;
async function ensureConfigDir() {
  const dir = path.dirname(CONFIG_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Ignore if directory exists
  }
}

export async function GET() {
  try {
    await ensureConfigDir();
    let fileContent;
    try {
      fileContent = await fs.readFile(CONFIG_PATH, 'utf-8');
    } catch {
      // File doesn't exist, create it with default values
      const defaultConfig = { restaurantLat: DEFAULT_LAT, restaurantLng: DEFAULT_LNG };
      await fs.writeFile(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      return NextResponse.json(defaultConfig);
    }

    const config = JSON.parse(fileContent);
    return NextResponse.json({
      restaurantLat: Number(config.restaurantLat ?? DEFAULT_LAT),
      restaurantLng: Number(config.restaurantLng ?? DEFAULT_LNG),
    });
  } catch (error) {
    console.error('Error reading restaurant config:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantLat, restaurantLng } = body;

    if (typeof restaurantLat !== 'number' || typeof restaurantLng !== 'number') {
      return NextResponse.json(
        { error: 'Latitud y longitud deben ser números válidos.' },
        { status: 400 }
      );
    }

    await ensureConfigDir();
    const newConfig = { restaurantLat, restaurantLng };
    await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');

    return NextResponse.json({
      message: 'Configuración guardada con éxito',
      config: newConfig,
    });
  } catch (error) {
    console.error('Error saving restaurant config:', error);
    return NextResponse.json(
      { error: 'Error al guardar la configuración' },
      { status: 500 }
    );
  }
}
