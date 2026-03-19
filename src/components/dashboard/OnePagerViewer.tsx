import { Badge } from '@/components/ui/badge';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  data: Record<string, any>;
  onRegenerate?: () => void;
}

export default function OnePagerViewer({ data, onRegenerate }: Props) {
  const ent = data.entreprise || {};
  const traction = data.traction || {};
  const kpis = data.kpis_financiers || {};
  const besoin = data.besoin_financement || {};
  const marche = data.marche || {};
  const ps = data.probleme_solution || {};
  const score = data.score || 0;

  const handleDownloadHtml = () => {
    const tractionYears = [
      { label: 'N-2', val: traction.ca_y_2 },
      { label: 'N-1', val: traction.ca_y_1 },
      { label: 'N', val: traction.ca_y0 },
    ];
    const maxTraction = Math.max(...tractionYears.map(t => parseFloat(String(t.val || '0').replace(/[^\d.]/g, '')) || 0), 1);

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>One-Pager ${ent.nom || ''}</title>
<style>
:root{--navy:#0F2B46;--blue:#1B5E8A;--teal:#0E7C6B;--gold:#C4841D;--red:#9B2C2C;--gray:#64748B;--light:#F8FAFC;--border:#E2E8F0}
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4 portrait;margin:0}
body{font-family:Arial,sans-serif;width:210mm;min-height:297mm;margin:0 auto;color:#1e293b;font-size:9pt;line-height:1.4;overflow:hidden}
.header{background:var(--navy);color:white;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:18pt;font-weight:700;letter-spacing:0.5px}.header .meta{font-size:8pt;color:#94a3b8}
.score-circle{width:52px;height:52px;border-radius:50%;background:white;color:var(--navy);display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:800}
.prop-bar{background:var(--light);border-bottom:3px solid var(--teal);padding:10px 24px;text-align:center;font-size:10pt;font-style:italic;color:var(--navy)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid var(--border)}
.cell{padding:12px 20px;border-right:1px solid var(--border)}
.cell:last-child{border-right:none}
.cell h3{font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:var(--teal);margin-bottom:6px;font-weight:700}
.snapshot-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.snap-item{text-align:center;background:var(--light);padding:6px;border-radius:4px}
.snap-item .label{font-size:7pt;color:var(--gray);text-transform:uppercase}.snap-item .val{font-size:10pt;font-weight:700;color:var(--navy)}
.kpi-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.kpi-card{text-align:center;background:var(--light);padding:8px 4px;border-radius:4px;border-left:3px solid var(--teal)}
.kpi-card .val{font-size:12pt;font-weight:800;color:var(--navy)}.kpi-card .label{font-size:7pt;color:var(--gray);text-transform:uppercase}
.traction-bars{display:flex;align-items:flex-end;gap:12px;height:50px;margin-top:4px}
.traction-col{flex:1;display:flex;flex-direction:column;align-items:center}
.traction-val{font-size:8pt;font-weight:700;color:var(--navy);margin-bottom:2px}
.traction-bar{width:100%;border-radius:3px 3px 0 0;background:linear-gradient(180deg,var(--teal),var(--blue));min-height:4px}
.traction-year{font-size:7pt;color:var(--gray);margin-top:2px}
.ask-box{background:var(--navy);color:white;padding:14px 20px;border-radius:6px;margin:0 20px}
.ask-box .amount{font-size:16pt;font-weight:800;color:var(--gold)}
.ask-box .detail{font-size:8pt;color:#94a3b8;margin-top:4px}
.points-grid{padding:12px 20px}
.points-grid ul{list-style:none;padding:0;columns:2;column-gap:16px}
.points-grid li{font-size:8pt;padding:2px 0;break-inside:avoid}
.points-grid li::before{content:"✓ ";color:var(--teal);font-weight:700}
.tag{display:inline-block;background:#e0f2fe;color:var(--blue);padding:1px 8px;border-radius:10px;font-size:7pt;margin:1px 2px}
.footer{background:var(--navy);color:#94a3b8;padding:10px 24px;font-size:7pt;display:flex;justify-content:space-between;position:absolute;bottom:0;left:0;right:0}
.odd-list{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
.team-text{font-size:8pt;color:#475569;margin-top:4px}
@media print{body{width:210mm;height:297mm}}
</style></head><body>
<div class="header">
  <div><h1>${ent.nom || 'Entreprise'}</h1><div class="meta">${ent.secteur || ''} · ${ent.pays || ''} · ${ent.effectifs || ''} employés · ${ent.forme_juridique || ''}</div></div>
  <div class="score-circle">${score}</div>
</div>
<div class="prop-bar">${data.proposition_valeur || ''}</div>

<div class="grid">
  <div class="cell">
    <h3>📋 Snapshot</h3>
    <div class="snapshot-grid">
      <div class="snap-item"><div class="label">Secteur</div><div class="val">${ent.secteur || '—'}</div></div>
      <div class="snap-item"><div class="label">Pays</div><div class="val">${ent.pays || '—'}</div></div>
      <div class="snap-item"><div class="label">Effectifs</div><div class="val">${ent.effectifs || '—'}</div></div>
      <div class="snap-item"><div class="label">Création</div><div class="val">${ent.creation || '—'}</div></div>
      <div class="snap-item"><div class="label">Forme</div><div class="val">${ent.forme_juridique || '—'}</div></div>
      <div class="snap-item"><div class="label">Score IR</div><div class="val">${score}/100</div></div>
    </div>
  </div>
  <div class="cell">
    <h3>🔴 Problème & Solution</h3>
    <p style="font-size:8pt;margin-bottom:4px"><strong>Problème :</strong> ${ps.probleme || '—'}</p>
    <p style="font-size:8pt"><strong>Solution :</strong> ${ps.solution || '—'}</p>
  </div>
</div>

<div class="grid">
  <div class="cell">
    <h3>📊 KPIs Financiers</h3>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="val">${kpis.marge_brute || '—'}</div><div class="label">Marge Brute</div></div>
      <div class="kpi-card"><div class="val">${kpis.ebitda || '—'}</div><div class="label">EBITDA</div></div>
      <div class="kpi-card"><div class="val">${kpis.resultat_net || '—'}</div><div class="label">Rés. Net</div></div>
      <div class="kpi-card"><div class="val">${kpis.tresorerie || '—'}</div><div class="label">Trésorerie</div></div>
      <div class="kpi-card"><div class="val">${kpis.ca || kpis.chiffre_affaires || '—'}</div><div class="label">CA</div></div>
      <div class="kpi-card"><div class="val">${kpis.croissance || traction.croissance || '—'}</div><div class="label">Croissance</div></div>
    </div>
  </div>
  <div class="cell">
    <h3>📈 Traction</h3>
    <div class="traction-bars">
      ${tractionYears.map(t => {
        const numVal = parseFloat(String(t.val || '0').replace(/[^\d.]/g, '')) || 0;
        const pct = Math.max((numVal / maxTraction) * 38, 4);
        return `<div class="traction-col"><div class="traction-val">${t.val || '—'}</div><div class="traction-bar" style="height:${pct}px"></div><div class="traction-year">${t.label}</div></div>`;
      }).join('')}
    </div>
    ${traction.clients ? `<p style="font-size:8pt;margin-top:6px;color:var(--gray)">Clients : ${traction.clients}</p>` : ''}
  </div>
</div>

<div class="grid">
  <div class="cell">
    <h3>🌍 Marché</h3>
    <p style="font-size:8pt"><strong>TAM :</strong> ${marche.tam || '—'} · <strong>SAM :</strong> ${marche.sam || '—'}</p>
    <p style="font-size:8pt;color:var(--gray);margin-top:4px">${marche.croissance || marche.description || ''}</p>
  </div>
  <div class="cell">
    <h3>🎯 Impact ODD & Équipe</h3>
    <div class="odd-list">${(data.impact_odd || []).map((o: string) => `<span class="tag">${o}</span>`).join('')}</div>
    <div class="team-text">${data.equipe || ''}</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;padding:0;border-bottom:1px solid var(--border)">
  <div style="padding:12px 0">
    <div class="ask-box">
      <div class="amount">${besoin.montant || '—'}</div>
      <div class="detail">${besoin.type || ''} — ${besoin.utilisation || ''}</div>
      ${data.valorisation_indicative ? `<div class="detail" style="margin-top:4px">Valorisation indicative : ${data.valorisation_indicative}</div>` : ''}
    </div>
  </div>
  <div class="points-grid">
    <h3 style="font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:var(--teal);margin-bottom:6px;font-weight:700">✨ Points Forts</h3>
    <ul>${(data.points_forts || []).slice(0, 8).map((p: string) => `<li>${p}</li>`).join('')}</ul>
  </div>
</div>

<div class="footer">
  <div>${(data.tags || [ent.secteur, ent.pays, besoin.type]).filter(Boolean).map((t: string) => `<span class="tag" style="background:rgba(255,255,255,0.1);color:#94a3b8">${t}</span>`).join(' ')}</div>
  <div>${data.contact?.nom || ''} · ${data.contact?.email || ''} · ${data.contact?.telephone || ''}</div>
</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `OnePager_${ent.nom || 'entreprise'}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scoreBg = score >= 70 ? 'bg-emerald-100 text-emerald-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

  // Parse traction values for bars
  const tractionYears = [
    { label: 'N-2', val: traction.ca_y_2 },
    { label: 'N-1', val: traction.ca_y_1 },
    { label: 'N', val: traction.ca_y0 },
  ];
  const maxTraction = Math.max(...tractionYears.map(t => parseFloat(String(t.val || '0').replace(/[^\d.]/g, '')) || 0), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-cyan-600" /> One-Pager Investisseur
        </h2>
        <div className="flex items-center gap-3">
          <Badge className={`text-lg px-4 py-2 ${scoreBg}`}>{score}/100</Badge>
          <Button variant="outline" size="sm" onClick={handleDownloadHtml}><Download className="h-3.5 w-3.5 mr-1" /> HTML A4</Button>
          {onRegenerate && <button onClick={onRegenerate} className="text-xs text-muted-foreground underline">Regénérer</button>}
        </div>
      </div>

      {/* A4-like card preview */}
      <div className="max-w-3xl mx-auto shadow-lg border-2 rounded-xl overflow-hidden bg-card">
        {/* Navy header */}
        <div className="bg-[#0F2B46] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{ent.nom || 'Entreprise'}</h1>
            <p className="text-xs text-slate-400">{ent.secteur} · {ent.pays} · {ent.effectifs} employés</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-white text-[#0F2B46] flex items-center justify-center text-xl font-extrabold">
            {score}
          </div>
        </div>

        {/* Proposition de valeur bar */}
        <div className="bg-muted/30 border-b-2 border-[#0E7C6B] px-6 py-2.5 text-center text-sm italic text-foreground">
          {data.proposition_valeur || '—'}
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Row 1: Snapshot | Problem/Solution */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0E7C6B] mb-2">📋 Snapshot</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { l: 'Secteur', v: ent.secteur },
                  { l: 'Pays', v: ent.pays },
                  { l: 'Effectifs', v: ent.effectifs },
                  { l: 'Création', v: ent.creation },
                  { l: 'Forme', v: ent.forme_juridique },
                  { l: 'Score IR', v: `${score}/100` },
                ].map((item, i) => (
                  <div key={i} className="text-center p-1.5 rounded bg-muted/50">
                    <p className="text-[8px] uppercase text-muted-foreground">{item.l}</p>
                    <p className="text-xs font-bold">{item.v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0E7C6B] mb-2">🔴 Problème & Solution</p>
              <div className="space-y-2">
                <div className="p-2 rounded bg-red-50"><p className="text-[10px] font-semibold text-red-600">Problème</p><p className="text-xs">{ps.probleme || '—'}</p></div>
                <div className="p-2 rounded bg-emerald-50"><p className="text-[10px] font-semibold text-emerald-600">Solution</p><p className="text-xs">{ps.solution || '—'}</p></div>
              </div>
            </div>
          </div>

          {/* Row 2: KPIs | Traction */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0E7C6B] mb-2">📊 KPIs Financiers</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { l: 'Marge Brute', v: kpis.marge_brute },
                  { l: 'EBITDA', v: kpis.ebitda },
                  { l: 'Rés. Net', v: kpis.resultat_net },
                  { l: 'Trésorerie', v: kpis.tresorerie },
                  { l: 'CA', v: kpis.ca || kpis.chiffre_affaires },
                  { l: 'Croissance', v: kpis.croissance || traction.croissance },
                ].map((m, i) => (
                  <div key={i} className="text-center p-1.5 rounded bg-muted/50 border-l-2 border-[#0E7C6B]">
                    <p className="text-xs font-bold">{m.v || '—'}</p>
                    <p className="text-[8px] uppercase text-muted-foreground">{m.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0E7C6B] mb-2">📈 Traction</p>
              <div className="flex items-end gap-3 h-[60px]">
                {tractionYears.map((t, i) => {
                  const numVal = parseFloat(String(t.val || '0').replace(/[^\d.]/g, '')) || 0;
                  const pct = Math.max((numVal / maxTraction) * 100, 8);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-foreground mb-1">{t.val || '—'}</span>
                      <div className="w-full rounded-t" style={{ height: `${pct * 0.38}px`, background: 'linear-gradient(180deg, #0E7C6B, #1B5E8A)' }} />
                      <span className="text-[8px] text-muted-foreground mt-0.5">{t.label}</span>
                    </div>
                  );
                })}
              </div>
              {traction.clients && <p className="text-[9px] text-muted-foreground mt-1">Clients : {traction.clients}</p>}
            </div>
          </div>

          {/* Row 3: Market | Impact + Team */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0E7C6B] mb-2">🌍 Marché</p>
              <div className="flex gap-3 text-xs">
                <span><strong>TAM :</strong> {marche.tam || '—'}</span>
                <span><strong>SAM :</strong> {marche.sam || '—'}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{marche.description || marche.croissance || ''}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0E7C6B] mb-2">🎯 Impact & Équipe</p>
              {data.impact_odd && data.impact_odd.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {data.impact_odd.slice(0, 6).map((o: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{o}</Badge>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">{data.equipe || ''}</p>
            </div>
          </div>

          {/* Row 4: Ask + Points forts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0F2B46] text-white rounded-lg p-4">
              <p className="text-lg font-extrabold text-[#C4841D]">{besoin.montant || '—'}</p>
              <p className="text-[10px] text-slate-400 mt-1">{besoin.type} — {besoin.utilisation}</p>
              {data.valorisation_indicative && <p className="text-[10px] text-slate-400 mt-1">Valorisation : {data.valorisation_indicative}</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0E7C6B] mb-2">✨ Points Forts</p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5 columns-2">
                {(data.points_forts || []).slice(0, 8).map((p: string, i: number) => (
                  <li key={i} className="break-inside-avoid">✓ {p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t flex justify-between text-[9px] text-muted-foreground">
            <span>{data.contact?.nom} · {data.contact?.email} · {data.contact?.telephone}</span>
            <span>ESONO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
