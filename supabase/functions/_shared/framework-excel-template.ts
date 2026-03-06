import JSZip from "https://esm.sh/jszip@3.10.1";

function escapeXml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Écrit une valeur dans une cellule du XML d'une feuille Excel.
 * Préserve toute la mise en forme existante du template.
 */
function setCellInXml(
  sheetXml: string,
  cellRef: string,
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === '') return sheetXml;

  const safeVal = String(value);
  const row = cellRef.match(/\d+/)?.[0] ?? '1';

  const isNum =
    typeof value === 'number' ||
    (typeof value === 'string' &&
      !isNaN(Number(value)) &&
      value.trim() !== '' &&
      !value.includes('%') &&
      !value.includes('/') &&
      !value.includes(' '));

  const newCell = isNum
    ? `<c r="${cellRef}"><v>${value}</v></c>`
    : `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(safeVal)}</t></is></c>`;

  // 1. Remplacer si la cellule existe déjà
  const existingCellRegex = new RegExp(
    `<c\\s+r="${cellRef}"(?:\\s[^>]*?)?>(?:(?!</c>).)*</c>`,
    's'
  );
  if (existingCellRegex.test(sheetXml)) {
    return sheetXml.replace(existingCellRegex, newCell);
  }

  // 2. Insérer dans la ligne existante
  const rowRegex = new RegExp(`(<row[^>]*\\br="${row}"[^>]*>)(.*?)(</row>)`, 's');
  if (rowRegex.test(sheetXml)) {
    return sheetXml.replace(rowRegex, (_, open, content, close) => {
      return `${open}${content}${newCell}${close}`;
    });
  }

  // 3. Créer la ligne si elle n'existe pas
  return sheetXml.replace('</sheetData>', `<row r="${row}">${newCell}</row></sheetData>`);
}

/**
 * Charge le template Framework depuis Supabase Storage et le remplit
 * avec les données framework_data produites par l'IA.
 */
