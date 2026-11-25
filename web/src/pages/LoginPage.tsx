import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../app/AuthProvider";
import { Button, TextField } from "../components/ui/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { errorMessage } from "../lib/errors";

export default function LoginPage() {
  useDocumentTitle("Log in");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await login(email, password); navigate("/app"); }
    catch (err: unknown) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return (
    <div>
      <h1 className="mb-1">Log in to your shop</h1>
      <p className="mb-5 text-moss">New here? <Link className="font-bold text-bottle underline" to="/register">Create your shop</Link></p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <p role="alert" className="font-semibold text-magenta">Problem: {error}</p> : null}
        <Button type="submit" disabled={busy} block>{busy ? "Logging in" : "Log in"}</Button>
      </form>
    </div>
  );
}
