import { Link } from "react-router";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <main id="main" className="mx-auto max-w-xl p-6">
      <h1 className="mb-2">We could not find that page</h1>
      <p className="mb-4 text-moss">The link may be old or mistyped. If you wanted to book a haircut, ask the shop for their booking link.</p>
      <Link to="/login" className="font-bold text-bottle underline">Owner log in</Link>
    </main>
  );
}
