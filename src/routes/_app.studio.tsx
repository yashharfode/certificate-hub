import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCategories, listCertificates, listHackathons } from "@/lib/queries";
import { generateCertId, safeFilename, TEMPLATES, type TemplateId } from "@/lib/cert-utils";
import { CertificateTemplate, type CertData } from "@/components/CertificateTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Save, Upload, Plus, Trash2, Sparkles, Eye, Search, X } from "lucide-react";
import { uploadAsset, fileToDataUrl } from "@/lib/upload";

export const Route = createFileRoute("/_app/studio")({ component: Studio });

const PARTNER_PREFIXES = ["", "In Association With", "Sponsored By", "Supported By", "Media Partner", "Powered By", "Partner"];

type Partner = { label?: string; prefix?: string; logo?: string };

function Studio() {
  const qc = useQueryClient();
  const hackathons = useQuery({ queryKey: ["hackathons"], queryFn: listHackathons });
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const certsQ = useQuery({ queryKey: ["certificates"], queryFn: () => listCertificates() });

  const [tab, setTab] = useState<"editor" | "bulk" | "tracker">("editor");

  // -------- Editor state --------
  const [form, setForm] = useState({
    templateId: "royal-navy" as TemplateId,
    recipientName: "Yash Harfode",
    recipientEmail: "",
    projectName: "NIVARANAI",
    description: "",
    eventName: "Devlynix Buildathon 1.0",
    hackathonId: "",
    categoryId: "",
    signatureName: "Yash Harfode",
    signatureTitle: "Founder, Devlynix",
    organization: "DEVLYNIX",
    issueDate: new Date().toISOString().slice(0, 10),
  });
  const [certId, setCertId] = useState(generateCertId());
  const [assets, setAssets] = useState<{ logo?: string; msmeLogo?: string; stamp?: string; signatureImage?: string }>({});
  const [partners, setPartners] = useState<Partner[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!form.hackathonId && hackathons.data?.length) setForm((f) => ({ ...f, hackathonId: hackathons.data![0].id, eventName: f.eventName || hackathons.data![0].name }));
    if (!form.categoryId && categories.data?.length) setForm((f) => ({ ...f, categoryId: categories.data![0].id }));
  }, [hackathons.data, categories.data]); // eslint-disable-line

  const hk = hackathons.data?.find((h) => h.id === form.hackathonId);
  const cat = categories.data?.find((c) => c.id === form.categoryId);

  const certData: CertData = useMemo(() => ({
    templateId: form.templateId,
    recipientName: form.recipientName,
    projectName: form.projectName,
    hackathonName: hk?.name,
    eventName: form.eventName || hk?.name,
    categoryName: cat?.name,
    certificateId: certId,
    issueDate: new Date(form.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" }),
    signatureName: form.signatureName,
    signatureTitle: form.signatureTitle,
    organization: form.organization,
    description: form.description || undefined,
    assets,
    partners,
  }), [form, hk, cat, certId, assets, partners]);

  const exportPng = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { backgroundColor: null, scale: 2, useCORS: true, allowTaint: false });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.organization}_${safeFilename(form.recipientName)}_${certId}.png`;
    a.click();
  };

  const save = async () => {
    const { error } = await supabase.from("certificates").insert({
      certificate_id: certId,
      recipient_name: form.recipientName,
      recipient_email: form.recipientEmail || null,
      project_name: form.projectName || null,
      hackathon_id: form.hackathonId || null,
      category_id: form.categoryId || null,
      template_id: form.templateId,
      issue_date: form.issueDate,
      signature_name: form.signatureName,
      signature_title: form.signatureTitle,
      description: form.description || null,
      event_name: form.eventName || null,
      assets: assets as any,
      partners: partners as any,
      design_snapshot: certData as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved to cloud");
    setCertId(generateCertId());
    qc.invalidateQueries({ queryKey: ["certificates"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const onAsset = async (key: keyof typeof assets, file?: File) => {
    if (!file) return;
    try {
      // Use data URL for instant preview + html2canvas-safe export
      const dataUrl = await fileToDataUrl(file);
      setAssets((a) => ({ ...a, [key]: dataUrl }));
      // also upload to cloud (fire-and-forget)
      uploadAsset(file, key).then((url) => {
        // keep the cloud URL once uploaded so DB has it persistent
        setAssets((a) => ({ ...a, [key]: url }));
      }).catch((e) => console.warn("upload failed", e));
    } catch (e: any) { toast.error(e.message); }
  };

  const addPartner = () => { if (partners.length < 4) setPartners((p) => [...p, { prefix: "" }]); };
  const setPartner = (i: number, patch: Partial<Partner>) => setPartners((p) => p.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const delPartner = (i: number) => setPartners((p) => p.filter((_, idx) => idx !== i));
  const onPartnerLogo = async (i: number, file?: File) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPartner(i, { logo: dataUrl });
    uploadAsset(file, "partners").then((url) => setPartner(i, { logo: url })).catch(() => {});
  };

  // -------- Bulk state --------
  const [bulkText, setBulkText] = useState("Name,Award,Project\nPrem Sahu,Grand Winner,HackSearch\nRiya Jain,Design Excellence Award,UIKit Pro\nArjun Dev,Certificate of Participation,CodeBot");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const stageRef = useRef<HTMLDivElement>(null);

  const parseBulk = (): { name: string; award: string; project?: string }[] => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const out: { name: string; award: string; project?: string }[] = [];
    for (const line of lines) {
      const cols = line.split(",").map((c) => c.trim());
      if (!cols[0]) continue;
      // skip header
      if (cols[0].toLowerCase() === "name") continue;
      out.push({ name: cols[0], award: cols[1] || "", project: cols[2] });
    }
    return out;
  };

  const onExcel = (file: File) => {
    const r = new FileReader();
    r.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      const text = ["Name,Award,Project", ...rows.map((row) => {
        const keys = Object.keys(row);
        const get = (k: string) => row[keys.find((x) => x.toLowerCase().trim() === k) || k] || "";
        return `${get("name")},${get("award")},${get("project")}`;
      })].join("\n");
      setBulkText(text);
      toast.success(`Loaded ${rows.length} rows from Excel`);
    };
    r.readAsArrayBuffer(file);
  };

  const onCsvFile = (file: File) => {
    Papa.parse<any>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const text = ["Name,Award,Project", ...res.data.map((row: any) => {
          const keys = Object.keys(row);
          const get = (k: string) => row[keys.find((x) => x.toLowerCase().trim() === k) || k] || "";
          return `${get("name")},${get("award")},${get("project")}`;
        })].join("\n");
        setBulkText(text);
        toast.success(`Loaded ${res.data.length} rows from CSV`);
      },
    });
  };

  const generateBulk = async () => {
    const rows = parseBulk();
    if (!rows.length) { toast.error("Add at least one recipient row"); return; }
    if (!form.hackathonId) { toast.error("Pick a hackathon in Editor tab"); return; }
    setBusy(true);
    setProgress({ done: 0, total: rows.length, label: "Starting…" });
    const zip = new JSZip();
    const records: any[] = [];
    const stage = stageRef.current!;
    const { createRoot } = await import("react-dom/client");

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const matchCat = categories.data?.find((c) => c.name.toLowerCase() === (r.award || "").toLowerCase()) || cat;
      const newId = generateCertId();
      const data: CertData = {
        ...certData,
        recipientName: r.name,
        projectName: r.project || form.projectName,
        categoryName: matchCat?.name,
        certificateId: newId,
      };
      stage.innerHTML = "";
      const host = document.createElement("div");
      host.style.cssText = "width:1400px;height:990px;";
      stage.appendChild(host);
      const root = createRoot(host);
      await new Promise<void>((resolve) => {
        root.render(<CertificateTemplate data={data} scale={1} />);
        setTimeout(resolve, 350);
      });
      const inner = host.querySelector("div > div") as HTMLElement;
      const canvas = await html2canvas(inner, { backgroundColor: null, scale: 2, useCORS: true });
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
      zip.file(`${form.organization}_${safeFilename(r.name)}_${newId}.png`, blob);
      records.push({
        certificate_id: newId, recipient_name: r.name, project_name: r.project || null,
        hackathon_id: form.hackathonId || null, category_id: matchCat?.id || null,
        template_id: form.templateId, issue_date: form.issueDate,
        signature_name: form.signatureName, signature_title: form.signatureTitle,
        description: form.description || null, event_name: form.eventName || null,
        assets, partners, design_snapshot: data,
      });
      root.unmount();
      setProgress({ done: i + 1, total: rows.length, label: r.name });
    }

    for (let i = 0; i < records.length; i += 200) {
      const slice = records.slice(i, i + 200);
      const { error } = await supabase.from("certificates").insert(slice);
      if (error) toast.error(`Save error: ${error.message}`);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url; a.download = `certificates_${Date.now()}.zip`; a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["certificates"] });
    toast.success(`Generated ${records.length} certificates`);
  };

  // -------- Tracker --------
  const [search, setSearch] = useState("");
  const [filterHack, setFilterHack] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterTpl, setFilterTpl] = useState("");
  const filtered = (certsQ.data || []).filter((c: any) => {
    if (filterHack && c.hackathon_id !== filterHack) return false;
    if (filterCat && c.category_id !== filterCat) return false;
    if (filterTpl && c.template_id !== filterTpl) return false;
    if (search) {
      const s = search.toLowerCase();
      if (![c.recipient_name, c.project_name, c.certificate_id].some((x) => (x || "").toLowerCase().includes(s))) return false;
    }
    return true;
  });
  const removeCert = async (id: string) => {
    if (!confirm("Delete this certificate?")) return;
    const { error } = await supabase.from("certificates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["certificates"] });
    toast.success("Deleted");
  };

  // preview scaling
  const [previewW, setPreviewW] = useState(800);
  useEffect(() => {
    const fit = () => {
      const el = document.getElementById("preview-area");
      if (el) setPreviewW(Math.max(320, el.clientWidth - 24));
    };
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [tab]);
  const scale = Math.min(1, previewW / 1400);

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.3em] text-gold">CERTIFICATE STUDIO</div>
          <h1 className="display text-2xl md:text-3xl font-bold mt-1">{form.eventName || "Devlynix"} — Premium Generator</h1>
        </div>
        <div className="text-xs text-muted-foreground">Total saved: <span className="text-gold font-semibold">{certsQ.data?.length ?? 0}</span></div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-3 w-full md:w-auto md:inline-grid">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="bulk">Bulk</TabsTrigger>
          <TabsTrigger value="tracker">Tracker {certsQ.data ? <span className="ml-2 text-xs opacity-70">({certsQ.data.length})</span> : null}</TabsTrigger>
        </TabsList>

        {/* ============== EDITOR ============== */}
        <TabsContent value="editor" className="mt-4">
          <div className="grid lg:grid-cols-[460px_1fr] gap-5">
            <div className="glass rounded-2xl p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">
              <Section title="Template Design">
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => setForm({ ...form, templateId: t.id })}
                      className={`text-left p-2.5 rounded-lg border text-xs transition ${form.templateId === t.id ? "border-gold bg-gold/10" : "border-border hover:border-gold/40"}`}>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Event">
                <Field label="Event Name"><Input value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} placeholder="Devlynix Buildathon 1.0" /></Field>
                <Field label="Hackathon (links cert to event)">
                  <Select value={form.hackathonId} onValueChange={(v) => setForm({ ...form, hackathonId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select hackathon" /></SelectTrigger>
                    <SelectContent>{hackathons.data?.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}{h.edition ? ` — ${h.edition}` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </Section>

              <Section title="Recipient">
                <Field label="Participant Full Name"><Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></Field>
                <Field label="Email (optional)"><Input value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} /></Field>
                <Field label="Project Name"><Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} /></Field>
                <Field label="Certificate Description (shown on cert)">
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="In recognition of outstanding contribution…" />
                </Field>
              </Section>

              <Section title="Award Category">
                <div className="flex gap-2">
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Link to="/categories"><Button variant="outline" size="sm">⚙️ Manage</Button></Link>
                </div>
              </Section>

              <Section title="Issue Details">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Date"><Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></Field>
                  <Field label="Cert ID"><Input value={certId} onChange={(e) => setCertId(e.target.value)} /></Field>
                </div>
                <Field label="Signatory Name"><Input value={form.signatureName} onChange={(e) => setForm({ ...form, signatureName: e.target.value })} /></Field>
                <Field label="Signatory Role"><Input value={form.signatureTitle} onChange={(e) => setForm({ ...form, signatureTitle: e.target.value })} /></Field>
                <Field label="Organization"><Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></Field>
              </Section>

              <Section title="Core Image Assets">
                <div className="grid grid-cols-2 gap-2">
                  <AssetUpload label="Main Logo" url={assets.logo} onFile={(f) => onAsset("logo", f)} onClear={() => setAssets((a) => ({ ...a, logo: undefined }))} />
                  <AssetUpload label="MSME Logo" url={assets.msmeLogo} onFile={(f) => onAsset("msmeLogo", f)} onClear={() => setAssets((a) => ({ ...a, msmeLogo: undefined }))} />
                  <AssetUpload label="Official Stamp" url={assets.stamp} onFile={(f) => onAsset("stamp", f)} onClear={() => setAssets((a) => ({ ...a, stamp: undefined }))} />
                  <AssetUpload label="Signature Image" url={assets.signatureImage} onFile={(f) => onAsset("signatureImage", f)} onClear={() => setAssets((a) => ({ ...a, signatureImage: undefined }))} />
                </div>
              </Section>

              <Section title={`Partners / Sponsors (${partners.length}/4)`}>
                <p className="text-[11px] text-muted-foreground -mt-2">Shows on cert bottom. Max 4 logos. PNG/JPG.</p>
                {partners.map((p, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gold">Partner Slot {i + 1}</div>
                      <Button size="sm" variant="ghost" onClick={() => delPartner(i)}><X className="w-3 h-3 mr-1" />Remove</Button>
                    </div>
                    <Select value={p.prefix || "__none__"} onValueChange={(v) => setPartner(i, { prefix: v === "__none__" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {PARTNER_PREFIXES.filter(Boolean).map((pf) => <SelectItem key={pf} value={pf}>{pf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Name/Label" value={p.label || ""} onChange={(e) => setPartner(i, { label: e.target.value })} />
                    <AssetUpload label="Logo" url={p.logo} onFile={(f) => onPartnerLogo(i, f)} onClear={() => setPartner(i, { logo: undefined })} />
                  </div>
                ))}
                {partners.length < 4 && (
                  <Button onClick={addPartner} variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Partner / Sponsor Logo</Button>
                )}
              </Section>

              <div className="flex flex-col gap-2 pt-2 sticky bottom-0 bg-background/80 backdrop-blur -mx-5 px-5 py-3 border-t border-border">
                <Button onClick={save} className="bg-gold text-primary-foreground hover:bg-gold/90"><Save className="w-4 h-4 mr-2" />Save to Cloud</Button>
                <Button onClick={exportPng} variant="outline"><Download className="w-4 h-4 mr-2" />Download PNG</Button>
              </div>
            </div>

            <div id="preview-area" className="glass rounded-2xl p-3 overflow-auto">
              <div className="mx-auto" style={{ width: 1400 * scale, height: 990 * scale }}>
                <CertificateTemplate data={certData} scale={scale} innerRef={ref} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============== BULK ============== */}
        <TabsContent value="bulk" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="display text-lg font-bold">Bulk Recipients</h3>
                <p className="text-xs text-muted-foreground">Format: <code>Name,Award,Project</code> (one per line). Header row auto-skipped. Uses current Editor settings.</p>
              </div>
              <Textarea rows={14} className="font-mono text-xs" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex">
                  <input type="file" hidden accept=".csv" onChange={(e) => e.target.files && onCsvFile(e.target.files[0])} />
                  <Button variant="outline" asChild><span><Upload className="w-4 h-4 mr-2" />Upload CSV</span></Button>
                </label>
                <label className="inline-flex">
                  <input type="file" hidden accept=".xlsx,.xls" onChange={(e) => e.target.files && onExcel(e.target.files[0])} />
                  <Button variant="outline" asChild><span><Upload className="w-4 h-4 mr-2" />Upload Excel (.xlsx)</span></Button>
                </label>
                <Button disabled={busy} onClick={generateBulk} className="bg-gold text-primary-foreground hover:bg-gold/90 ml-auto">
                  <Sparkles className="w-4 h-4 mr-2" />{busy ? `Generating ${progress.done}/${progress.total}…` : "Generate & Download ZIP"}
                </Button>
              </div>
              {busy && (
                <div className="text-xs text-muted-foreground">
                  {progress.label}
                  <div className="w-full h-1 bg-border mt-1 rounded"><div className="h-full bg-gold rounded transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-5 text-sm space-y-3">
              <h3 className="display text-lg font-bold">Example Input</h3>
              <pre className="text-xs bg-secondary/40 rounded-lg p-3 overflow-x-auto">{`Name,Award,Project
