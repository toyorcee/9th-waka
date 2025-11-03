export const buildDarkEmailTemplate = (title, message, code) => `
  <div style="background:#0B0B12;color:#E6E6F0;font-family:Inter,Segoe UI,Arial;padding:32px">
    <table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#11131F;border:1px solid #2A2D3A;border-radius:16px">
      <tr>
        <td style="padding:28px 28px 0 28px;text-align:center">
          ${(() => {
            const useCid =
              (process.env.EMAIL_USE_CID || "").toLowerCase() === "true";
            const cid = process.env.EMAIL_LOGO_CID || "brandLogo";
            const src = useCid
              ? `cid:${cid}`
              : process.env.EMAIL_LOGO_URL ||
                `${
                  process.env.SERVER_PUBLIC_URL || "http://localhost:3000"
                }/assets/Night-Waka.png`;
            return `<img src="${src}" alt="9thWaka" style="height:40px;display:block;margin:0 auto" />`;
          })()}
          <div style="margin-top:8px;font-size:13px;color:#AEB2C1">${title}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px 8px;color:#C9CDD9;font-size:14px;line-height:1.6">${message}</td>
      </tr>
      ${
        code
          ? `
      <tr>
        <td style="padding:8px 28px 28px;text-align:center">
          <div style="display:inline-block;background:#1A1E2E;border:1px solid #3C4160;color:#AB8BFF;border-radius:12px;padding:14px 18px;font-size:22px;letter-spacing:6px;font-weight:700">${code}</div>
          <div style="margin-top:10px;font-size:12px;color:#8D93A5">Code expires in 10 minutes</div>
        </td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding:0 28px 24px;color:#6F768D;font-size:12px;text-align:center">If you didn't request this, you can safely ignore this email.</td>
      </tr>
      <tr>
        <td style="padding:0 28px 24px;color:#6F768D;font-size:11px;text-align:center">${new Date().toLocaleString()}</td>
      </tr>
    </table>
  </div>`;
