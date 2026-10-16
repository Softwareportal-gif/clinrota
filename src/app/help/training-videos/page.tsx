import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

const INK = "#17153B";
const HIGHLIGHT = "#D63A74";

type Video = { title: string; description: string; embedUrl: string };

// Add real videos here as they're recorded — each section is its own
// array, currently empty. A video's embedUrl can be a YouTube/Vimeo share
// link or a direct video file URL; VideoEntry below handles either.
const COORDINATOR_VIDEOS: Video[] = [];
const SUPERVISOR_VIDEOS: Video[] = [];
const SUPER_ADMIN_VIDEOS: Video[] = [];

const SECTIONS: { title: string; videos: Video[] }[] = [
  { title: "For Program Coordinators", videos: COORDINATOR_VIDEOS },
  { title: "For Supervisors", videos: SUPERVISOR_VIDEOS },
  { title: "For Super Admins", videos: SUPER_ADMIN_VIDEOS },
];

function isEmbeddableUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com");
}

function VideoEntry({ video }: { video: Video }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      {isEmbeddableUrl(video.embedUrl) ? (
        <div className="aspect-video overflow-hidden rounded-lg">
          <iframe
            src={video.embedUrl}
            title={video.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <video controls src={video.embedUrl} className="aspect-video w-full rounded-lg bg-black" />
      )}
      <p className="mt-3 text-sm font-bold text-gray-900">{video.title}</p>
      <p className="mt-1 text-sm text-gray-600">{video.description}</p>
    </div>
  );
}

export default function TrainingVideosPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-4" style={{ backgroundColor: INK }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            aria-label="Praxxt home"
            className="flex w-fit items-center gap-2.5 transition hover:opacity-80"
          >
            <Wordmark size={24} tone="onDark" />
          </Link>
          <Link href="/help" className="text-sm font-semibold text-white/80 hover:text-white">
            ← Back to help
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: INK }}>
          Training videos
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Short walkthroughs of Praxxt&apos;s main workflows, organized by role.
        </p>

        <div className="mt-10 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2
                className="text-sm font-extrabold uppercase tracking-widest"
                style={{ color: HIGHLIGHT }}
              >
                {section.title}
              </h2>
              {section.videos.length === 0 ? (
                <p className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  Coming soon — we&apos;re recording walkthroughs for this section.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {section.videos.map((video) => (
                    <VideoEntry key={video.title} video={video} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
