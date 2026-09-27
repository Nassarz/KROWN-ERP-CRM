import { NextRequest, NextResponse } from 'next/server';
import { authenticateByPinOnly } from '@/lib/services/pin-auth.service';
import { verifyDeviceChallenge } from '@/lib/services/device-auth.service';
import { getPlatformSettings } from '@/lib/platform-settings';

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set('krown_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24, path: '/' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pin = String(body.pin || '').trim();
    const deviceId = String(body.deviceId || '').trim();
    const challenge = String(body.challenge || '').trim();
    const signature = String(body.signature || '').trim();

    if (!/^\d{4,6}$/.test(pin)) return NextResponse.json({ data: null, error: 'Enter your 4–6 digit PIN' }, { status: 400 });

    // Maintenance mode blocks restaurant sign-ins (super admin can still use /api/auth/login).
    const settings = await getPlatformSettings();
    if (settings.maintenanceMode) {
      return NextResponse.json({
        data: null,
        error: 'The platform is in maintenance mode. Restaurant sign-ins are temporarily disabled.',
      }, { status: 503 });
    }

    if (!deviceId || !challenge || !signature) {
      return NextResponse.json({ data: null, error: 'This computer is not activated. Activate this device before signing in.' }, { status: 403 });
    }

    const device = await verifyDeviceChallenge(deviceId, signature, challenge);
    const result = await authenticateByPinOnly(pin, {
      deviceId: device.deviceId,
      organizationId: device.organizationId,
      branchId: device.branchId,
    });

    if (!result.success || !result.token || !result.staff) {
      return NextResponse.json({ data: null, error: result.error || 'Authentication failed' }, { status: 401 });
    }

    const response = NextResponse.json({ data: {
      token: result.token,
      staff: result.staff,
      deviceId: device.deviceId,
      organizationId: device.organizationId,
      branchId: device.branchId,
    }});
    setSessionCookie(response, result.token);
    return response;
  } catch (e: any) {
    const message = e?.message || '';
    if (/not found|not active|revoked|deactivat/i.test(message)) {
      return NextResponse.json({ data: null, error: 'This device has been deactivated. Please re-activate it.' }, { status: 403 });
    }
    if (/challenge/i.test(message)) {
      return NextResponse.json({ data: null, error: 'Device verification failed. Please try again.' }, { status: 401 });
    }
    return NextResponse.json({ data: null, error: 'Authentication failed' }, { status: 401 });
  }
}
