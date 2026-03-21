import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { buildSuiviReportHtml } from '@/lib/suivi-report-builder';

interface SuiviReportModalProps {
  enterpriseId: string;
  enterpriseName: string;
  onClose: () => void;
}

export default function SuiviReportModal({ enterpriseId, enterpriseName, onClose }: SuiviReportModalProps) {
  const { profile } = useAuth();
  const [comment, setComment] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const [entRes, delivRes, notesRes, uploadsRes] = await Promise.all([
        supabase.from('enterprises').select('*').eq('id', enterpriseId).single(),
        supabase.from('deliverables').select('type, data, score').eq('enterprise_id', enterpriseId),
        supabase.from('coaching_notes' as any).select('*').eq('enterprise_id', enterpriseId).order('created_at', { ascending: false }),
        supabase.from('coach_uploads').select('*').eq('enterprise_id', enterpriseId),
      ]);

      const html = buildSuiviReportHtml({
        enterprise: entRes.data,
        deliverables: delivRes.data || [],
        notes: (notesRes.data as any[]) || [],
        uploads: uploadsRes.data || [],
        coachComment: comment,
        nextSteps,
        coachName: profile?.full_name || 'Coach',
      });
      setReportHtml(html);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setGenerating(false);
    }
  };

  const downloadAsHtml = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Suivi_${enterpriseName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    toast.success('Rapport téléchargé');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!reportHtml ? (
          <>
            <DialogHeader>
              <DialogTitle>Rapport de suivi — {enterpriseName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Commentaire et recommandation</Label>
                <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
                  placeholder="L'accompagnement progresse bien…" />
              </div>
              <div>
                <Label className="text-xs font-medium">Prochaines étapes (optionnel)</Label>
                <Textarea value={nextSteps} onChange={e => setNextSteps(e.target.value)} rows={2}
                  placeholder="1. Mise en place comité consultatif…" />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Compilation…</> : 'Générer le rapport'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rapport de suivi</DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={downloadAsHtml}>Télécharger HTML</Button>
                <Button size="sm" variant="outline" onClick={() => setReportHtml(null)}>Modifier</Button>
              </div>
            </DialogHeader>
            <iframe srcDoc={reportHtml} className="w-full h-[600px] border rounded-lg" />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
