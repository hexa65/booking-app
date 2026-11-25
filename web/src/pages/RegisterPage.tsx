import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../app/AuthProvider";
import { Button, TextField } from "../components/ui/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { errorMessage } from "../lib/errors";

interface FormErrors { businessName?: string; email?: string; password?: string; }

export default function RegisterPage() {
  useDocumentTitle("Create your shop");
  const { register } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const next: FormErrors = {};
    if (businessName.trim().length < 2) next.businessName = "Enter your shop's name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next); setFormError(null);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try { await register({ businessName: businessName.trim(), email: email.trim(), password }); navigate("/app/setup"); }
    catch (err: unknown) { setFormError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return (
    <div>
      <h1 className="mb-1">Create your shop</h1>
      <p className="mb-5 text-moss">Already have a shop? <Link className="font-bold text-bottle underline" to="/login">Log in</Link></p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField label="Shop name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} error={errors.businessName} autoComplete="organization" />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters." autoComplete="new-password" />
        {formError ? <p role="alert" className="font-semibold text-magenta">Problem: {formError}</p> : null}
        <Button type="submit" disabled={busy} block>{busy ? "Creating your shop" : "Create my shop"}</Button>
      </form>
    </div>
  );
}
