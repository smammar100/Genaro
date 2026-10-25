import { Font } from "@react-pdf/renderer";

/**
 * PDFs are set in Geist like the app, never the built-in Helvetica: regular
 * and semibold (the heaviest weight), each with its italic. The files are
 * served from public/fonts/geist (SIL OFL, from the geist package). PDFs are
 * built in the browser, so the paths resolve against the app's origin.
 */
export const PDF_FONT = "Geist";
export const PDF_SEMIBOLD = 600;

const GEIST = [
  { src: "/fonts/geist/Geist-Regular.ttf", fontWeight: 400 },
  { src: "/fonts/geist/Geist-Italic.ttf", fontWeight: 400, fontStyle: "italic" as const },
  { src: "/fonts/geist/Geist-SemiBold.ttf", fontWeight: PDF_SEMIBOLD },
  { src: "/fonts/geist/Geist-SemiBoldItalic.ttf", fontWeight: PDF_SEMIBOLD, fontStyle: "italic" as const },
];

// react-pdf hands any character the main font can't draw (a line break, for
// one) to a fallback family it always names "Helvetica". Clearing the
// built-in fonts and pointing that name at Geist keeps Helvetica out of every
// PDF, fallback included.
Font.clear();
Font.register({ family: PDF_FONT, fonts: GEIST });
Font.register({ family: "Helvetica", fonts: GEIST });

/**
 * Loads the fallback's faces. react-pdf loads only the families a style
 * names, so call this before building a PDF.
 */
export async function loadPdfFonts(): Promise<void> {
  await Promise.all(
    GEIST.map((f) =>
      Font.load({ fontFamily: "Helvetica", fontWeight: f.fontWeight, fontStyle: f.fontStyle ?? "normal" }),
    ),
  );
}
