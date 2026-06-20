import SearchClient from "@/app/search/SearchClient";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Find open-source tools you can trust
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-gray-600">
          VOUCH ranks open-source projects by safety, maintenance, popularity, and
          how lightweight they are — so you adopt the right one, not just the
          most-starred one.
        </p>
      </section>
      <SearchClient />
    </div>
  );
}
