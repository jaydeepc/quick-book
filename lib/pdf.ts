import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { EventDetail, Slot } from "./types";
import { fmtDate, fmtRange } from "./dates";

const NAVY: [number, number, number] = [30, 53, 74];
const BRAND: [number, number, number] = [239, 65, 35];
const SOFT: [number, number, number] = [253, 236, 231];

async function rasterizeLogo(url: string): Promise<string> {
  const svgText = await fetch(url).then((r) => r.text());
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function slotLabel(s: Slot): string {
  return `${fmtDate(s.date, true)} · ${fmtRange(s.start, s.end)}`;
}

export async function downloadEventPdf(detail: EventDetail) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  try {
    const logo = await rasterizeLogo("/piramal-logo.svg");
    doc.addImage(logo, "PNG", margin, 30, 87, 40);
  } catch {
    doc.setTextColor(...BRAND);
    doc.setFontSize(14).setFont("helvetica", "bold");
    doc.text("Piramal Finance", margin, 52);
  }

  doc.setTextColor(...NAVY);
  doc.setFontSize(10).setFont("helvetica", "bold");
  doc.text("QUICK BLOCK · AVAILABILITY REPORT", pageW - margin, 45, { align: "right" });
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(2);
  doc.line(margin, 82, pageW - margin, 82);

  doc.setFontSize(19).setFont("helvetica", "bold");
  doc.text(detail.name, margin, 110, { maxWidth: pageW - margin * 2 });

  doc.setFontSize(9.5).setFont("helvetica", "normal");
  doc.setTextColor(95, 113, 134);
  const dateCount = new Set(detail.slots.map((s) => s.date)).size;
  const meta = [
    `Generated ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    `${dateCount} day${dateCount === 1 ? "" : "s"} · ${detail.slots.length} slots offered`,
    `${detail.responses.length} response${detail.responses.length === 1 ? "" : "s"}`,
    `${detail.links.length} group${detail.links.length === 1 ? "" : "s"}`,
  ].join("   ·   ");
  doc.text(meta, margin, 128);
  if (detail.note) {
    doc.setFont("helvetica", "italic");
    doc.text(detail.note, margin, 143, { maxWidth: pageW - margin * 2 });
  }

  // ---- Best times across all groups ----
  const votesBySlot = new Map<string, string[]>();
  for (const s of detail.slots) votesBySlot.set(s.id, []);
  for (const r of detail.responses) {
    for (const id of r.slotIds) votesBySlot.get(id)?.push(r.name);
  }
  const ranked = [...detail.slots].sort((a, b) => {
    const diff = (votesBySlot.get(b.id)?.length ?? 0) - (votesBySlot.get(a.id)?.length ?? 0);
    if (diff !== 0) return diff;
    return a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date);
  });
  const topVotes = votesBySlot.get(ranked[0]?.id ?? "")?.length ?? 0;

  autoTable(doc, {
    startY: detail.note ? 158 : 148,
    head: [["Date", "Time", "Votes", "Available"]],
    body: ranked.map((s) => {
      const names = votesBySlot.get(s.id) ?? [];
      return [
        fmtDate(s.date, true),
        fmtRange(s.start, s.end),
        String(names.length),
        names.join(", ") || "—",
      ];
    }),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, textColor: NAVY, cellPadding: 6 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      2: { halign: "center", fontStyle: "bold" },
      3: { cellWidth: 200 },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const votes = Number(data.row.cells[2]?.text?.[0] ?? 0);
      if (topVotes > 0 && votes === topVotes) {
        data.cell.styles.fillColor = SOFT;
        if (data.column.index === 2) data.cell.styles.textColor = BRAND;
      }
    },
  });

  // ---- Per-group breakdown (one section per share link / SLT) ----
  const slotById = new Map(detail.slots.map((s) => [s.id, s]));
  for (const link of detail.links) {
    const rows = detail.responses.filter((r) => r.linkId === link.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = (doc as any).lastAutoTable.finalY + 30;
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 50;
    }
    doc.setFontSize(12).setFont("helvetica", "bold");
    doc.setTextColor(...BRAND);
    doc.text(`Group: ${link.label}`, margin, y);
    doc.setTextColor(95, 113, 134);
    doc.setFontSize(9).setFont("helvetica", "normal");
    doc.text(
      `${rows.length} response${rows.length === 1 ? "" : "s"}`,
      pageW - margin,
      y,
      { align: "right" }
    );

    if (rows.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.text("No responses yet.", margin, y + 16);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).lastAutoTable = { finalY: y + 20 };
      continue;
    }

    autoTable(doc, {
      startY: y + 10,
      head: [["Name", "Preferred times", "Submitted"]],
      body: rows.map((r) => [
        r.name,
        r.slotIds
          .map((id) => slotById.get(id))
          .filter(Boolean)
          .map((s) => slotLabel(s!))
          .join("\n"),
        new Date(r.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
      ]),
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 9, textColor: NAVY, cellPadding: 6 },
      headStyles: { fillColor: [246, 240, 237], textColor: NAVY, fontStyle: "bold" },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 120 }, 2: { cellWidth: 80 } },
    });
  }

  // ---- Footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.setTextColor(144, 160, 178);
    doc.text("Generated by Quick Block · Piramal Finance", margin, h - 24);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, h - 24, { align: "right" });
  }

  const safeName = detail.name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  doc.save(`${safeName || "event"}-availability.pdf`);
}
