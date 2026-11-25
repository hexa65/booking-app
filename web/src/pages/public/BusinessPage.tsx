import { Link, useParams } from "react-router";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/ui";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePublicBusiness } from "../../hooks/queries";
import { errorMessage, errorStatus } from "../../lib/errors";
import { formatDuration, formatNaira } from "../../lib/format";

export function BusinessPage() {
  const { slug = "" } = useParams();
  const q = usePublicBusiness(slug);
  useDocumentTitle(q.data?.business.name ?? "Book a time");

  if (q.isPending) return <ListSkeleton rows={4} />;
  if (q.isError) {
    if (errorStatus(q.error) === 404) return <EmptyState title="We could not find this business">Check the link the shop gave you, or ask them to send it again.</EmptyState>;
    return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  }
  const { business, services } = q.data;
  return (
    <div className="pb-28">
      <h1 className="mb-1">{business.name}</h1>
      <p className="mb-6 text-moss">Pick a service, then a time that suits you.</p>
      {services.length === 0 ? <EmptyState title="No services yet">This shop has not added any services. Please check back soon.</EmptyState> : (
        <ul className="flex flex-col gap-3">
          {services.map((s) => (
            <li key={s.id}>
              <Link to={`/b/${slug}/book?service=${s.id}`} className="flex min-h-16 items-center justify-between gap-3 border-2 border-ink bg-paper p-4">
                <span><span className="block font-display text-xl font-bold">{s.name}</span><span className="text-moss">{formatDuration(s.durationMinutes)}</span></span>
                <span className="font-display text-xl font-bold">{formatNaira(s.priceMinor)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6">Already at the shop? <Link className="font-bold text-bottle underline" to={`/b/${slug}/queue`}>Join the queue</Link></p>
      {services.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-ink bg-chalk p-3">
          <Link to={`/b/${slug}/book`} className="mx-auto flex min-h-12 max-w-xl items-center justify-center bg-bottle px-5 font-display text-lg font-bold text-white">Book a time</Link>
        </div>
      ) : null}
    </div>
  );
}
