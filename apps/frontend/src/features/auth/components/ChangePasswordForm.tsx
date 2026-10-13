import { useState, type FormEvent } from 'react';
import { changePassword } from '../api/auth.api';

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setSuccess(false);
    if (password !== confirmation) { setError('Las nuevas contraseñas no coinciden.'); return; }
    setSaving(true);
    try {
      await changePassword(current, password);
      setCurrent(''); setPassword(''); setConfirmation(''); setVisible(false); setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.');
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="password-change-form" aria-labelledby="password-change-title">
    <h3 id="password-change-title">Cambiar contraseña</h3>
    <p className="form-help">Confirma tu contraseña actual y elige una nueva de al menos 8 caracteres.</p>
    <label className="field" htmlFor="password-current">Contraseña actual
      <input id="password-current" type={visible ? 'text' : 'password'} autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required minLength={8} maxLength={128} disabled={saving} />
    </label>
    <label className="field" htmlFor="password-new">Nueva contraseña
      <input id="password-new" type={visible ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={72} disabled={saving} />
    </label>
    <label className="field" htmlFor="password-confirm">Confirmar nueva contraseña
      <input id="password-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required minLength={8} maxLength={72} disabled={saving} />
    </label>
    <div className="password-actions">
      <button type="button" className="secondary" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</button>
      <button type="submit" className="primary" disabled={saving}>{saving ? 'Actualizando…' : 'Cambiar contraseña'}</button>
    </div>
    {error && <p role="alert" className="error-text">{error}</p>}
    {success && <p role="status">Contraseña actualizada. Usa la nueva contraseña en tu próximo inicio de sesión.</p>}
  </form>;
}
