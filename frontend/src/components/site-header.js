import Link from "next/link";

export default function SiteHeader({ staffEmail, staffRole }) {
  return (
    <header className="border-b border-[#e1e7df] bg-[#fbfcf9]">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#185c4b] text-sm font-bold tracking-tight text-white">
            BF
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight">BEAST Family First</span>
            <span className="block text-[10px] uppercase tracking-[0.17em] text-[#71817a]">
              Family support portal
            </span>
          </span>
        </Link>
        {staffEmail ? (
          <div className="flex items-center gap-3 text-right">
            <span className="hidden text-xs text-[#71817a] sm:block">
              <span className="block font-semibold text-[#18332e]">{staffEmail}</span>
              {staffRole}
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                className="rounded-xl border border-[#dce4dc] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f2f7f2]"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-xl border border-[#dce4dc] bg-white px-4 py-2.5 text-sm font-semibold no-underline hover:bg-[#f2f7f2]"
          >
            Staff sign in
          </Link>
        )}
      </div>
    </header>
  );
}
