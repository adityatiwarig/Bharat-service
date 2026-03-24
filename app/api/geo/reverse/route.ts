import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get('lat'));
  const longitude = Number(searchParams.get('lon'));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'User-Agent': 'bharat-service-geo-evidence/1.0',
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return NextResponse.json({});
    }

    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string | undefined>;
    };

    const address = data.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.state_district ||
      address.state ||
      null;
    const area =
      address.suburb ||
      address.neighbourhood ||
      address.county ||
      address.road ||
      null;

    return NextResponse.json({
      address: data.display_name || null,
      city,
      area,
    });
  } catch (error) {
    console.error('Reverse geocoding failed', error);
    return NextResponse.json({});
  }
}
