import { posix } from "node:path";
import { load } from "cheerio";
import { unzipSync } from "fflate";

export interface EpubMeta {
  title: string;
  creators: string[];
  publisher: string;
  date: string;
  identifier: string;
}

export interface SpineItem {
  /** Path inside the zip, e.g. "OEBPS/ch06.html". */
  path: string;
  html: string;
}

export interface Epub {
  meta: EpubMeta;
  spine: SpineItem[];
  /** Read any file in the zip by its path. */
  file(path: string): Uint8Array | undefined;
}

const decoder = new TextDecoder("utf-8");

export function readEpub(bytes: Uint8Array): Epub {
  const files = unzipSync(bytes);
  const text = (path: string) => {
    const data = files[path];
    if (!data) throw new Error(`EPUB is missing ${path}`);
    return decoder.decode(data);
  };

  const container = load(text("META-INF/container.xml"), { xml: true });
  const opfPath = container("rootfile").attr("full-path");
  if (!opfPath) throw new Error("EPUB container.xml has no rootfile");
  const opfDir = posix.dirname(opfPath);

  const opf = load(text(opfPath), { xml: true });
  const meta: EpubMeta = {
    title: opf("dc\\:title").first().text().trim(),
    creators: opf("dc\\:creator")
      .map((_, el) => opf(el).text().trim())
      .get(),
    publisher: opf("dc\\:publisher").first().text().trim(),
    date: opf("dc\\:date").first().text().trim(),
    identifier: opf("dc\\:identifier").first().text().trim(),
  };

  const manifest = new Map<string, string>();
  opf("manifest > item").each((_, el) => {
    const id = opf(el).attr("id");
    const href = opf(el).attr("href");
    if (id && href) manifest.set(id, posix.join(opfDir, href));
  });

  const spine: SpineItem[] = [];
  opf("spine > itemref").each((_, el) => {
    const idref = opf(el).attr("idref");
    const path = idref ? manifest.get(idref) : undefined;
    if (!path) throw new Error(`Spine item ${idref} is not in the manifest`);
    spine.push({ path, html: text(path) });
  });

  return { meta, spine, file: (path) => files[path] };
}

/** Width and height of a PNG, read from its header. */
export function pngSize(data: Uint8Array): { width: number; height: number } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const isPng = view.getUint32(0) === 0x89504e47 && view.getUint32(12) === 0x49484452; // "IHDR"
  if (!isPng) throw new Error("Not a PNG file");
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