Prem Sahu,Grand Winner,HackSearch
Riya Jain,1st Runner-Up,UIKit Pro
Arjun Dev,The Pure Coder Award,CodeBot`}</pre>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• <b>Name</b>: required. <b>Award</b>: matched against Categories (case-insensitive). <b>Project</b>: optional.</div>
                <div>• Each row → one PNG, all packaged into a ZIP and saved to the cloud tracker.</div>
                <div>• Configure the template, event, signatory and assets in the <b>Editor</b> tab — they're applied to every cert.</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============== TRACKER ============== */}
        <TabsContent value="tracker" className="mt-4">
          <div className="glass rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, project, ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <FilterSelect label="All hackathons" value={filterHack} onChange={setFilterHack} options={(hackathons.data || []).map((h) => ({ value: h.id, label: h.name }))} />
            <FilterSelect label="All categories" value={filterCat} onChange={setFilterCat} options={(categories.data || []).map((c) => ({ value: c.id, label: c.name }))} />
            <FilterSelect label="All templates" value={filterTpl} onChange={setFilterTpl} options={TEMPLATES.map((t) => ({ value: t.id, label: t.name }))} />
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-secondary/40 text-xs tracking-widest text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">RECIPIENT</th>
                    <th className="text-left p-3">EVENT</th>
                    <th className="text-left p-3">CATEGORY</th>
                    <th className="text-left p-3">CERT ID</th>
                    <th className="text-left p-3">DATE</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any) => (
                    <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3"><div className="font-semibold">{c.recipient_name}</div><div className="text-xs text-muted-foreground">{c.project_name}</div></td>
                      <td className="p-3 text-muted-foreground">{c.hackathons?.name || c.event_name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{c.award_categories?.name ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-gold">{c.certificate_id}</td>
                      <td className="p-3 text-muted-foreground">{new Date(c.issue_date).toLocaleDateString()}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Link to="/certificates/$id" params={{ id: c.id }}><Button size="icon" variant="ghost"><Eye className="w-4 h-4" /></Button></Link>
                        <Button size="icon" variant="ghost" onClick={() => removeCert(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No certificates match your filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div ref={stageRef} style={{ position: "fixed", left: -99999, top: 0, opacity: 0, pointerEvents: "none" }} aria-hidden />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] tracking-[0.25em] text-gold font-semibold">{title.toUpperCase()}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>;
}

function AssetUpload({ label, url, onFile, onClear }: { label: string; url?: string; onFile: (f: File) => void; onClear: () => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 border border-dashed border-border rounded-lg p-2 flex items-center gap-2 min-h-[60px]">
        {url
          ? <>
              <img src={url} alt={label} className="h-12 w-12 object-contain bg-white/5 rounded" />
              <Button size="sm" variant="ghost" onClick={onClear} className="ml-auto text-destructive"><X className="w-3 h-3" /></Button>
            </>
          : <label className="flex-1 text-xs text-muted-foreground cursor-pointer flex items-center gap-2">
              <input type="file" hidden accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              📎 Upload {label}
            </label>}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{label}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}