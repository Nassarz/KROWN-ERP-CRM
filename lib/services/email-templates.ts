import { escapeHtml } from './email.service';

const BRAND_NAME = 'KROWN POS';
const LOGO_URL = 'https://i.ibb.co/wh2T8MZ7/file-00000000c36482088cf56fe82910d3c4.png';
const ORANGE = '#f97316';
const ORANGE_DARK = '#ea580c';
const BLACK = '#0a0a0c';

/**
 * Professional white/orange/black email shell.
 * Single remote logo image — no other branding marks or dark backgrounds.
 */
function wrap(title: string, bodyHtml: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<title>${escapeHtml(title)}</title>
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>` : ''}
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
  <tr><td align="center" style="padding:32px 40px 8px;border-bottom:3px solid ${ORANGE};">
    <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="160" style="width:160px;max-width:100%;height:auto;display:block;border:0;outline:none;text-decoration:none;" />
    <h1 style="color:${BLACK};font-size:22px;font-weight:800;margin:20px 0 0;line-height:1.3;">${escapeHtml(title)}</h1>
  </td></tr>
  <tr><td style="padding:28px 40px 8px;">
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:8px 40px 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;">
      <tr><td style="padding:20px 0 0;">
        <p style="color:#71717a;font-size:12px;line-height:1.6;margin:0;text-align:center;">
          &copy; ${new Date().getFullYear()} ${BRAND_NAME} &middot; Restaurant Operations Platform<br>
          You are receiving this message because it relates to your account.<br>
          <a href="${escapeHtml(getAppUrlSafe())}/unsubscribe" style="color:${ORANGE_DARK};text-decoration:underline;">Unsubscribe</a> from non-essential emails.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function getAppUrlSafe(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2122';
}

function button(label: string, url: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,${ORANGE},${ORANGE_DARK});color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;">${escapeHtml(label)}</a>
  </div>`;
}

function panel(innerHtml: string): string {
  return `<div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:20px;margin:0 0 24px;">${innerHtml}</div>`;
}

