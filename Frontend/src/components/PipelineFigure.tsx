import { useState } from "react";

interface PipelineFigureProps {
  /** Path inside /public, e.g. "/figures/aapl/correlation_map.png". */
  src?: string;
  alt: string;
  caption: React.ReactNode;
  label: string;
  aspect?: "square" | "wide" | "video";
}

const aspectClass = {
  square: "aspect-square",
  wide: "aspect-[21/9]",
  video: "aspect-video",
};

export function PipelineFigure({
  src,
  alt,
  caption,
  label,
  aspect = "video",
}: PipelineFigureProps) {
  const [errored, setErrored] = useState(false);
  const showPlaceholder = !src || errored;
  const finalSrc =
    src ??
    `https://picsum.photos/seed/${encodeURIComponent(label)}/1200/700?grayscale`;

  return (
    <figure className="flex flex-col gap-4">
      <div className="bg-surface p-2 border border-hairline relative">
        {showPlaceholder && src ? (
          <div
            className={`w-full ${aspectClass[aspect]} flex flex-col items-center justify-center bg-paper text-ink-muted text-center px-6`}
          >
            <div className="font-mono text-[10px] uppercase tracking-widest mb-2">
              {label} · pending
            </div>
            <div className="text-sm max-w-[40ch]">
              Image not found at{" "}
              <code className="font-mono text-xs">{src}</code>
            </div>
            <div className="text-xs mt-2 opacity-70">
              Generate it with the Python pipeline and copy to <code>public/figures/</code>.
            </div>
          </div>
        ) : (
          <img
            src={finalSrc}
            loading="lazy"
            alt={alt}
            onError={() => setErrored(true)}
            className={`w-full ${aspectClass[aspect]} object-cover grayscale contrast-[1.25] mix-blend-multiply opacity-90`}
          />
        )}
      </div>
      <figcaption className="text-sm text-ink-muted leading-relaxed">
        <strong className="text-ink font-medium">{label}:</strong> {caption}
      </figcaption>
    </figure>
  );
}
