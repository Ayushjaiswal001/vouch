import HomeTabs from "@/app/search/HomeTabs";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Find open-source tools you can trust
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-gray-600">
          VOUCH ranks open-source projects by safety, maintenance, popularity, and
          how lightweight they are — search directly, or ask the AI to recommend and
          compare for your exact need.
        </p>
      </section>
      <HomeTabs />
    </div>
  );
}
