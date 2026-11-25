import { useParams } from "react-router";
import { ErrorState, Skeleton } from "../../components/ui/ui";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useQueueStatus } from "../../hooks/queries";
import { errorMessage, errorStatus } from "../../lib/errors";
import { ordinal } from "../../lib/format";

export function QueueStatusPage() {
  const { token = "" } = useParams();
  const q = useQueueStatus(token);
  useDocumentTitle("Your place in the queue");

  if (q.isPending) return <Skeleton className="h-48 w-full" />;
  if (q.isError) {
    return errorStatus(q.error) === 404
      ? <ErrorState message="We could not find your place in the queue. Open the link you were given." />
      : <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  }
  const s = q.data;
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <h1>{s.businessName}</h1>
      {s.status === "waiting" && s.position !== null ? (
        <article className="border-2 border-ink bg-paper p-5">
          <p className="text-lg">Hello {s.name}, you are</p>
          <p className="font-display text-7xl font-bold leading-none">{ordinal(s.position)}</p>
          <p className="mt-2 text-lg">{s.position === 1 ? "You are next." : `in the queue for ${s.serviceName}.`}</p>
          {s.waitMinutes !== null ? <p className="mt-1 font-semibold">{s.waitMinutes === 0 ? "A chair is free now." : `About ${s.waitMinutes} minutes.`}</p> : <p className="mt-1 text-moss">The shop has not set up its chairs yet, so we cannot guess the wait.</p>}
        </article>
      ) : null}
      {s.status === "in_service" ? <article className="border-2 border-bottle bg-paper p-5"><p className="font-display text-3xl font-bold">It is your turn</p><p>Please go to your chair, {s.name}.</p></article> : null}
      {s.status === "done" ? <p className="border-2 border-ink bg-paper p-5">All done. Thank you for visiting {s.businessName}.</p> : null}
      {s.status === "left" ? <p className="border-2 border-ink bg-paper p-5">You were removed from the queue. Ask the shop if you want to join again.</p> : null}
      <p className="text-moss">This page updates by itself every few seconds.</p>
    </div>
  );
}