export async function fillFrameworkExcelTemplate(
  data: any,
  enterpriseName: string,
  supabase: any
): Promise<Uint8Array> {

  // ── Charger le template depuis Storage ──
  const { data: fileData, error } = await supabase.storage
    .from('templates')
    .download('Framework_Analyse_PME_Cote_Ivoire.xlsx');

  if (error || !fileData) {
    throw new Error(`Template Excel introuvable dans Storage: ${error?.message ?? 'fichier absent'}`);
  }

  const buffer = await fileData.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // ── Données utilitaires ──
  const activites   = data.analyse_marge?.activites ?? [];
  const lignesProj  = data.projection_5ans?.lignes ?? [];
  const tableau     = data.scenarios?.tableau ?? [];
  const planAction  = data.plan_action ?? [];
  const sensib      = data.scenarios?.sensibilite ?? [];
  const bfr         = data.tresorerie_bfr ?? {};
  const comps       = bfr.composantes ?? [];
  const sante       = data.sante_financiere ?? {};
  const cols        = ['B', 'C', 'D', 'E', 'F'];
  const years       = ['an1', 'an2', 'an3', 'an4', 'an5'];

  const getProjLigne = (poste: string) =>
    lignesProj.find((l: any) => l.poste === poste);
  const getScenario = (ind: string) =>
    tableau.find((r: any) => r.indicateur?.toLowerCase().includes(ind.toLowerCase()));

  // ── Onglet 1 : Données Historiques ──
  let s1 = await zip.file('xl/worksheets/sheet1.xml')?.async('string') ?? '';
  s1 = setCellInXml(s1, 'B5', enterpriseName);
  s1 = setCellInXml(s1, 'B7', new Date().toLocaleDateString('fr-FR'));
  s1 = setCellInXml(s1, 'B8', 'ESONO Platform');
  if (data.kpis?.ca_annee_n)  s1 = setCellInXml(s1, 'D12', data.kpis.ca_annee_n);
  activites.slice(0, 3).forEach((act: any, i: number) => {
    if (act.nom) s1 = setCellInXml(s1, `A${13 + i}`, `CA ${act.nom}`);
    if (act.ca)  s1 = setCellInXml(s1, `D${13 + i}`, act.ca);
  });
  const margeBruteTotal = activites.reduce((s: number, a: any) => s + (Number(a.marge_brute) || 0), 0);
  if (margeBruteTotal > 0) s1 = setCellInXml(s1, 'D25', margeBruteTotal);
  if (data.ratios?.rentabilite?.marge_brute?.valeur) s1 = setCellInXml(s1, 'D26', data.ratios.rentabilite.marge_brute.valeur);
  if (data.kpis?.ebitda)       s1 = setCellInXml(s1, 'D38', data.kpis.ebitda);
  if (data.kpis?.marge_ebitda) s1 = setCellInXml(s1, 'D39', data.kpis.marge_ebitda);
  const resNetLigne = getProjLigne('Résultat Net');
  if (resNetLigne?.an1) s1 = setCellInXml(s1, 'D40', resNetLigne.an1);
  if (data.ratios?.rentabilite?.marge_nette?.valeur) s1 = setCellInXml(s1, 'D41', data.ratios.rentabilite.marge_nette.valeur);
  if (bfr.tresorerie_nette) s1 = setCellInXml(s1, 'D45', bfr.tresorerie_nette);
  zip.file('xl/worksheets/sheet1.xml', s1);

  // ── Onglet 2 : Analyse Marges ──
  let s2 = await zip.file('xl/worksheets/sheet2.xml')?.async('string') ?? '';
  activites.slice(0, 4).forEach((act: any, i: number) => {
    const row = 6 + i;
    if (act.nom) s2 = setCellInXml(s2, `A${row}`, act.nom);
    if (act.ca)  s2 = setCellInXml(s2, `B${row}`, act.ca);
    const coutsDir = (Number(act.ca) || 0) - (Number(act.marge_brute) || 0);
    if (coutsDir > 0) s2 = setCellInXml(s2, `C${row}`, coutsDir);
    if (act.marge_brute)    s2 = setCellInXml(s2, `D${row}`, act.marge_brute);
    if (act.marge_pct)      s2 = setCellInXml(s2, `E${row}`, act.marge_pct);
    if (act.classification) s2 = setCellInXml(s2, `F${row}`, act.classification);
  });
  const renforcer   = activites.filter((a: any) => a.classification === 'RENFORCER').map((a: any) => a.nom).join(', ');
  const optimiser   = activites.filter((a: any) => ['ARBITRER', 'OPTIMISER'].includes(a.classification)).map((a: any) => a.nom).join(', ');
  const restructurer = activites.filter((a: any) => a.classification === 'RESTRUCTURER').map((a: any) => a.nom).join(', ');
  if (renforcer)    s2 = setCellInXml(s2, 'B20', renforcer);
  if (optimiser)    s2 = setCellInXml(s2, 'B21', optimiser);
  if (data.analyse_marge?.message_cle) s2 = setCellInXml(s2, 'B22', data.analyse_marge.message_cle);
  if (restructurer) s2 = setCellInXml(s2, 'B23', restructurer);
  zip.file('xl/worksheets/sheet2.xml', s2);

  // ── Onglet 3 : Structure Coûts ──
  let s3 = await zip.file('xl/worksheets/sheet3.xml')?.async('string') ?? '';
  if (data.indicateurs_cles?.charges_fixes_ca)         s3 = setCellInXml(s3, 'D6',  data.indicateurs_cles.charges_fixes_ca);
  if (data.indicateurs_cles?.masse_salariale_ca)        s3 = setCellInXml(s3, 'D7',  data.indicateurs_cles.masse_salariale_ca);
  if (data.ratios?.rentabilite?.marge_brute?.valeur)    s3 = setCellInXml(s3, 'D8',  data.ratios.rentabilite.marge_brute.valeur);
  if (data.kpis?.marge_ebitda)                          s3 = setCellInXml(s3, 'D9',  data.kpis.marge_ebitda);
  if (data.ratios?.rentabilite?.marge_nette?.valeur)    s3 = setCellInXml(s3, 'D10', data.ratios.rentabilite.marge_nette.valeur);
  const forcesStr    = (sante.forces ?? []).slice(0, 3).join(' | ');
  const faiblStr     = (sante.faiblesses ?? []).slice(0, 3).join(' | ');
  const actionsCourt = planAction.filter((a: any) => a.horizon === 'COURT').map((a: any) => a.action).slice(0, 2).join(' | ');
  if (forcesStr)    s3 = setCellInXml(s3, 'B25', forcesStr);
  if (faiblStr)     s3 = setCellInXml(s3, 'B26', faiblStr);
  if (actionsCourt) s3 = setCellInXml(s3, 'B27', actionsCourt);
  zip.file('xl/worksheets/sheet3.xml', s3);

  // ── Onglet 4 : Trésorerie BFR ──
  let s4 = await zip.file('xl/worksheets/sheet4.xml')?.async('string') ?? '';
  if (bfr.tresorerie_nette)       s4 = setCellInXml(s4, 'D6', bfr.tresorerie_nette);
  if (bfr.cashflow_operationnel)  s4 = setCellInXml(s4, 'D7', bfr.cashflow_operationnel);
  if (bfr.caf)                    s4 = setCellInXml(s4, 'D8', bfr.caf);
  if (bfr.dscr)                   s4 = setCellInXml(s4, 'D9', bfr.dscr);
  const dso    = comps.find((c: any) => /client|dso/i.test(c.indicateur));
  const dpo    = comps.find((c: any) => /fourn|dpo/i.test(c.indicateur));
  const stock  = comps.find((c: any) => /stock/i.test(c.indicateur));
  const bfrC   = comps.find((c: any) => /^bfr/i.test(c.indicateur));
  if (dso?.valeur)   s4 = setCellInXml(s4, 'D14', dso.valeur);
  if (dpo?.valeur)   s4 = setCellInXml(s4, 'D15', dpo.valeur);
  if (stock?.valeur) s4 = setCellInXml(s4, 'D16', stock.valeur);
  if (bfrC?.valeur)  s4 = setCellInXml(s4, 'D17', bfrC.valeur);
  if (data.ratios?.solvabilite?.endettement?.valeur) s4 = setCellInXml(s4, 'D24', data.ratios.solvabilite.endettement.valeur);
  zip.file('xl/worksheets/sheet4.xml', s4);

  // ── Onglet 5 : Hypothèses Projection ──
  let s5 = await zip.file('xl/worksheets/sheet5.xml')?.async('string') ?? '';
  const caRef   = Number(data.kpis?.ca_annee_n) || 1;
  const caLigne = getProjLigne('CA Total');
  if (caLigne) {
    const vals     = [caLigne.an1, caLigne.an2, caLigne.an3, caLigne.an4, caLigne.an5];
    const prevVals = [caRef, caLigne.an1, caLigne.an2, caLigne.an3, caLigne.an4];
    vals.forEach((v: any, i: number) => {
      const prev = Number(prevVals[i]);
      if (v && prev > 0) {
        const growth = (((Number(v) - prev) / prev) * 100).toFixed(1) + '%';
        s5 = setCellInXml(s5, `${cols[i]}6`, growth);
      }
    });
  }
  activites.slice(0, 3).forEach((act: any, i: number) => {
    if (act.nom) s5 = setCellInXml(s5, `A${7 + i}`, act.nom);
  });
  if (data.besoins_financiers?.capex_total) s5 = setCellInXml(s5, 'B32', data.besoins_financiers.capex_total);
  if (data.besoins_financiers?.timing)      s5 = setCellInXml(s5, 'G32', data.besoins_financiers.timing);
  zip.file('xl/worksheets/sheet5.xml', s5);

  // ── Onglet 6 : Projection 5 Ans ──
  let s6 = await zip.file('xl/worksheets/sheet6.xml')?.async('string') ?? '';
  const projRowMap: Record<number, string> = {
    6:  'CA Total',
    12: 'Marge Brute',
    13: 'Marge Brute (%)',
    20: 'EBITDA',
    21: 'Marge EBITDA (%)',
    23: 'Résultat Net',
    32: 'Cash-Flow Net',
    33: 'Trésorerie Cumulée',
  };
  for (const [rowNum, poste] of Object.entries(projRowMap)) {
    const ligne = getProjLigne(poste);
    if (!ligne) continue;
    years.forEach((yr, i) => {
      const val = ligne[yr];
      if (val != null && val !== '') s6 = setCellInXml(s6, `${cols[i]}${rowNum}`, val);
    });
    if (poste === 'CA Total' && ligne.cagr) s6 = setCellInXml(s6, 'G6', ligne.cagr);
  }
  if (data.seuil_rentabilite?.ca_point_mort) s6 = setCellInXml(s6, 'B39', data.seuil_rentabilite.ca_point_mort);
  if (data.seuil_rentabilite?.atteint_en)    s6 = setCellInXml(s6, 'B40', data.seuil_rentabilite.atteint_en);
  zip.file('xl/worksheets/sheet6.xml', s6);

  // ── Onglet 7 : Scénarios ──
  let s7 = await zip.file('xl/worksheets/sheet7.xml')?.async('string') ?? '';
  const scenRows: [number, string][] = [
    [13, 'CA An 5'], [14, 'EBITDA An 5'], [15, 'Marge EBITDA'],
    [16, 'Résultat Net'], [17, 'Trésorerie'], [18, 'ROI'],
  ];
  for (const [rowNum, ind] of scenRows) {
    const r = getScenario(ind);
    if (!r) continue;
    if (r.prudent)   s7 = setCellInXml(s7, `B${rowNum}`, r.prudent);
    if (r.central)   s7 = setCellInXml(s7, `C${rowNum}`, r.central);
    if (r.ambitieux) s7 = setCellInXml(s7, `D${rowNum}`, r.ambitieux);
    if (r.prudent && r.ambitieux) s7 = setCellInXml(s7, `E${rowNum}`, `${r.prudent} → ${r.ambitieux}`);
  }
  if (sensib[0]) s7 = setCellInXml(s7, 'B23', sensib[0]);
  if (sensib[1]) s7 = setCellInXml(s7, 'B24', sensib[1]);
  if (sensib[2]) s7 = setCellInXml(s7, 'B25', sensib[2]);
  if (data.scenarios?.recommandation_scenario) s7 = setCellInXml(s7, 'B29', data.scenarios.recommandation_scenario);
  if (data.synthese_expert) s7 = setCellInXml(s7, 'B30', data.synthese_expert.substring(0, 500));
  zip.file('xl/worksheets/sheet7.xml', s7);

  // ── Onglet 8 : Synthèse Exécutive ──
  let s8 = await zip.file('xl/worksheets/sheet8.xml')?.async('string') ?? '';
  const resumeChiffres = (sante.resume_chiffres ?? []).join(' | ');
  const forcesTexte    = (sante.forces ?? []).slice(0, 3).map((f: string, i: number) => `${i + 1}. ${f}`).join('\n');
  const faiblTexte     = (sante.faiblesses ?? []).slice(0, 3).map((f: string, i: number) => `${i + 1}. ${f}`).join('\n');
  if (resumeChiffres) s8 = setCellInXml(s8, 'B7',  resumeChiffres);
  if (forcesTexte)    s8 = setCellInXml(s8, 'B9',  forcesTexte);
  if (faiblTexte)     s8 = setCellInXml(s8, 'B12', faiblTexte);
  const actFort = activites.filter((a: any) => a.classification === 'RENFORCER').map((a: any) => `${a.nom} → marge ${a.marge_pct}`).join(', ');
  const actProb = activites.filter((a: any) => a.classification !== 'RENFORCER').map((a: any) => `${a.nom} (${a.classification})`).join(', ');
  if (actFort) s8 = setCellInXml(s8, 'B18', actFort);
  if (actProb) s8 = setCellInXml(s8, 'B21', actProb);
  const planTexte = planAction.slice(0, 5).map((a: any, i: number) =>
    `${i + 1}. [${a.horizon}] ${a.action}${a.cout ? ` (${a.cout})` : ''}`
  ).join('\n');
  const impactTexte = [
    data.impact_attendu?.ca_an5     ? `CA An5: ${data.impact_attendu.ca_an5}`         : '',
    data.impact_attendu?.ebitda_an5 ? `EBITDA: ${data.impact_attendu.ebitda_an5}`     : '',
    data.impact_attendu?.marge_ebitda ? `Marge: ${data.impact_attendu.marge_ebitda}`  : '',
  ].filter(Boolean).join(' | ');
  const besoinsTexte = [
    data.besoins_financiers?.capex_total ? `CAPEX: ${data.besoins_financiers.capex_total}` : '',
    data.besoins_financiers?.timing      ? `Timing: ${data.besoins_financiers.timing}`     : '',
  ].filter(Boolean).join(' | ');
  if (planTexte)    s8 = setCellInXml(s8, 'B28', planTexte);
  if (impactTexte)  s8 = setCellInXml(s8, 'B31', impactTexte);
  if (besoinsTexte) s8 = setCellInXml(s8, 'B34', besoinsTexte);
  zip.file('xl/worksheets/sheet8.xml', s8);

  // ── Re-générer le ZIP ──
  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
