import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCategories, listHackathons } from "@/lib/queries";
import { generateCertId, safeFilename, TEMPLATES, type TemplateId } from "@/lib/cert-utils";
import { CertificateTemplate } from "@/components/CertificateTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Save } from "lucide-react";

export const Route = createFileRoute("/_app/studio")({ component: Studio });

function Studio() {
  const qc = useQueryClient();
  const hackathons = useQuery({ queryKey: ["hackathons"], queryFn: listHackathons });
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const [form, setForm] = useState({
    templateId: "royal-navy" as TemplateId,
    recipientName: "Yash Harfode",
    recipientEmail: "",
    projectName: "NIVARANAI",
    hackathonId: "",
    categoryId: "",
    signatureName: "Yash Harfode",
    signatureTitle: "Founder, Devlynix",
    organization: "DEVLYNIX",
    issueDate: new Date().toISOString().slice(0, 10),
  });
  const [certId, setCertId] = useState(generateCertId());
  const ref = useRef<HTMLDivElement>(null);

  // auto-pick defaults
  useEffect(() => {
    if (!form.hackathonId && hackathons.data?.length) setForm((f) => ({ ...f, hackathonId: hackathons.data![0].id }));
    if (!form.categoryId && categories.data?.length) setForm((f) => ({ ...f, categoryId: categories.data![0].id }));
  }, [hackathons.data, categories.data]); // eslint-disable-line

  const hk = hackathons.data?.find((h) => h.id === form.hackathonId);
  const cat = categories.data?.find((c) => c.id === form.categoryId);

  const certData = useMemo(() => ({
    templateId: form.templateId,
    recipientName: form.recipientName,
    projectName: form.projectName,
    hackathonName: hk?.name,
    categoryName: cat?.name,
    certificateId: certId,
    issueDate: new Date(form.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" }),
    signatureName: form.signatureName,
    signatureTitle: form.signatureTitle,
    organization: form.organization,
  }), [form, hk, cat, certId]);

  const exportPng = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { backgroundColor: null, scale: 2, useCORS: true });
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
      design_snapshot: certData,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Certificate saved to cloud");
    setCertId(generateCertId());
    qc.invalidateQueries({ queryKey: ["certificates"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const [previewW, setPreviewW] = useState(800);
  useEffect(() => {
    const fit = () => {
      const el = document.getElementById("preview-area");
      if (el) setPreviewW(Math.max(320, el.clientWidth - 24));
    };
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const scale = Math.min(1, previewW / 1400);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <div className="text-xs tracking-[0.3em] text-gold">CERTIFICATE STUDIO</div>
        <h1 className="display text-3xl font-bold mt-1">Design & Issue</h1>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <div className="glass rounded-2xl p-5 space-y-5 max-h-[calc(100vh-160px)] overflow-y-auto">
          <div>
            <Label>Template</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setForm({ ...form, templateId: t.id })}
                  className={`text-left p-3 rounded-lg border text-sm transition ${form.templateId === t.id ? "border-gold bg-gold/10" : "border-border hover:border-gold/40"}`}>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          <Field label="Recipient name"><Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></Field>
          <Field label="Recipient email (optional)"><Input value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} /></Field>
          <Field label="Project name"><Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} /></Field>

          <Field label="Hackathon">
            <Select value={form.hackathonId} onValueChange={(v) => setForm({ ...form, hackathonId: v })}>
              <SelectTrigger><SelectValue placeholder="Select hackathon" /></SelectTrigger>
              <SelectContent>{hackathons.data?.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}{h.edition ? ` — ${h.edition}` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Award category">
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Issue date"><Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></Field>
            <Field label="Cert ID"><Input value={certId} onChange={(e) => setCertId(e.target.value)} /></Field>
          </div>
          <Field label="Signature name"><Input value={form.signatureName} onChange={(e) => setForm({ ...form, signatureName: e.target.value })} /></Field>
          <Field label="Signature title"><Input value={form.signatureTitle} onChange={(e) => setForm({ ...form, signatureTitle: e.target.value })} /></Field>
          <Field label="Organization name"><Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></Field>

          <div className="flex flex-col gap-2 pt-2">
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>;
}