import { useState, type FormEvent } from 'react';
import type { Api } from '../data/api.ts';

export function Login({ api, alEntrar }: { api: Api; alEntrar: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.entrar(email, password);
      alEntrar(email);
    } catch (err) {
      setError((err as Error).message === 'Invalid login credentials' ? 'Wrong email or password.' : (err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="centro">
      <form className="tarjeta login" onSubmit={enviar}>
        <h1>Moche Verde</h1>
        <p className="tenue">Festival CRM</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={enviando}>{enviando ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
