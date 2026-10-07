export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
      <main className="flex flex-col items-center justify-center gap-12 text-center">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-black dark:text-white mb-4">
            abioladeyeye
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Choose a section to explore
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          <a
            href="https://design.abioladeyeye.com"
            className="flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg bg-black text-white hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-zinc-200 md:w-48"
          >
            Design
          </a>
          <a
            href="https://lab.abioladeyeye.com"
            className="flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg border-2 border-black text-black hover:bg-black hover:text-white transition-colors dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black md:w-48"
          >
            Lab
          </a>
        </div>
      </main>
    </div>
  );
}
