import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: "column",
  },
  appName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
  },
  appAddress: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 4,
    maxWidth: 250,
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    color: "#6b7280",
  },
  value: {
    flex: 1,
    color: "#1f2937",
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    padding: 8,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableCol1: {
    flex: 3,
  },
  tableCol2: {
    flex: 1,
    textAlign: "right",
  },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#374151",
  },
  totalRow: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#eff6ff",
  },
  totalLabel: {
    flex: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  totalValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#2563eb",
  },
  statusBadge: {
    marginTop: 15,
    padding: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusLunas: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusBelumBayar: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
  },
  statusText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaCol: {
    flex: 1,
  },
});

interface InvoiceData {
  invoiceNumber: string;
  billPeriod: string;
  dueDate: string;
  amount: number;
  status: string;
  billType?: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string | null;
  packageName: string;
  packageSpeed: string;
  appName: string;
  bumdesAddress: string;
  invoiceFooterText: string | null;
}

function formatRupiahPdf(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function formatDatePdf(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getBatasAkhirPdf(dueDateStr: string): string {
  const parts = dueDateStr.split("-");
  if (parts.length !== 3) return dueDateStr;
  const y = Number(parts[0]), m = Number(parts[1]);
  if (Number.isNaN(y) || Number.isNaN(m)) return dueDateStr;
  const d = new Date(y, m - 1, 27); // tgl 27 bulan jatuh tempo
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.appName}>{data.appName}</Text>
            <Text style={styles.appAddress}>{data.bumdesAddress}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.sectionTitle}>Tagihan Untuk</Text>
            <Text style={{ color: "#1f2937", fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
              {data.customerName}
            </Text>
            <Text style={{ color: "#6b7280", marginBottom: 2 }}>{data.customerAddress}</Text>
            <Text style={{ color: "#6b7280", marginBottom: 2 }}>{data.customerPhone}</Text>
            {data.customerEmail && (
              <Text style={{ color: "#6b7280" }}>{data.customerEmail}</Text>
            )}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.sectionTitle}>Detail Invoice</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Periode</Text>
              <Text style={styles.value}>{formatDatePdf(data.billPeriod)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jatuh Tempo</Text>
              <Text style={styles.value}>{formatDatePdf(data.dueDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Batas Akhir</Text>
              <Text style={styles.value}>{getBatasAkhirPdf(data.dueDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>
                {data.status === "lunas" ? "LUNAS" : "BELUM BAYAR"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.tableCol1]}>Deskripsi</Text>
              <Text style={[styles.tableHeaderText, styles.tableCol2]}>Jumlah</Text>
            </View>
            <View style={styles.tableRow}>
              <View style={styles.tableCol1}>
                <Text style={{ color: "#1f2937", fontFamily: "Helvetica-Bold" }}>
                  {data.billType === "instalasi"
                    ? "Biaya Pemasangan/Instalasi"
                    : `Layanan Internet - ${data.packageName}`}
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 9, marginTop: 2 }}>
                  {data.billType === "instalasi"
                    ? `Paket: ${data.packageName} | ${data.packageSpeed}`
                    : `Kecepatan: ${data.packageSpeed} | Periode: ${formatDatePdf(data.billPeriod)}`}
                </Text>
              </View>
              <Text style={[styles.tableCol2, { color: "#1f2937" }]}>
                {formatRupiahPdf(data.amount)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatRupiahPdf(data.amount)}</Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            data.status === "lunas" ? styles.statusLunas : styles.statusBelumBayar,
          ]}
        >
          <Text style={styles.statusText}>
            {data.status === "lunas" ? "LUNAS" : "BELUM BAYAR"}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {data.invoiceFooterText || `${data.appName} - ${data.bumdesAddress}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
