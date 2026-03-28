import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface ClientPdfData {
  title: string;
  campaign_date: string;
  status: string;
  photos: { submitted_at: string }[];
}

export function generateClientPdf(campaign: ClientPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  // Header
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("AdTruck", margin, 13);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Campaign Proof Report", margin, 21);

  doc.setFontSize(9);
  doc.text(`Generated ${format(new Date(), "MMM d, yyyy · h:mm a")}`, pageWidth - margin, 21, {
    align: "right",
  });

  y = 38;

  // Campaign Title
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(campaign.title, margin, y);

  y += 6;
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(format(new Date(campaign.campaign_date), "MMMM d, yyyy"), margin, y);

  y += 10;

  // Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("Campaign Summary", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Detail", "Value"]],
    body: [
      ["Campaign", campaign.title],
      ["Date", format(new Date(campaign.campaign_date), "MMMM d, yyyy")],
      ["Status", campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)],
      ["Photos", String(campaign.photos.length)],
    ],
    theme: "grid",
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Photo log
  if (campaign.photos.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Photos", margin, y);
    y += 2;

    const sortedPhotos = [...campaign.photos].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    const photoRows = sortedPhotos.map((p, i) => [
      String(i + 1),
      format(new Date(p.submitted_at), "h:mm a"),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Time"]],
      body: photoRows,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 30 },
      },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text("AdTruck Campaign Proof Report", margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  const safeName = campaign.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
  const dateStr = format(new Date(campaign.campaign_date), "yyyy-MM-dd");
  doc.save(`${safeName}_proof_${dateStr}.pdf`);
}
