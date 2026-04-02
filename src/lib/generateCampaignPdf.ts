import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface CampaignPdfData {
  title: string;
  campaign_date: string;
  status: string;
  routes: { name: string; city?: string | null } | null;
  internal_notes: string | null;
  client_billed_amount: number | null;
  campaign_costs: { amount: number; notes?: string | null; cost_types: { name: string } | null }[];
  clients: { name: string } | null;
  driver_profile: { display_name: string } | null;
  driver_shifts: { id: string; started_at: string; ended_at: string | null }[];
  campaign_photos: { id: string; submitted_at: string; note: string | null }[];
}

function fmtTime(ts: string | null | undefined): string {
  if (!ts) return "\u2014";
  return format(new Date(ts), "h:mm a");
}

function fmtCurrency(val: number | null): string {
  if (val == null) return "\u2014";
  return `$${val.toFixed(2)}`;
}

export function generateCampaignPdf(campaign: CampaignPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  // -- Header
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("AdTruck", margin, 13);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Campaign Report", margin, 21);

  doc.setFontSize(9);
  doc.text(`Generated ${format(new Date(), "MMM d, yyyy \u00b7 h:mm a")}`, pageWidth - margin, 21, {
    align: "right",
  });

  y = 38;

  // -- Campaign Title & Status
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(campaign.title, margin, y);

  const statusColors: Record<string, [number, number, number]> = {
    draft: [107, 114, 128],
    pending: [234, 179, 8],
    active: [34, 197, 94],
    completed: [59, 130, 246],
  };
  const [sr, sg, sb] = statusColors[campaign.status] ?? [107, 114, 128];
  const statusText = campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1);
  const statusWidth = doc.getTextWidth(statusText) + 8;
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(pageWidth - margin - statusWidth, y - 5, statusWidth, 7, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, pageWidth - margin - statusWidth + 4, y - 0.5);

  y += 6;
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let subtitle = format(new Date(campaign.campaign_date), "MMMM d, yyyy");
  if (campaign.routes?.name) subtitle += ` \u00b7 Route: ${campaign.routes.name}`;
  doc.text(subtitle, margin, y);

  y += 10;

  // -- Details table
  const latestShift = [...campaign.driver_shifts].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )[0];
  const activeShift = campaign.driver_shifts.find((s) => !s.ended_at);

  const detailRows = [
    ["Client", campaign.clients?.name ?? "\u2014"],
    ["Driver", campaign.driver_profile?.display_name ?? "Unassigned"],
    ["Shift Start", latestShift ? fmtTime(latestShift.started_at) : "\u2014"],
    [
      "Shift End",
      latestShift?.ended_at ? fmtTime(latestShift.ended_at) : activeShift ? "Active" : "\u2014",
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: detailRows,
    theme: "grid",
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // -- Cost Breakdown
  const hasCosts = campaign.campaign_costs.length > 0;
  if (hasCosts || campaign.client_billed_amount != null) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Financial Summary (Internal)", margin, y);
    y += 2;

    const totalInternalCost = campaign.campaign_costs.reduce((sum, c) => sum + c.amount, 0);

    const costRows = campaign.campaign_costs.map((c) => [
      c.cost_types?.name ?? "Unknown",
      `$${c.amount.toFixed(2)}`,
    ]);
    costRows.push(["Total Internal Cost", `$${totalInternalCost.toFixed(2)}`]);

    if (campaign.client_billed_amount != null) {
      costRows.push(["Client Billed Amount", `$${campaign.client_billed_amount.toFixed(2)}`]);
      const profitMargin = campaign.client_billed_amount - totalInternalCost;
      costRows.push(["Profit Margin", `$${profitMargin.toFixed(2)}`]);
    }

    autoTable(doc, {
      startY: y,
      head: [["Item", "Amount"]],
      body: costRows,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 }, 1: { halign: "right" } },
      didParseCell: (data) => {
        // Bold the total and summary rows
        const totalRowStart = campaign.campaign_costs.length;
        if (data.section === "body" && data.row.index >= totalRowStart) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [243, 244, 246];
        }
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // -- Internal Notes
  if (campaign.internal_notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Internal Notes", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    const lines = doc.splitTextToSize(campaign.internal_notes, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 8;
  }

  // -- Photo Log
  if (campaign.campaign_photos.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    const photoCount = campaign.campaign_photos.length;
    doc.text(
      `Photo Log (${photoCount} photo${photoCount !== 1 ? "s" : ""})`,
      margin,
      y
    );
    y += 2;

    const sortedPhotos = [...campaign.campaign_photos].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    const photoRows = sortedPhotos.map((p, i) => [
      String(i + 1),
      format(new Date(p.submitted_at), "h:mm a"),
      p.note ?? "\u2014",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Time", "Note"]],
      body: photoRows,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 25 },
      },
    });
  }

  // -- Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text("AdTruck Campaign Proof Report \u2014 Confidential", margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  // -- Download
  const safeName = campaign.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
  const dateStr = format(new Date(campaign.campaign_date), "yyyy-MM-dd");
  doc.save(`${safeName}_${dateStr}.pdf`);
}
