import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 10,
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
    marginTop: 12,
    marginBottom: 4,
  },
  period: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  // Summary cards
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
  },
  // Category cards
  catCard: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  catLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  catTotal: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  catSplit: {
    fontSize: 7,
    color: "#6b7280",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  // Table
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    padding: 5,
  },
  tableRow: {
    flexDirection: "row",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  colPeriod: { width: 90 },
  colAmount: { width: 80, textAlign: "right" },
  colShare: { width: 85, textAlign: "right" },
  headerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#374151",
  },
  cellText: {
    fontSize: 8,
    color: "#1f2937",
  },
  cellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
  },
  totalRow: {
    flexDirection: "row",
    padding: 6,
    backgroundColor: "#eff6ff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
});

interface Breakdown {
  total: number;
  isp: number;
  bumdesa: number;
}

interface MonthlyData {
  period: string;
  instalasi: Breakdown;
  fiberOptik: Breakdown;
  wirelessBroadband: Breakdown;
  totalIsp: number;
  totalBumdesa: number;
}

interface Summary {
  totalRevenue: number;
  totalIsp: number;
  totalBumdesa: number;
  instalasi: Breakdown;
  fiberOptik: Breakdown;
  wirelessBroadband: Breakdown;
}

interface ShareRevenueData {
  appName: string;
  bumdesAddress: string;
  startDate: string;
  endDate: string;
  data: MonthlyData[];
  summary: Summary;
}

function fmt(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (Number.isNaN(y)) return dateStr;
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m)) return period;
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function ShareRevenueDocument({ data }: { data: ShareRevenueData }) {
  const { summary } = data;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>{data.appName}</Text>
          <Text style={styles.appAddress}>{data.bumdesAddress}</Text>
        </View>

        <Text style={styles.title}>Laporan Share Revenue</Text>
        <Text style={styles.period}>
          Periode: {fmtDate(data.startDate)} - {fmtDate(data.endDate)}
        </Text>

        {/* Main Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Pendapatan</Text>
            <Text style={styles.summaryValue}>{fmt(summary.totalRevenue)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: "#bfdbfe" }]}>
            <Text style={styles.summaryLabel}>Bagi Hasil ISP</Text>
            <Text style={[styles.summaryValue, { color: "#2563eb" }]}>{fmt(summary.totalIsp)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: "#a7f3d0" }]}>
            <Text style={styles.summaryLabel}>Bagi Hasil BumDesa</Text>
            <Text style={[styles.summaryValue, { color: "#059669" }]}>{fmt(summary.totalBumdesa)}</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionTitle}>Rincian per Kategori</Text>
        <View style={styles.summaryRow}>
          <View style={styles.catCard}>
            <Text style={styles.catLabel}>Pendapatan dari Instalasi (80%/20%)</Text>
            <Text style={styles.catTotal}>{fmt(summary.instalasi.total)}</Text>
            <View style={styles.catSplit}>
              <Text>ISP: {fmt(summary.instalasi.isp)}</Text>
              <Text>BumDesa: {fmt(summary.instalasi.bumdesa)}</Text>
            </View>
          </View>
          <View style={styles.catCard}>
            <Text style={styles.catLabel}>Pendapatan dari berlangganan Fiber Optik (70%/30%)</Text>
            <Text style={styles.catTotal}>{fmt(summary.fiberOptik.total)}</Text>
            <View style={styles.catSplit}>
              <Text>ISP: {fmt(summary.fiberOptik.isp)}</Text>
              <Text>BumDesa: {fmt(summary.fiberOptik.bumdesa)}</Text>
            </View>
          </View>
          <View style={styles.catCard}>
            <Text style={styles.catLabel}>Pendapatan dari berlangganan Wireless Broadband (45%/55%)</Text>
            <Text style={styles.catTotal}>{fmt(summary.wirelessBroadband.total)}</Text>
            <View style={styles.catSplit}>
              <Text>ISP: {fmt(summary.wirelessBroadband.isp)}</Text>
              <Text>BumDesa: {fmt(summary.wirelessBroadband.bumdesa)}</Text>
            </View>
          </View>
        </View>

        {/* Monthly Table */}
        <Text style={styles.sectionTitle}>Detail per Bulan</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colPeriod]}>Periode</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Instalasi</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Fiber Optik</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Wireless</Text>
            <Text style={[styles.headerText, styles.colShare]}>Bagi Hasil ISP</Text>
            <Text style={[styles.headerText, styles.colShare]}>Bagi Hasil BumDesa</Text>
          </View>

          {data.data.map((row, i) => (
            <View key={row.period} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellBold, styles.colPeriod]}>{fmtPeriod(row.period)}</Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {row.instalasi.total > 0 ? fmt(row.instalasi.total) : "-"}
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {row.fiberOptik.total > 0 ? fmt(row.fiberOptik.total) : "-"}
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {row.wirelessBroadband.total > 0 ? fmt(row.wirelessBroadband.total) : "-"}
              </Text>
              <Text style={[styles.cellBold, styles.colShare, { color: "#2563eb" }]}>
                {fmt(row.totalIsp)}
              </Text>
              <Text style={[styles.cellBold, styles.colShare, { color: "#059669" }]}>
                {fmt(row.totalBumdesa)}
              </Text>
            </View>
          ))}

          {/* Grand total */}
          {data.data.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.cellBold, styles.colPeriod]}>Total</Text>
              <Text style={[styles.cellBold, styles.colAmount]}>{fmt(summary.instalasi.total)}</Text>
              <Text style={[styles.cellBold, styles.colAmount]}>{fmt(summary.fiberOptik.total)}</Text>
              <Text style={[styles.cellBold, styles.colAmount]}>{fmt(summary.wirelessBroadband.total)}</Text>
              <Text style={[styles.cellBold, styles.colShare, { color: "#2563eb" }]}>{fmt(summary.totalIsp)}</Text>
              <Text style={[styles.cellBold, styles.colShare, { color: "#059669" }]}>{fmt(summary.totalBumdesa)}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{data.appName}</Text>
          <Text style={styles.footerText}>
            Dicetak: {fmtDate(new Date().toISOString().split("T")[0])}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
