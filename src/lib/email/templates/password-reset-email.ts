interface PasswordResetEmailProps {
  recipientName: string;
  resetUrl: string;
}

/** The Forgot password email: one button to the reset page, valid for an hour. */
export function renderPasswordResetEmail(p: PasswordResetEmailProps): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600&display=swap" />
  <title>Reset your Car Capital password</title>
</head>
<body style="margin:0;padding:40px 16px;background:#f9fafb;font-family:Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">

    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:18px;font-weight:600;color:#111827;">Car Capital</span>
    </div>

    <div style="background:#fff;border-radius:10px;padding:40px;border:1px solid #e5e7eb;">
      <h1 style="font-size:24px;font-weight:600;color:#111827;line-height:1.2;margin:0 0 20px;">
        Reset your password
      </h1>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 14px;">
        Hi ${esc(p.recipientName)},
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 28px;">
        Someone asked to reset the password for your Car Capital account.
        Choose a new one with the button below. The link works once, for an hour.
      </p>
      <a href="${esc(p.resetUrl)}"
         style="display:inline-block;background:#111827;color:#fff;border-radius:8px;padding:14px 28px;font-size:15px;font-weight:600;text-decoration:none;text-align:center;margin-bottom:24px;">
        Choose a new password
      </a>
      <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:0;">
        If you didn&rsquo;t ask for this, ignore this email: your password stays as it is.
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;" />
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
      Car Capital UK &middot; Dealership Management
    </p>
  </div>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
