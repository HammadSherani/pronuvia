import Link from "next/link";

export const metadata = { title: "Unauthorized – Pronuvia" };

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#9ca3a0] flex items-center justify-center p-4">
      <div className="bg-[#f7f8f9] border-2 border-[#5BB8D4] rounded-xl shadow-2xl p-12 flex flex-col items-center max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Access Denied
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          You do not have permission to view this page.
        </p>
        <Link
          href="/login"
          className="bg-[#3DBFA4] hover:bg-[#35ab93] text-white font-semibold px-8 py-3 rounded-md text-sm transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
