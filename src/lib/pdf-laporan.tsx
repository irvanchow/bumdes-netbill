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
  colDate: { width: 70 },
  colCustomer: { flex: 1 },
  colInvoice: { width: 85 },
  colAmount: { width: 75, textAlign: "right" },
  colMethod: { width: 50, textAlign: "center" },
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
  summaryRow: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#eff6ff",
  },
  summaryLabel: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  summaryValue: {
    width: 75,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
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

interface PaymentRow {
  paymentDate: string;
  customerName: string;
  invoiceNumber: string;
  amountPaid: number;
  paymentMethod: string;
  collectorName: string;
}

interface LaporanData {
  appName: string;
  bumdesAddress: string;
  startDate: string;
  endDate: string;
  payments: PaymentRow[];
  totalAmount: number;
}

function formatRupiahPdf(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function formatDatePdf(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function LaporanDocument({ data }: { data: LaporanData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.appName}>{data.appName}</Text>
          <Text style={styles.appAddress}>{data.bumdesAddress}</Text>
        </View>

        <Text style={styles.title}>Laporan Pembayaran</Text>
        <Text style={styles.period}>
          Periode: {formatDatePdf(data.startDate)} - {formatDatePdf(data.endDate)}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colNo]}>No</Text>
            <Text style={[styles.headerText, styles.colDate]}>Tanggal</Text>
            <Text style={[styles.headerText, styles.colCustomer]}>Pelanggan</Text>
            <Text style={[styles.headerText, styles.colInvoice]}>No. Invoice</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Jumlah</Text>
            <Text style={[styles.headerText, styles.colMethod]}>Metode</Text>
            <Text style={[styles.headerText, styles.colCollector]}>Collector</Text>
          </View>

          {data.payments.map((payment, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellText, styles.colNo]}>{index + 1}</Text>
              <Text style={[styles.cellText, styles.colDate]}>{formatDatePdf(payment.paymentDate)}</Text>
              <Text style={[styles.cellText, styles.colCustomer]}>{payment.customerName}</Text>
              <Text style={[styles.cellText, styles.colInvoice]}>{payment.invoiceNumber}</Text>
              <Text style={[styles.cellText, styles.colAmount]}>{formatRupiahPdf(payment.amountPaid)}</Text>
              <Text style={[styles.cellText, styles.colMethod]}>{payment.paymentMethod}</Text>
              <Text style={[styles.cellText, styles.colCollector]}>{payment.collectorName}</Text>
            </View>
          ))}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total: {data.payments.length} transaksi</Text>
            <Text style={styles.summaryValue}>{formatRupiahPdf(data.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{data.appName}</Text>
          <Text style={styles.footerText}>Dicetak: {formatDatePdf(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
}
