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
  colName: { width: 110 },
  colPackage: { width: 80 },
  colInvoice: { width: 85 },
  colAmount: { width: 75, textAlign: "right" },
  colStatus: { width: 60, textAlign: "center" },
  colDate: { width: 70 },
  colCollector: { width: 75 },
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
  summaryText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
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

interface DetailRow {
  customerName: string;
  packageName: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  paymentDate: string | null;
  collectorName: string | null;
}

interface DetailData {
  appName: string;
  bumdesAddress: string;
  period: string;
  rows: DetailRow[];
  summary: {
    total: number;
    paid: number;
    unpaid: number;
  };
}

function formatRupiahPdf(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function formatDatePdf(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

export function RekapTagihanDetailDocument({ data }: { data: DetailData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.appName}>{data.appName}</Text>
          <Text style={styles.appAddress}>{data.bumdesAddress}</Text>
        </View>

        <Text style={styles.title}>Detail Tagihan - {formatPeriod(data.period)}</Text>
        <Text style={styles.period}>
          Total: {data.summary.total} | Lunas: {data.summary.paid} | Belum Bayar: {data.summary.unpaid}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colNo]}>No</Text>
            <Text style={[styles.headerText, styles.colName]}>Pelanggan</Text>
            <Text style={[styles.headerText, styles.colPackage]}>Paket</Text>
            <Text style={[styles.headerText, styles.colInvoice]}>No. Invoice</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Jumlah</Text>
            <Text style={[styles.headerText, styles.colStatus]}>Status</Text>
            <Text style={[styles.headerText, styles.colDate]}>Tgl Bayar</Text>
            <Text style={[styles.headerText, styles.colCollector]}>Collector</Text>
          </View>

          {data.rows.map((row, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellText, styles.colNo]}>{index + 1}</Text>
              <Text style={[styles.cellText, styles.colName]}>{row.customerName}</Text>
              <Text style={[styles.cellText, styles.colPackage]}>{row.packageName}</Text>
              <Text style={[styles.cellText, styles.colInvoice]}>{row.invoiceNumber}</Text>
              <Text style={[styles.cellText, styles.colAmount]}>{formatRupiahPdf(row.amount)}</Text>
              <Text style={[row.status === "lunas" ? styles.cellGreen : styles.cellRed, styles.colStatus]}>
                {row.status === "lunas" ? "Lunas" : "Belum Bayar"}
              </Text>
              <Text style={[styles.cellText, styles.colDate]}>{row.paymentDate ? formatDatePdf(row.paymentDate) : "-"}</Text>
              <Text style={[styles.cellText, styles.colCollector]}>{row.collectorName || "-"}</Text>
            </View>
          ))}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              Total: {data.rows.length} pelanggan | Lunas: {data.summary.paid} | Belum Bayar: {data.summary.unpaid}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{data.appName}</Text>
          <Text style={styles.footerText}>Dicetak: {new Date().toLocaleDateString("id-ID")}</Text>
        </View>
      </Page>
    </Document>
  );
}