function kv(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr><td style="color:#71717a;font-size:13px;padding:6px 0;">${escapeHtml(label)}</td>
    <td style="color:${BLACK};font-size:14px;font-weight:600;padding:6px 0;text-align:right;">${escapeHtml(value)}</td></tr>
  </table>`;
}

function note(text: string): string {
  return `<p style="color:#71717a;font-size:13px;line-height:1.6;margin:16px 0 0;text-align:center;">${escapeHtml(text)}</p>`;
}

function intro(name: string, ...paragraphs: string[]): string {
  return `<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi <strong style="color:${BLACK};">${escapeHtml(name)}</strong>,</p>
    ${paragraphs.map(p => `<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px;">${p}</p>`).join('')}`;
}

export function passwordResetEmail(opts: {
  staffName: string;
  resetUrl: string;
  expiresInHours: number;
  senderName: string;
}): { subject: string; html: string; text: string } {
  const { staffName, resetUrl, expiresInHours, senderName } = opts;
  const subject = `${BRAND_NAME}: Reset your password`;
  return {
    subject,
    html: wrap('Reset your password', `
      ${intro(staffName,
        `<strong>${escapeHtml(senderName)}</strong> requested a password reset for your ${BRAND_NAME} account.`,
        'Use the button below to choose a new password. If you did not request this, you can safely ignore this email.'
      )}
      ${button('Choose a new password', resetUrl)}
      ${panel(kv('Valid for', `${expiresInHours} hour${expiresInHours > 1 ? 's' : ''}`) + kv('One-time use', 'Yes'))}
      ${note('This link can only be used once and expires automatically.')}
    `, 'Choose a new password for your KROWN POS account.'),
    text: `Reset your password\n\nHi ${staffName},\n\n${senderName} requested a password reset for your ${BRAND_NAME} account.\n\nChoose a new password: ${resetUrl}\n\nValid for ${expiresInHours} hour(s), one-time use.\nIf you did not request this, ignore this email.`,
  };
}

export function otpEmail(opts: {
  staffName: string;
  code: string;
  purpose: string;
  expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
  const { staffName, code, purpose, expiresInMinutes } = opts;
  const purposeLabel = purpose === 'email_verify' ? 'Email Verification' : purpose === 'password_reset' ? 'Password Reset' : purpose === 'pin_reset' ? 'PIN Reset' : 'Verification';
  const subject = `${BRAND_NAME}: Your ${purposeLabel} code`;
  return {
    subject,
    html: wrap(`${purposeLabel} code`, `
      ${intro(staffName, `Your one-time verification code is below. Enter it in the app to continue.`)}
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;background:${BLACK};border-radius:14px;padding:18px 36px;">
          <span style="color:#ffffff;font-size:32px;font-weight:800;letter-spacing:8px;font-family:monospace;">${escapeHtml(code)}</span>
        </div>
      </div>
      ${panel(kv('Expires in', `${expiresInMinutes} minute${expiresInMinutes > 1 ? 's' : ''}`))}
      ${note('If you did not request this code, ignore this email and consider changing your password.')}
    `, `Your ${purposeLabel} code: ${code}`),
    text: `${purposeLabel} code\n\nHi ${staffName},\n\nYour code: ${code}\n\nExpires in ${expiresInMinutes} minute(s). If you did not request this, ignore this email.`,
  };
}

export function welcomeEmail(opts: {
  staffName: string;
  email: string;
  restaurantName: string;
  role: string;
  tempPassword?: string;
}): { subject: string; html: string; text: string } {
  const { staffName, email, restaurantName, role, tempPassword } = opts;
  const subject = `Welcome to ${BRAND_NAME}`;
  return {
    subject,
    html: wrap('Welcome aboard', `
      ${intro(staffName, 'Your account has been created. Here are your account details.')}
      ${panel(kv('Restaurant', restaurantName) + kv('Role', role) + kv('Email', email))}
      ${tempPassword
        ? panel(`<p style="color:#3f3f46;font-size:14px;margin:0 0 8px;">Your temporary password:</p>
                 <p style="color:${BLACK};font-size:18px;font-weight:700;margin:0;font-family:monospace;letter-spacing:1px;">${escapeHtml(tempPassword)}</p>
                 <p style="color:#71717a;font-size:12px;margin:10px 0 0;">Please change this after your first login.</p>`)
        : note('A password setup link has been emailed to you separately — use it to activate your login.')}
      ${note('Save this email for your records. Never share your password with anyone.')}
    `, 'Your KROWN POS account is ready.'),
    text: `Welcome to ${BRAND_NAME}\n\nHi ${staffName},\n\nYour account has been created.\nRestaurant: ${restaurantName}\nRole: ${role}\nEmail: ${email}\n${tempPassword ? `\nTemporary password: ${tempPassword} (change after first login)\n` : '\nA password setup link has been emailed to you separately.\n'}`,
  };
}

export function securityNotificationEmail(opts: {
  staffName: string;
  action: string;
  details: string;
}): { subject: string; html: string; text: string } {
  const { staffName, action, details } = opts;
  const subject = `${BRAND_NAME} security notification`;
  return {
    subject,
    html: wrap('Security notification', `
      ${intro(staffName, 'A security-related action was performed on your account:')}
      ${panel(kv('Action', action) + kv('Details', details))}
      ${note('If you did not perform this action, contact your administrator immediately.')}
    `, `Security alert: ${action}`),
    text: `Security notification\n\nHi ${staffName},\n\nAction: ${action}\nDetails: ${details}\n\nIf you did not perform this action, contact your administrator immediately.`,
  };
}

/** Annual subscription is about to expire (sent 2 days before / on expiry). */
export function subscriptionExpiryEmail(opts: {
  recipientName: string;
  restaurantName: string;
  planName: string;
  expiresAt: string;
  daysLeft: number;
  renewUrl?: string;
  toSuperAdmin?: boolean;
}): { subject: string; html: string; text: string } {
  const { recipientName, restaurantName, planName, expiresAt, daysLeft, renewUrl, toSuperAdmin } = opts;
  const when = daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} from now` : 'today';
  const subject = toSuperAdmin
    ? `${BRAND_NAME}: ${restaurantName} subscription expires ${when}`
    : `${BRAND_NAME}: Your subscription expires ${when}`;
  const body = toSuperAdmin
    ? `${escapeHtml(restaurantName)} is on the <strong>${escapeHtml(planName)}</strong> annual plan and expires <strong>${escapeHtml(when)}</strong>.`
    : `Your annual <strong>${escapeHtml(planName)}</strong> plan for <strong>${escapeHtml(restaurantName)}</strong> expires <strong>${escapeHtml(when)}</strong>.`;
  return {
    subject,
    html: wrap('Subscription expiring soon', `
      ${intro(recipientName, body)}
      ${panel(kv('Restaurant', restaurantName) + kv('Plan', `${planName} (Annual)`) + kv('Expires', expiresAt) + kv('Status', daysLeft > 0 ? `Expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Expired today'))}
      ${renewUrl ? button('Renew subscription', renewUrl) : ''}
      ${note('Renew before the expiry date to avoid any interruption to your service.')}
    `, `${restaurantName} subscription expires ${when}`),
    text: `Subscription expiring soon\n\nHi ${recipientName},\n\n${restaurantName} is on the ${planName} annual plan and expires ${when} (${expiresAt}).\n${renewUrl ? `\nRenew: ${renewUrl}\n` : ''}\nRenew before the expiry date to avoid interruption.`,
  };
}

/** Annual subscription has fully expired. */
export function subscriptionExpiredEmail(opts: {
  recipientName: string;
  restaurantName: string;
  planName: string;
  expiredAt: string;
  renewUrl?: string;
  toSuperAdmin?: boolean;
}): { subject: string; html: string; text: string } {
  const { recipientName, restaurantName, planName, expiredAt, renewUrl, toSuperAdmin } = opts;
  const subject = toSuperAdmin
    ? `${BRAND_NAME}: ${restaurantName} subscription has expired`
    : `${BRAND_NAME}: Your subscription has expired`;
  return {
    subject,
    html: wrap('Subscription expired', `
      ${intro(recipientName,
        toSuperAdmin
          ? `The annual subscription for <strong>${escapeHtml(restaurantName)}</strong> (${escapeHtml(planName)}) expired on <strong>${escapeHtml(expiredAt)}</strong>.`
          : `Your annual <strong>${escapeHtml(planName)}</strong> plan expired on <strong>${escapeHtml(expiredAt)}</strong>.`
      )}
      ${panel(kv('Restaurant', restaurantName) + kv('Plan', `${planName} (Annual)`) + kv('Expired', expiredAt))}
      ${renewUrl ? button('Renew now', renewUrl) : ''}
      ${note('Renew to restore full access to your account.')}
    `, `${restaurantName} subscription expired`),
    text: `Subscription expired\n\nHi ${recipientName},\n\nThe ${planName} annual plan for ${restaurantName} expired on ${expiredAt}.\n${renewUrl ? `\nRenew: ${renewUrl}\n` : ''}`,
  };
}

/** Sent to super admins when a support conversation needs a human. */
export function supportEscalationEmail(opts: {
  adminName: string;
  customerName: string;
  restaurantName: string;
  subjectLine: string;
  category: string;
  conversationUrl: string;
}): { subject: string; html: string; text: string } {
  const { adminName, customerName, restaurantName, subjectLine, category, conversationUrl } = opts;
  const subject = `${BRAND_NAME}: Human support requested by ${customerName}`;
  return {
    subject,
    html: wrap('Human support requested', `
      ${intro(adminName,
        `<strong>${escapeHtml(customerName)}</strong> (${escapeHtml(restaurantName)}) finished with the chatbot and requested <strong>human intervention</strong>.`
      )}
      ${panel(kv('Customer', customerName) + kv('Restaurant', restaurantName) + kv('Subject', subjectLine) + kv('Category', category))}
      ${button('Open conversation', conversationUrl)}
      ${note('The customer is waiting in the support chat. Replying marks the chat as human-assisted.')}
    `, `${customerName} requested human support`),
    text: `Human support requested\n\nHi ${adminName},\n\n${customerName} (${restaurantName}) requested human intervention.\nSubject: ${subjectLine}\nCategory: ${category}\n\nOpen: ${conversationUrl}`,
  };
}

/** Sent to super admins when API rate limiting trips. */
export function rateLimitAlertEmail(opts: {
  adminName: string;
  ip: string;
  path: string;
  count: number;
  windowSeconds: number;
}): { subject: string; html: string; text: string } {
  const { adminName, ip, path, count, windowSeconds } = opts;
  const subject = `${BRAND_NAME}: Rate limiting triggered (${count} requests)`;
  return {
    subject,
    html: wrap('Rate limiting triggered', `
      ${intro(adminName,
        `The API rate limiter blocked repeated requests to protect platform stability.`
      )}
      ${panel(kv('Client IP', ip) + kv('Endpoint', path) + kv('Requests blocked', String(count)) + kv('Window', `${windowSeconds}s`))}
      ${note('Repeated events from the same client may indicate abuse or a misbehaving integration.')}
    `, `Rate limit hit: ${count} blocked requests from ${ip}`),
    text: `Rate limiting triggered\n\nHi ${adminName},\n\nIP: ${ip}\nEndpoint: ${path}\nBlocked: ${count} requests in ${windowSeconds}s.\n\nRepeated events may indicate abuse or a misbehaving integration.`,
  };
}

/** Generic test/notification email used by the super-admin "Send test" action. */
export function testNotificationEmail(opts: {
  adminName: string;
  title?: string;
  message?: string;
}): { subject: string; html: string; text: string } {
  const { adminName, title, message } = opts;
  const t = title || 'Test notification';
  const m = message || 'This is a test notification from the KROWN POS super admin dashboard. If you received it, email delivery is working correctly.';
  const subject = `${BRAND_NAME}: ${t}`;
  return {
    subject,
    html: wrap(t, `
      ${intro(adminName, escapeHtml(m))}
      ${panel(kv('Source', 'Super Admin Dashboard') + kv('Sent', new Date().toUTCString()))}
      ${note('You can send another test at any time from the Notifications tab.')}
    `, m),
    text: `${t}\n\nHi ${adminName},\n\n${m}\n\nSource: Super Admin Dashboard`,
  };
}
