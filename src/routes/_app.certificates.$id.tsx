import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CertificateTemplate, type CertData } from "@/components/CertificateTemplate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { safeFilename } from "@/lib/cert-utils";

export const Route = createFileRoute("/_app/certificates/$id")({ component: CertView });

function CertView() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["cert", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificates").select("*, hackathons(name, edition), award_categories(name)").eq("id", id).single();
      if (error) throw error; return data;
    },
  });
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    const f = () => setW(Math.max(320, (document.getElementById("v")?.clientWidth || 800) - 24));
    f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f);
  }, []);
  const scale = Math.min(1, w / 1400);

  if (q.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!q.data) return <div className="p-8">Not found</div>;

  const data: CertData = (q.data.design_snapshot as any) || {
    templateId: q.data.template_id,
    recipientName: q.data.recipient_name,
    projectName: q.data.project_name ?? undefined,
    hackathonName: (q.data as any).hackathons?.name,
    categoryName: (q.data as any).award_categories?.name,
    certificateId: q.data.certificate_id,
    issueDate: new Date(q.data.issue_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" }),
    signatureName: q.data.signature_name ?? undefined,
    signatureTitle: q.data.signature_title ?? undefined,
  };

  const dl = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { backgroundColor: null, scale: 2, useCORS: true });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${safeFilename(q.data!.recipient_name)}_${q.data!.certificate_id}.png`;
    a.click();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to="/certificates"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <Button onClick={dl} className="bg-gold text-primary-foreground hover:bg-gold/90"><Download className="w-4 h-4 mr-2" />Download PNG</Button>
      </div>
      <div className="glass rounded-2xl p-3 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="Recipient">{q.data.recipient_name}</Info>
          <Info label="Cert ID">{q.data.certificate_id}</Info>
          <Info label="Hackathon">{(q.data as any).hackathons?.name ?? "—"}</Info>
          <Info label="Category">{(q.data as any).award_categories?.name ?? "—"}</Info>
        </div>
      </div>
      <div id="v" className="glass rounded-2xl p-3 overflow-auto">
        <div className="mx-auto" style={{ width: 1400 * scale, height: 990 * scale }}>
          <CertificateTemplate data={data} scale={scale} innerRef={ref} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs tracking-widest text-muted-foreground">{label}</div><div className="font-semibold mt-0.5">{children}</div></div>;
}