import { SITE_COPY } from "../lib/site-copy";

export default function StatusBar() {
  const { shell } = SITE_COPY;
  return (
    <div className="statusbar" data-pagefind-ignore>
      <span className="sb-seg">
        <span className="sb-live" aria-hidden="true">▸</span>
        <span>{shell.statusLeft}</span>
      </span>
      <span className="sb-seg">
        <span className="sb-dot" aria-hidden="true">//</span>
        <span>{shell.statusRight}</span>
      </span>
    </div>
  );
}
