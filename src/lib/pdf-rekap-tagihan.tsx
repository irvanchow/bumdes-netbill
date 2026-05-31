import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 12,
  },
  appName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
  },
  appAddress: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 3,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
    marginTop: 15,
    marginBottom: 4,
  },
  period: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 15,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    padding: 6,
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  colNo: { width: 25 },
  colPeriod: { width: 90 },
  colCount: { width: 50, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  headerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#374151",
  },
  cellText: {
    fontSize: 8,
    color: "#1f2937",
  },
  cellGreen: {
    fontSize: 8,
    color: "#059669",
  },
  cellRed: {
    fontSize: 8,
    color: "#dc2626",
  },
  summaryRow: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#eff6ff",
  },
  summaryLabel: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  summaryValue: {
    width: 90,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#2563eb",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
});

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface RekapRow {
  period: string;
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

interface RekapData {
  appName: string;
  bumdesAddress: string;
  year: string;
  rows: RekapRow[];
  summary: {
    totalBills: number;
    paidBills: number;
    unpaidBills: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
    collectionRate: number;
  };
}

function formatRupiahPdf(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

export function RekapTagihanDocument({ data }: { data: RekapData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.appName}>{data.appName}</Text>
          <Text style={styles.appAddress}>{data.bumdesAddress}</Text>
        </View>

        <Text style={styles.title}>Laporan Rekap Tagihan</Text>
        <Text style={styles.period}>Tahun: {data.year}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colNo]}>No</Text>
            <Text style={[styles.headerText, styles.colPeriod]}>Periode</Text>
            <Text style={[styles.headerText, styles.colCount]}>Total</Text>
            <Text style={[styles.headerText, styles.colCount]}>Lunas</Text>
            <Text style={[styles.headerText, styles.colCount]}>Belum</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Nominal Total</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Terbayar</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Belum Terbayar</Text>
          </View>

          {data.rows.map((row, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellText, styles.colNo]}>{index + 1}</Text>
              <Text style={[styles.cellText, styles.colPeriod]}>{formatPeriod(row.period)}</Text>
              <Text style={[styles.cellText, styles.colCount]}>{row.totalBills}</Text>
              <Text style={[styles.cellGreen, styles.colCount]}>{row.paidBills}</Text>
              <Text style={[styles.cellRed, styles.colCount]}>{row.unpaidBills}</Text>
              <Text style={[styles.cellText, styles.colAmount]}>{formatRupiahPdf(row.totalAmount)}</Text>
              <Text style={[styles.cellGreen, styles.colAmount]}>{formatRupiahPdf(row.paidAmount)}</Text>
              <Text style={[styles.cellRed, styles.colAmount]}>{formatRupiahPdf(row.unpaidAmount)}</Text>
            </View>
          ))}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.colNo]}></Text>
            <Text style={[styles.summaryLabel, styles.colPeriod]}>Total</Text>
            <Text style={[styles.summaryValue, styles.colCount]}>{data.summary.totalBills}</Text>
            <Text style={[styles.summaryValue, styles.colCount, { color: "#059669" }]}>{data.summary.paidBills}</Text>
            <Text style={[styles.summaryValue, styles.colCount, { color: "#dc2626" }]}>{data.summary.unpaidBills}</Text>
            <Text style={[styles.summaryValue, styles.colAmount]}>{formatRupiahPdf(data.summary.totalAmount)}</Text>
            <Text style={[styles.summaryValue, styles.colAmount, { color: "#059669" }]}>{formatRupiahPdf(data.summary.paidAmount)}</Text>
            <Text style={[styles.summaryValue, styles.colAmount, { color: "#dc2626" }]}>{formatRupiahPdf(data.summary.unpaidAmount)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 9, color: "#374151" }}>
            Tingkat Koleksi: {data.summary.collectionRate}%
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{data.appName}</Text>
          <Text style={styles.footerText}>Dicetak: {new Date().toLocaleDateString("id-ID")}</Text>
        </View>
      </Page>
    </Document>
  );
}
