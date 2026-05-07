import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { listCategories, listHackathons } from "@/lib/queries";
import { generateCertId, safeFilename, TEMPLATES, type TemplateId } from "@/lib/cert-utils";
import { CertificateTemplate } from "@/components/CertificateTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Sparkles, Download } from "lucide-react";

export const Route = createFileRoute("/_app/bulk")({ component: Bulk });

type Row = { recipient_name: string; recipient_email?: string; project_name?: string; category_name?: string };

function Bulk() {
  const hackathons = useQuery({ queryKey: ["hackathons"], queryFn: listHackathons });
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const [templateId, setTemplateId] = useState<TemplateId>("royal-navy");
  const [hackathonId, setHackathonId] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [signatureName, setSignatureName] = useState("Yash Harfode");
  const [signatureTitle, setSignatureTitle] = useState("Founder, Devlynix");
  const [organization, setOrganization] = useState("DEVLYNIX");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([{ recipient_name: "" }]);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [busy, setBusy] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hackathonId && hackathons.data?.length) setHackathonId(hackathons.data[0].id);
    if (!defaultCategoryId && categories.data?.length) setDefaultCategoryId(categories.data[0].id);
  }, [hackathons.data, categories.data]); // eslint-disable-line

  const setRow = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, idx) => idx === i ? { ...r, ...p } : r));
  const addRow = () => setRows((rs) => [...rs, { recipient_name: "" }]);
  const delRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const onFile = (file: File) => {
    const ext = file.name.toLowerCase();
    const handle = (parsed: Row[]) => {
      const cleaned = parsed.filter((r) => r.recipient_name?.trim());
      if (!cleaned.length) { toast.error("No valid rows. Need a 'recipient_name' column."); return; }
      setRows(cleaned);
      toast.success(`Loaded ${cleaned.length} rows`);
    };
    if (ext.endsWith(".csv")) {
      Papa.parse<Row>(file, { header: true, skipEmptyLines: true, complete: (res) => handle(res.data as Row[]) });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        handle(XLSX.utils.sheet_to_json<Row>(ws));
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const generate = async () => {
    const valid = rows.filter((r) => r.recipient_name?.trim());
    if (!valid.length) { toast.error("Add at least one recipient"); return; }
    if (!hackathonId) { toast.error("Pick a hackathon"); return; }

    setBusy(true);
    setProgress({ done: 0, total: valid.length, label: "Starting…" });
    const zip = new JSZip();
    const records: any[] = [];
    const stage = stageRef.current!;

    const hk = hackathons.data?.find((h) => h.id === hackathonId);

    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      const cat = categories.data?.find((c) => c.name.toLowerCase() === (r.category_name || "").toLowerCase()) || categories.data?.find((c) => c.id === defaultCategoryId);
      const certId = generateCertId();
      const data = {
        templateId,
        recipientName: r.recipient_name.trim(),
        projectName: r.project_name?.trim(),
        hackathonName: hk?.name,
        categoryName: cat?.name,
        certificateId: certId,
        issueDate: new Date(issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" }),
        signatureName, signatureTitle, organization,
      };

      stage.innerHTML = "";
      const host = document.createElement("div");
      host.style.cssText = "width:1400px;height:990px;";
      stage.appendChild(host);
      // mount via portal-less approach using ReactDOM is complex; instead render JSX into a temporary root
      const { createRoot } = await import("react-dom/client");
      const root = createRoot(host);
      await new Promise<void>((resolve) => {
        root.render(<CertificateTemplate data={data} scale={1} innerRef={undefined} />);
        setTimeout(resolve, 200);
      });
      const inner = host.querySelector("div > div") as HTMLElement;
      const canvas = await html2canvas(inner, { backgroundColor: null, scale: 2, useCORS: true });
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
      zip.file(`${organization}_${safeFilename(r.recipient_name)}_${certId}.png`, blob);
      records.push({
        certificate_id: certId,
        recipient_name: r.recipient_name.trim(),
        recipient_email: r.recipient_email || null,
        project_name: r.project_name || null,
        hackathon_id: hackathonId,
        category_id: cat?.id || null,
        template_id: templateId,
        issue_date: issueDate,
        signature_name: signatureName,
        signature_title: signatureTitle,
        design_snapshot: data,
      });
      root.unmount();
      setProgress({ done: i + 1, total: valid.length, label: r.recipient_name });
    }

    // batch insert in chunks
    for (let i = 0; i < records.length; i += 200) {
      const slice = records.slice(i, i + 200);
      const { error } = await supabase.from("certificates").insert(slice);
      if (error) toast.error(`Save error at row ${i}: ${error.message}`);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url; a.download = `certificates_${Date.now()}.zip`; a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
    toast.success(`Generated ${records.length} certificates`);
  };

  const downloadTemplate = () => {
    const csv = "recipient_name,recipient_email,project_name,category_name\nYash Harfode,yash@example.com,NIVARANAI,Winner\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "bulk_template.csv"; a.click();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="text-xs tracking-[0.3em] text-gold">BULK GENERATE</div>
        <h1 className="display text-3xl font-bold mt-1">Generate Many at Once</h1>
        <p className="text-muted-foreground text-sm mt-1">Add rows manually or import a CSV/Excel file. Each row → one certificate, all saved to cloud and packaged into a ZIP.</p>
      </div>

      <div className="glass rounded-2xl p-5 grid md:grid-cols-2 gap-5">
        <div>
          <Label className="text-xs">Template</Label>
          <Select value={templateId} onValueChange={(v) => setTemplateId(v as TemplateId)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Hackathon</Label>
          <Select value={hackathonId} onValueChange={setHackathonId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Pick hackathon" /></SelectTrigger>
            <SelectContent>{hackathons.data?.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Default category (used if row has none)</Label>
          <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Issue date</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Organization</Label><Input value={organization} onChange={(e) => setOrganization(e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Signature name</Label><Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Signature title</Label><Input value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} className="mt-1" /></div>
      </div>

      <div className="glass rounded-2xl p-5 mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="display text-lg font-bold">Recipients ({rows.length})</h3>
            <p className="text-xs text-muted-foreground">Columns: recipient_name (required), recipient_email, project_name, category_name</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}><Download className="w-3 h-3 mr-2" />CSV template</Button>
            <label className="inline-flex">
              <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
              <Button size="sm" variant="outline" asChild><span><Upload className="w-3 h-3 mr-2" />Import CSV/Excel</span></Button>
            </label>
            <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-3 h-3 mr-2" />Add row</Button>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
              <Input placeholder="Recipient name *" value={r.recipient_name} onChange={(e) => setRow(i, { recipient_name: e.target.value })} />
              <Input placeholder="Email" value={r.recipient_email ?? ""} onChange={(e) => setRow(i, { recipient_email: e.target.value })} />
              <Input placeholder="Project" value={r.project_name ?? ""} onChange={(e) => setRow(i, { project_name: e.target.value })} />
              <Input placeholder="Category (e.g. Winner)" value={r.category_name ?? ""} onChange={(e) => setRow(i, { category_name: e.target.value })} />
              <Button size="icon" variant="ghost" onClick={() => delRow(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {busy && (
            <div className="text-sm text-muted-foreground">
              Generating {progress.done}/{progress.total} — {progress.label}
              <div className="w-64 h-1 bg-border mt-1 rounded"><div className="h-full bg-gold rounded" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
            </div>
          )}
          <Button disabled={busy} onClick={generate} className="bg-gold text-primary-foreground hover:bg-gold/90 ml-auto">
            <Sparkles className="w-4 h-4 mr-2" />{busy ? "Generating…" : "Generate & Download ZIP"}
          </Button>
        </div>
      </div>

      {/* Off-screen render stage */}
      <div ref={stageRef} style={{ position: "fixed", left: -99999, top: 0, opacity: 0, pointerEvents: "none" }} aria-hidden />
    </div>
  );
}