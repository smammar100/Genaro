import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PDF_FONT, PDF_SEMIBOLD } from "./fonts";
import { variantLabel } from "@/lib/vehicle-variant";
import type { TodoItem, TodoStatus, Vehicle } from "@/lib/types";

// One cell style per column, shared by its heading and its rows, so the two
// always line up. Fixed columns don't grow or shrink; Description takes what
// is left.
const cell = { padding: 5, borderRight: "1pt solid #ccc", borderBottom: "1pt solid #ccc" };
const fixed = (width: number) => ({ ...cell, width, flexGrow: 0, flexShrink: 0 });

// Wrap at spaces only: split words ("Wolverhamp-ton") read badly in a table.
const wholeWords = (word: string) => [word];

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: PDF_FONT },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerText: { flex: 1, paddingRight: 16 },
  logo: { width: 140, height: 44, objectFit: "contain", objectPosition: "right" },
  h1: { fontSize: 18, fontWeight: PDF_SEMIBOLD, marginBottom: 4 },
  meta: { fontSize: 9, color: "#666", marginBottom: 12 },
  hr: { borderBottom: "1pt solid #ccc", marginVertical: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: PDF_SEMIBOLD,
    marginTop: 10,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 120, color: "#666" },
  value: { flex: 1 },
  table: { borderTop: "1pt solid #ccc", borderLeft: "1pt solid #ccc" },
  tr: { flexDirection: "row" },
  th: { fontWeight: PDF_SEMIBOLD, backgroundColor: "#eee" },
  colNum: { ...fixed(32), textAlign: "center" },
  colDescription: { ...cell, flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  colVendor: fixed(110),
  colStatus: fixed(80),
  colCost: { ...fixed(72), textAlign: "right" },
  empty: { ...cell, flexGrow: 1 },
  total: { marginTop: 10, textAlign: "right", fontSize: 11, fontWeight: PDF_SEMIBOLD },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
});

interface Props {
  vehicle: Vehicle;
  todos: TodoItem[];
  preparedBy: string;
  companyName: string;
  /** Vendor id → name lookup, so the Vendor column shows names not UUIDs. */
  vendorNames?: Record<string, string>;
  /** The company's full logo (public URL), top right. Left out when unset. */
  logoUrl?: string | null;
}

const STATUS_LABEL: Record<TodoStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Done",
  cancelled: "Cancelled",
};

function fmtGBP(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function JobCardTemplate({
  vehicle,
  todos,
  preparedBy,
  companyName,
  vendorNames,
  logoUrl,
}: Props) {
  const grandTotal = todos.reduce((s, t) => s + (t.cost ?? 0), 0);

  // Whoever picks up the printed sheet wants to see what is still outstanding,
  // so print in the order the work moves: pending, then in progress, then what
  // is already done. Cancelled sinks to the bottom — it is not work, and it
  // shouldn't sit between two jobs that are (GEN-114). Sort is stable, so the
  // caller's ordering still decides within a group.
  const STATUS_ORDER: Record<TodoStatus, number> = {
    pending: 0,
    in_progress: 1,
    completed: 2,
    cancelled: 3,
  };
  const orderedTodos = [...todos].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.h1}>{companyName} · Job Card</Text>
            <Text style={styles.meta}>
              Generated {new Date().toLocaleString("en-GB")} · Prepared by {preparedBy}
            </Text>
          </View>
          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
        </View>

        <Text style={styles.sectionTitle}>Vehicle</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{vehicle.registration}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Stock ID:</Text>
          <Text style={styles.value}>{vehicle.stockId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Make / Model:</Text>
          <Text style={styles.value}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Variant:</Text>
          <Text style={styles.value}>{variantLabel(vehicle)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mileage:</Text>
          <Text style={styles.value}>{vehicle.mileage.toLocaleString()} mi</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Colour / Fuel:</Text>
          <Text style={styles.value}>
            {vehicle.colour} · {vehicle.fuelType} · {vehicle.transmission}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Things to Do</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.colNum, styles.th]}>#</Text>
            <Text style={[styles.colDescription, styles.th]}>Description</Text>
            <Text style={[styles.colVendor, styles.th]}>Vendor</Text>
            <Text style={[styles.colStatus, styles.th]}>Status</Text>
            <Text style={[styles.colCost, styles.th]}>Cost</Text>
          </View>
          {orderedTodos.length === 0 ? (
            <View style={styles.tr}>
              <Text style={styles.empty}>No items recorded</Text>
            </View>
          ) : (
            orderedTodos.map((t) => (
              <View key={t.id} style={styles.tr} wrap={false}>
                <Text style={styles.colNum}>{t.serialNumber}</Text>
                <Text style={styles.colDescription} hyphenationCallback={wholeWords}>
                  {t.description}
                </Text>
                <Text style={styles.colVendor} hyphenationCallback={wholeWords}>
                  {(t.vendorId ? vendorNames?.[t.vendorId] : null) ?? "—"}
                </Text>
                <Text style={styles.colStatus}>{STATUS_LABEL[t.status]}</Text>
                <Text style={styles.colCost}>{fmtGBP(t.cost)}</Text>
              </View>
            ))
          )}
        </View>
        <Text style={styles.total}>Grand total: {fmtGBP(grandTotal)}</Text>

        <Text style={styles.sectionTitle}>Cost Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total Buying:</Text>
          <Text style={styles.value}>{fmtGBP(vehicle.totalBuyingPrice)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Stocking:</Text>
          <Text style={styles.value}>{fmtGBP(vehicle.stockingCharges)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Value Addition:</Text>
          <Text style={styles.value}>{fmtGBP(vehicle.valueAddition)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Warranty:</Text>
          <Text style={styles.value}>{fmtGBP(vehicle.warrantyCost)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Base Cost:</Text>
          <Text style={styles.value}>{fmtGBP(vehicle.baseCost)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Listing Price:</Text>
          <Text style={styles.value}>{fmtGBP(vehicle.listingPrice)}</Text>
        </View>

        <Text style={styles.footer}>{companyName} · Confidential</Text>
      </Page>
    </Document>
  );
}
