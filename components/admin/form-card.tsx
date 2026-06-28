import Link from "next/link";

interface FormCardProps {
  title: string;
  backHref: string;
  children: React.ReactNode;
}

export function FormCard({ title, backHref, children }: FormCardProps) {
  return (
    <div className="max-w-xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-7">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-6">{title}</h2>
        {children}
      </div>
    </div>
  );
}
