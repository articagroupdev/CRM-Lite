import { sendEmail } from './email';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'articagroup1@gmail.com';

function baseHtml(title: string, bodyHtml: string, date: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;margin:0;padding:32px 0;}
  .wrap{max-width:520px;margin:0 auto;}
  .card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);}
  .hdr{background:#011b6a;padding:22px 28px;}
  .hdr p{margin:0;color:#fff;font-size:15px;font-weight:700;}
  .hdr span{color:rgba(255,255,255,0.5);font-size:11px;}
  .body{padding:28px;}
  .body h3{color:#011b6a;font-size:17px;margin:0 0 16px;}
  .row{display:flex;gap:8px;margin-bottom:10px;}
  .lbl{color:#94a3b8;font-size:13px;min-width:130px;flex-shrink:0;}
  .val{color:#1e293b;font-size:13px;font-weight:500;word-break:break-all;}
  .meta{background:#f8fafc;border-radius:8px;padding:12px 16px;margin-top:16px;border:1px solid #e2e8f0;}
  .meta p{color:#94a3b8;font-size:11px;margin:0;}
  .ftr{padding:16px 28px;border-top:1px solid #f1f5f9;text-align:center;}
  .ftr p{color:#94a3b8;font-size:11px;margin:0;}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hdr">
      <p>CRM Lite</p>
      <span>Notificación administrativa</span>
    </div>
    <div class="body">
      <h3>${title}</h3>
      ${bodyHtml}
      <div class="meta"><p>Fecha y hora: ${date}</p></div>
    </div>
    <div class="ftr"><p>Generado automáticamente · CRM Lite by Artica Group</p></div>
  </div>
</div>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `<div class="row"><span class="lbl">${label}</span><span class="val">${value}</span></div>`;
}

export async function notifyAdminUserRegistered(user: {
  name: string;
  email: string;
  id: string;
}) {
  const date = new Date().toLocaleString('es-ES', { timeZone: 'America/Caracas', dateStyle: 'full', timeStyle: 'short' });
  const body = [
    row('Nombre', user.name),
    row('Email', user.email),
    row('ID', user.id),
    row('Rol asignado', 'TRAFIKER'),
    `<p style="color:#475569;font-size:13px;margin-top:12px;">El usuario completó el registro y verificó su correo electrónico.</p>`,
  ].join('');
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[CRM Lite] Nuevo usuario registrado: ${user.name}`,
    html: baseHtml('Nuevo Usuario Registrado', body, date),
  });
}

export async function notifyAdminUserDeleted(
  deleted: { name: string; email: string; id: string },
  deletedByName: string,
  permanent: boolean
) {
  const date = new Date().toLocaleString('es-ES', { timeZone: 'America/Caracas', dateStyle: 'full', timeStyle: 'short' });
  const action = permanent ? 'eliminado permanentemente de la base de datos' : 'movido a la papelera (eliminación suave)';
  const body = [
    row('Usuario', deleted.name),
    row('Email', deleted.email),
    row('ID', deleted.id),
    row('Acción', action),
    row('Ejecutado por', deletedByName),
  ].join('');
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[CRM Lite] Usuario ${permanent ? 'eliminado' : 'en papelera'}: ${deleted.name}`,
    html: baseHtml(permanent ? 'Usuario Eliminado Permanentemente' : 'Usuario Movido a Papelera', body, date),
  });
}

export async function notifyAdminRoleChanged(
  user: { name: string; email: string },
  oldRole: string,
  newRole: string,
  changedByName: string
) {
  const date = new Date().toLocaleString('es-ES', { timeZone: 'America/Caracas', dateStyle: 'full', timeStyle: 'short' });
  const body = [
    row('Usuario', user.name),
    row('Email', user.email),
    row('Rol anterior', oldRole),
    row('Rol nuevo', newRole),
    row('Cambiado por', changedByName),
  ].join('');
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[CRM Lite] Rol modificado: ${user.name} → ${newRole}`,
    html: baseHtml('Rol de Usuario Modificado', body, date),
  });
}

export async function notifyAdminApiKeyChanged(keyName: string, changedByName: string) {
  const date = new Date().toLocaleString('es-ES', { timeZone: 'America/Caracas', dateStyle: 'full', timeStyle: 'short' });
  const body = [
    row('Clave modificada', keyName),
    row('Modificado por', changedByName),
  ].join('');
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[CRM Lite] Configuración de API modificada: ${keyName}`,
    html: baseHtml('Clave API Modificada', body, date),
  });
}

export function verificationEmailHtml(name: string, code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;margin:0;padding:40px 0;}
  .wrap{max-width:460px;margin:0 auto;}
  .card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);}
  .hdr{background:#011b6a;padding:28px 32px;text-align:center;}
  .hdr p{margin:0;color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.3px;}
  .hdr span{color:rgba(255,255,255,0.45);font-size:11px;}
  .body{padding:36px 32px;text-align:center;}
  .body h2{color:#011b6a;font-size:20px;margin:0 0 10px;}
  .body p{color:#64748b;font-size:14px;line-height:1.65;margin:0 0 24px;}
  .code{font-size:44px;font-weight:900;letter-spacing:12px;color:#011b6a;background:#eef2ff;padding:22px 28px;border-radius:12px;display:inline-block;font-family:'Courier New',monospace;margin-bottom:8px;}
  .expiry{color:#94a3b8;font-size:12px;margin-top:8px!important;}
  .ftr{background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;}
  .ftr p{color:#94a3b8;font-size:11px;margin:0;}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hdr">
      <p>CRM Lite</p>
      <span>by Artica Group</span>
    </div>
    <div class="body">
      <h2>Verifica tu cuenta</h2>
      <p>Hola <strong>${name}</strong>, ingresa este código para confirmar tu registro:</p>
      <div class="code">${code}</div>
      <p class="expiry">Este código expira en <strong>15 minutos</strong>.</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px!important;">Si no creaste una cuenta en CRM Lite, ignora este mensaje.</p>
    </div>
    <div class="ftr"><p>CRM Lite · Artica Group · No responder este correo</p></div>
  </div>
</div>
</body>
</html>`;
}
