const ARCHWAY = String.raw`
                 .-~~~~~~~~~~~~~~~~~~~~~-.
              .-'                         '-.
            .'        .-~~~~~~~~~~~-.        '.
           /        .'               '.        \
          |        /                   \        |
          |       |     .-~~~~~~~-.     |       |
          |       |    /           \    |       |
          |       |   |             |   |       |
          |       |   |             |   |       |
          |       |   |             |   |       |
      ____|_______|___|_____________|___|_______|____
     /___________________________________________ ___\
    /_______________________________________________ _\
`;

/**
 * Monochrome classical archway used as a section divider above the footer.
 * Decorative only, so it is hidden from assistive technology.
 */
export function AsciiArt({ className = "" }: { className?: string }) {
  return (
    <pre
      aria-hidden
      className={`text-emerald-500/30 font-mono text-[10px] leading-none whitespace-pre select-none sm:text-xs ${className}`}
    >
      {ARCHWAY}
    </pre>
  );
}

export default AsciiArt;
