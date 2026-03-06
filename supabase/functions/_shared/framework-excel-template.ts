import JSZip from "https://esm.sh/jszip@3.10.1";

// ===== XML HELPERS =====

function escapeXml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
      !value.includes(' ') &&
      !value.includes('→'));

  const newCell = isNum
    ? `<c r="${cellRef}"><v>${value}</v></c>`
    : `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(safeVal)}</t></is></c>`;

  // 1. Replace existing cell
  const existingCellRegex = new RegExp(
    `<c\\s+r="${cellRef}"(?:\\s[^>]*?)?>(?:(?!</c>).)*</c>`,
    's'
  );
  if (existingCellRegex.test(sheetXml)) {
    return sheetXml.replace(existingCellRegex, newCell);
  }

  // 2. Insert into existing row
  const rowRegex = new RegExp(`(<row[^>]*\\br="${row}"[^>]*>)(.*?)(</row>)`, 's');
  if (rowRegex.test(sheetXml)) {
    return sheetXml.replace(rowRegex, (_, open, content, close) => {
      return `${open}${content}${newCell}${close}`;
    });
  }

  // 3. Create row
  return sheetXml.replace('</sheetData>', `<row r="${row}">${newCell}</row></sheetData>`);
}

/**
 * Find the XML row number containing a text label (searches inline strings).
 */
function findRowByLabel(sheetXml: string, label: string): number | null {
  const labelLower = label.toLowerCase().trim();
  const rowRegex = /<row[^>]*\br="(\d+)"[^>]*>.*?<\/row>/gs;
  let match;
  while ((match = rowRegex.exec(sheetXml)) !== null) {
    const rowNum = parseInt(match[1]);
    const rowContent = match[0];
    const textMatches = rowContent.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
    for (const tm of textMatches) {
      if (tm[1].toLowerCase().trim().includes(labelLower)) {
        return rowNum;
      }
    }
  }
  return null;
}

/** Clean a value to a number, stripping %, spaces, FCFA etc. Returns null if not parseable. */
function cleanNumber(value: any): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[%\s,€$FCFA]/gi, '').replace(/\u00a0/g, '').trim();
    if (cleaned === '' || cleaned === 'N/A' || cleaned === 'n/a') return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

/** Interpolate missing year values in projection data */
function interpolateYears(ligne: any): any {
  if (!ligne) return ligne;
  const yrs = ['an1', 'an2', 'an3', 'an4', 'an5'];
  const result = { ...ligne };
  // Forward pass
  for (let i = 0; i < yrs.length; i++) {
    if (result[yrs[i]] == null || result[yrs[i]] === '') {
      const prev = i > 0 ? cleanNumber(result[yrs[i - 1]]) : null;
      const next = i < 4 ? cleanNumber(result[yrs[i + 1]]) : null;
      if (prev !== null && next !== null) {
        result[yrs[i]] = Math.round((prev + next) / 2);
      } else if (prev !== null && i > 1) {
        const prevPrev = cleanNumber(result[yrs[i - 2]]);
        if (prevPrev !== null) result[yrs[i]] = Math.round(prev + (prev - prevPrev));
      }
    }
  }
  // Backward pass for remaining gaps
  for (let i = yrs.length - 1; i >= 0; i--) {
    if (result[yrs[i]] == null || result[yrs[i]] === '') {
      const next = i < 4 ? cleanNumber(result[yrs[i + 1]]) : null;
      if (next !== null) {
        // Use next value with slight reduction
        result[yrs[i]] = Math.round(next * 0.85);
      }
    }
  }
  return result;
}

// ===== MAIN EXPORT =====

export async function fillFrameworkExcelTemplate(
  data: any,
  enterpriseName: string,
  supabase: any
): Promise<Uint8Array> {

  const { data: fileData, error } = await supabase.storage
    .from('templates')
    .download('Framework_Analyse_PME_Cote_Ivoire.xlsx');

  if (error || !fileData) {
    throw new Error(`Template Excel introuvable dans Storage: ${error?.message ?? 'fichier absent'}`);
  }

  const buffer = await fileData.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // ── Data shortcuts ──
  const activites    = data.analyse_marge?.activites ?? [];
  const lignesProj   = data.projection_5ans?.lignes ?? [];
  const tableau      = data.scenarios?.tableau ?? [];
  const planAction   = data.plan_action ?? [];
  const sensib       = data.scenarios?.sensibilite ?? [];
  const bfr          = data.tresorerie_bfr ?? {};
  const comps        = bfr.composantes ?? [];
  const sante        = data.sante_financiere ?? {};
  const ratios       = data.ratios ?? {};
  const ratiosHist   = data.ratios_historiques ?? [];
  const indicateurs  = data.indicateurs_cles ?? {};
  const cols         = ['B', 'C', 'D', 'E', 'F'];
  const years: string[] = ['an1', 'an2', 'an3', 'an4', 'an5'];

  // ── Improved helper functions ──
  const getProjLigne = (poste: string) => {
    if (!lignesProj.length) return null;
    const posteLower = poste.toLowerCase().trim();
    return lignesProj.find((l: any) => {
      const p = String(l.poste || '').toLowerCase().trim();
      return p === posteLower || p.includes(posteLower) || posteLower.includes(p);
    });
  };

  const getScenario = (ind: string) => {
    const indLower = ind.toLowerCase();
    return tableau.find((r: any) => {
      const ri = String(r.indicateur || '').toLowerCase();
      return ri.includes(indLower) || indLower.includes(ri);
    });
  };

  const getHistRatio = (name: string) => {
    if (!ratiosHist || !Array.isArray(ratiosHist)) return null;
    const nameLower = name.toLowerCase().trim();
    return ratiosHist.find((r: any) => {
      const ratioName = String(r.ratio || '').toLowerCase();
      return ratioName.includes(nameLower) ||
             nameLower.includes(ratioName) ||
             (nameLower.includes('ca') && (ratioName.includes('chiffre') || ratioName.includes('ca total'))) ||
             (nameLower.includes('chiffre') && ratioName.includes('ca'));
    });
  };

  /** Write a cleaned number into a cell */
  const setNum = (xml: string, ref: string, val: any): string => {
    const n = cleanNumber(val);
    if (n === null) return xml;
    return setCellInXml(xml, ref, n);
  };

  /** Write a string into a cell */
  const setStr = (xml: string, ref: string, val: any): string => {
    if (val == null || val === '') return xml;
    return setCellInXml(xml, ref, String(val));
  };

  // ── Pre-compute key financial values ──
  const caAnneeN = cleanNumber(data.kpis?.ca_annee_n) || 0;
  const ebitdaN = cleanNumber(data.kpis?.ebitda) || 0;
  const margeBruteTotal = activites.reduce((s: number, a: any) => s + (cleanNumber(a.marge_brute) || 0), 0);
  const totalCA = activites.reduce((s: number, a: any) => s + (cleanNumber(a.ca) || 0), 0);
  const totalCoutsDir = totalCA - margeBruteTotal;

  // Historical data from ratios_historiques
  const histCA = getHistRatio('chiffre') || getHistRatio('ca total') || getHistRatio('ca');
  const histMB = getHistRatio('marge brute');
  const histEBITDA = getHistRatio('ebitda');
  const histRN = getHistRatio('résultat net') || getHistRatio('resultat net');
  const histTreso = getHistRatio('trésorerie') || getHistRatio('tresorerie');
  const histCharges = getHistRatio('charges fixes');
  const histMasseS = getHistRatio('masse salariale');
  const histMargeNette = getHistRatio('marge nette');
  const histCoutsDir = getHistRatio('coûts directs') || getHistRatio('couts directs') || getHistRatio('cout');

  // ────────────────────────────────────────────────
  // SHEET 1: Données Historiques
  // ────────────────────────────────────────────────
  let s1 = await zip.file('xl/worksheets/sheet1.xml')?.async('string') ?? '';

  // Header info
  s1 = setStr(s1, 'B5', enterpriseName);
  s1 = setStr(s1, 'B6', data.sector || '');
  s1 = setStr(s1, 'B7', new Date().toLocaleDateString('fr-FR'));
  s1 = setStr(s1, 'B8', 'ESONO Platform');

  // === CA Total (row 12): B=N-2, C=N-1, D=N ===
  s1 = setNum(s1, 'B12', histCA?.n_moins_2);
  s1 = setNum(s1, 'C12', histCA?.n_moins_1);
  s1 = setNum(s1, 'D12', caAnneeN || histCA?.n);

  // CA evolution (col E)
  const caN2 = cleanNumber(histCA?.n_moins_2);
  const caN1 = cleanNumber(histCA?.n_moins_1);
  const caN = caAnneeN || cleanNumber(histCA?.n);
  if (caN1 && caN) {
    const evol = ((caN - caN1) / caN1 * 100).toFixed(1) + '%';
    s1 = setStr(s1, 'E12', evol);
  }

  // CA by activity (rows 13-15) with historical estimation
  activites.slice(0, 3).forEach((act: any, i: number) => {
    const row = 13 + i;
    const actCA = cleanNumber(act.ca) || 0;
    s1 = setStr(s1, `A${row}`, `CA ${act.nom || `Activité ${i + 1}`}`);

    // Current year
    s1 = setNum(s1, `D${row}`, actCA);

    // Estimate historical proportions
    if (caN && caN > 0 && actCA > 0) {
      const proportion = actCA / caN;
      if (caN2) s1 = setNum(s1, `B${row}`, Math.round(caN2 * proportion));
      if (caN1) s1 = setNum(s1, `C${row}`, Math.round(caN1 * proportion));
    }
  });

  // Row 16: Autres (fill with 0 if no more activities)
  s1 = setNum(s1, 'B16', 0);
  s1 = setNum(s1, 'C16', 0);
  s1 = setNum(s1, 'D16', 0);

  // === Coûts directs (row 19) ===
  s1 = setNum(s1, 'D19', totalCoutsDir);
  if (caN2 && caN && totalCoutsDir > 0) {
    const coutsProportion = totalCoutsDir / caN;
    s1 = setNum(s1, 'B19', Math.round(caN2 * coutsProportion));
    if (caN1) s1 = setNum(s1, 'C19', Math.round(caN1 * coutsProportion));
  }
  s1 = setNum(s1, 'B19', histCoutsDir?.n_moins_2 || undefined);
  s1 = setNum(s1, 'C19', histCoutsDir?.n_moins_1 || undefined);

  // === Charges fixes (row 20) ===
  const chargesFixesN = cleanNumber(histCharges?.n);
  if (chargesFixesN) s1 = setNum(s1, 'D20', chargesFixesN);
  s1 = setNum(s1, 'B20', histCharges?.n_moins_2);
  s1 = setNum(s1, 'C20', histCharges?.n_moins_1);

  // === Marge Brute (row 25) ===
  s1 = setNum(s1, 'D25', margeBruteTotal || (caN ? caN - totalCoutsDir : undefined));
  s1 = setNum(s1, 'B25', histMB?.n_moins_2);
  s1 = setNum(s1, 'C25', histMB?.n_moins_1);

  // Marge Brute % (row 26) - as NUMBERS not percentages
  const margeBrutePctN = cleanNumber(ratios.rentabilite?.marge_brute?.valeur);
  s1 = setNum(s1, 'D26', margeBrutePctN);
  const histMBpct = getHistRatio('marge brute');
  if (histMBpct) {
    s1 = setNum(s1, 'B26', cleanNumber(histMBpct.n_moins_2));
    s1 = setNum(s1, 'C26', cleanNumber(histMBpct.n_moins_1));
  }

  // === EBITDA (row 38) ===
  s1 = setNum(s1, 'D38', ebitdaN);
  s1 = setNum(s1, 'B38', histEBITDA?.n_moins_2);
  s1 = setNum(s1, 'C38', histEBITDA?.n_moins_1);

  // Marge EBITDA % (row 39)
  s1 = setNum(s1, 'D39', cleanNumber(data.kpis?.marge_ebitda));
  if (histEBITDA) {
    const ebitdaN2 = cleanNumber(histEBITDA.n_moins_2);
    const ebitdaN1 = cleanNumber(histEBITDA.n_moins_1);
    if (ebitdaN2 && caN2) s1 = setNum(s1, 'B39', Math.round((ebitdaN2 / caN2) * 100));
    if (ebitdaN1 && caN1) s1 = setNum(s1, 'C39', Math.round((ebitdaN1 / caN1) * 100));
  }

  // === Résultat Net (row 40) ===
  s1 = setNum(s1, 'D40', histRN?.n);
  s1 = setNum(s1, 'B40', histRN?.n_moins_2);
  s1 = setNum(s1, 'C40', histRN?.n_moins_1);

  // Marge nette % (row 41)
  s1 = setNum(s1, 'D41', cleanNumber(ratios.rentabilite?.marge_nette?.valeur));
  if (histMargeNette) {
    s1 = setNum(s1, 'B41', cleanNumber(histMargeNette.n_moins_2));
    s1 = setNum(s1, 'C41', cleanNumber(histMargeNette.n_moins_1));
  } else if (histRN) {
    const rnN2 = cleanNumber(histRN.n_moins_2);
    const rnN1 = cleanNumber(histRN.n_moins_1);
    if (rnN2 && caN2) s1 = setNum(s1, 'B41', Math.round((rnN2 / caN2) * 100));
    if (rnN1 && caN1) s1 = setNum(s1, 'C41', Math.round((rnN1 / caN1) * 100));
  }

  // === Trésorerie (row 45) ===
  s1 = setNum(s1, 'D45', bfr.tresorerie_nette);
  s1 = setNum(s1, 'B45', histTreso?.n_moins_2);
  s1 = setNum(s1, 'C45', histTreso?.n_moins_1);

  zip.file('xl/worksheets/sheet1.xml', s1);
  console.log('[sheet1] Données historiques remplies');

  // ────────────────────────────────────────────────
  // SHEET 2: Analyse des Marges par Activité
  // ────────────────────────────────────────────────
  let s2 = await zip.file('xl/worksheets/sheet2.xml')?.async('string') ?? '';

  activites.slice(0, 4).forEach((act: any, i: number) => {
    const row = 6 + i;
    const actCA = cleanNumber(act.ca) || 0;
    const actMB = cleanNumber(act.marge_brute) || 0;
    const coutsDir = actCA - actMB;

    s2 = setStr(s2, `A${row}`, act.nom || `Activité ${i + 1}`);
    s2 = setNum(s2, `B${row}`, actCA);
    s2 = setNum(s2, `C${row}`, coutsDir > 0 ? coutsDir : 0);
    s2 = setNum(s2, `D${row}`, actMB);
    s2 = setStr(s2, `E${row}`, act.marge_pct || (actCA > 0 ? ((actMB / actCA) * 100).toFixed(0) + '%' : '0%'));
    s2 = setStr(s2, `F${row}`, act.classification || '');
  });

  // Total row (row 10)
  if (totalCA > 0) {
    s2 = setNum(s2, 'B10', totalCA);
    s2 = setNum(s2, 'C10', totalCoutsDir);
    s2 = setNum(s2, 'D10', margeBruteTotal);
    s2 = setStr(s2, 'E10', ((margeBruteTotal / totalCA) * 100).toFixed(1) + '%');
  }

  // Recommendations (rows 20-23)
  const renforcer    = activites.filter((a: any) => a.classification === 'RENFORCER').map((a: any) => a.nom).join(', ');
  const optimiser    = activites.filter((a: any) => ['ARBITRER', 'OPTIMISER'].includes(a.classification)).map((a: any) => a.nom).join(', ');
  const restructurer = activites.filter((a: any) => ['RESTRUCTURER', 'ARRÊTER'].includes(a.classification)).map((a: any) => a.nom).join(', ');
  if (renforcer)    s2 = setStr(s2, 'B20', renforcer);
  if (optimiser)    s2 = setStr(s2, 'B21', optimiser);
  if (data.analyse_marge?.message_cle) s2 = setStr(s2, 'B22', data.analyse_marge.message_cle);
  if (restructurer) s2 = setStr(s2, 'B23', restructurer);
  if (data.analyse_marge?.verdict) s2 = setStr(s2, 'A25', data.analyse_marge.verdict);

  zip.file('xl/worksheets/sheet2.xml', s2);
  console.log('[sheet2] Analyse marges remplie');

  // ────────────────────────────────────────────────
  // SHEET 3: Structure de Coûts & Efficacité
  // ────────────────────────────────────────────────
  let s3 = await zip.file('xl/worksheets/sheet3.xml')?.async('string') ?? '';

  // Ratios clés (rows 6-10, col D = Année N) — as NUMBERS
  s3 = setNum(s3, 'D6',  cleanNumber(indicateurs.charges_fixes_ca));
  s3 = setNum(s3, 'D7',  cleanNumber(indicateurs.masse_salariale_ca));
  s3 = setNum(s3, 'D8',  cleanNumber(ratios.rentabilite?.marge_brute?.valeur));
  s3 = setNum(s3, 'D9',  cleanNumber(data.kpis?.marge_ebitda));
  s3 = setNum(s3, 'D10', cleanNumber(ratios.rentabilite?.marge_nette?.valeur));

  // Historical ratios (cols B, C) — search by ratio name
  const histChargesRatio = getHistRatio('charges fixes');
  const histMasseSRatio = getHistRatio('masse salariale');
  const histMBRatio = getHistRatio('marge brute');
  const histEBITDARatio = getHistRatio('ebitda') || getHistRatio('marge ebitda');
  const histMNRatio = getHistRatio('marge nette');

  // Row 6: Charges Fixes / CA
  s3 = setNum(s3, 'B6', cleanNumber(histChargesRatio?.n_moins_2));
  s3 = setNum(s3, 'C6', cleanNumber(histChargesRatio?.n_moins_1));
  // Row 7: Masse Salariale / CA
  s3 = setNum(s3, 'B7', cleanNumber(histMasseSRatio?.n_moins_2));
  s3 = setNum(s3, 'C7', cleanNumber(histMasseSRatio?.n_moins_1));
  // Row 8: Marge Brute
  s3 = setNum(s3, 'B8', cleanNumber(histMBRatio?.n_moins_2));
  s3 = setNum(s3, 'C8', cleanNumber(histMBRatio?.n_moins_1));
  // Row 9: Marge EBITDA
  s3 = setNum(s3, 'B9', cleanNumber(histEBITDARatio?.n_moins_2));
  s3 = setNum(s3, 'C9', cleanNumber(histEBITDARatio?.n_moins_1));
  // Row 10: Marge Nette
  s3 = setNum(s3, 'B10', cleanNumber(histMNRatio?.n_moins_2));
  s3 = setNum(s3, 'C10', cleanNumber(histMNRatio?.n_moins_1));

  // Evolution des charges (rows 15-16 area) — Salaires and Loyers historical
  const histSalaires = getHistRatio('salaires') || getHistRatio('charges sociales');
  if (histSalaires) {
    s3 = setNum(s3, 'B15', cleanNumber(histSalaires.n_moins_2));
    s3 = setNum(s3, 'C15', cleanNumber(histSalaires.n_moins_1));
  }
  const histLoyers = getHistRatio('loyers') || getHistRatio('loyer');
  if (histLoyers) {
    s3 = setNum(s3, 'B16', cleanNumber(histLoyers.n_moins_2));
    s3 = setNum(s3, 'C16', cleanNumber(histLoyers.n_moins_1));
  }

  // Diagnostic section (rows 25-27)
  const forcesStr    = (sante.forces ?? data.points_forts ?? []).slice(0, 3).join(' | ');
  const faiblStr     = (sante.faiblesses ?? data.points_faibles ?? []).slice(0, 3).join(' | ');
  const actionsCourt = planAction.filter((a: any) => a.horizon === 'COURT').map((a: any) => a.action).slice(0, 2).join(' | ');
  if (forcesStr)    s3 = setStr(s3, 'B25', forcesStr);
  if (faiblStr)     s3 = setStr(s3, 'B26', faiblStr);
  if (actionsCourt) s3 = setStr(s3, 'B27', actionsCourt);
  if (data.verdict_indicateurs) s3 = setStr(s3, 'A29', data.verdict_indicateurs);

  zip.file('xl/worksheets/sheet3.xml', s3);
  console.log('[sheet3] Structure coûts remplie');

  // ────────────────────────────────────────────────
  // SHEET 4: Trésorerie & BFR
  // ────────────────────────────────────────────────
  let s4 = await zip.file('xl/worksheets/sheet4.xml')?.async('string') ?? '';

  // Trésorerie indicators (rows 6-9) with historical
  s4 = setNum(s4, 'D6', bfr.tresorerie_nette);
  s4 = setNum(s4, 'D7', bfr.cashflow_operationnel);
  s4 = setNum(s4, 'D8', bfr.caf);
  s4 = setStr(s4, 'D9', bfr.dscr);

  // Historical trésorerie (rows 6-8)
  const histTresoDetail = getHistRatio('trésorerie nette') || getHistRatio('tresorerie');
  if (histTresoDetail) {
    s4 = setNum(s4, 'B6', cleanNumber(histTresoDetail.n_moins_2));
    s4 = setNum(s4, 'C6', cleanNumber(histTresoDetail.n_moins_1));
  }
  const histCashflow = getHistRatio('cash-flow') || getHistRatio('cashflow');
  if (histCashflow) {
    s4 = setNum(s4, 'B7', cleanNumber(histCashflow.n_moins_2));
    s4 = setNum(s4, 'C7', cleanNumber(histCashflow.n_moins_1));
  }
  const histCAF = getHistRatio('caf') || getHistRatio('capacité');
  if (histCAF) {
    s4 = setNum(s4, 'B8', cleanNumber(histCAF.n_moins_2));
    s4 = setNum(s4, 'C8', cleanNumber(histCAF.n_moins_1));
  }

  // BFR composantes (rows 14-18) with historical
  const dso    = comps.find((c: any) => /client|dso|crédit.*client/i.test(c.indicateur));
  const dpo    = comps.find((c: any) => /fourn|dpo|crédit.*fourn/i.test(c.indicateur));
  const stock  = comps.find((c: any) => /stock|inventaire|rotation/i.test(c.indicateur));
  const bfrC   = comps.find((c: any) => /^bfr\b|bfr total/i.test(c.indicateur));
  const bfrPct = comps.find((c: any) => /bfr.*%|bfr.*ca/i.test(c.indicateur));

  s4 = setNum(s4, 'D14', cleanNumber(dso?.valeur));
  s4 = setNum(s4, 'D15', cleanNumber(dpo?.valeur));
  s4 = setNum(s4, 'D16', cleanNumber(stock?.valeur));
  s4 = setNum(s4, 'D17', cleanNumber(bfrC?.valeur));
  s4 = setNum(s4, 'D18', cleanNumber(bfrPct?.valeur));

  // Benchmarks
  if (dso?.benchmark)   s4 = setStr(s4, 'F14', dso.benchmark);
  if (dpo?.benchmark)   s4 = setStr(s4, 'F15', dpo.benchmark);
  if (stock?.benchmark) s4 = setStr(s4, 'F16', stock.benchmark);
  if (bfrC?.benchmark)  s4 = setStr(s4, 'F17', bfrC.benchmark);
  if (bfrPct?.benchmark) s4 = setStr(s4, 'F18', bfrPct.benchmark);

  // Structure endettement (rows 25-27)
  s4 = setNum(s4, 'D25', cleanNumber(ratios.solvabilite?.autonomie_financiere?.valeur));
  s4 = setNum(s4, 'D26', cleanNumber(ratios.solvabilite?.endettement?.valeur));
  s4 = setStr(s4, 'D27', ratios.solvabilite?.capacite_remboursement?.valeur);

  // BFR verdict
  if (bfr.verdict) s4 = setStr(s4, 'A30', bfr.verdict);

  zip.file('xl/worksheets/sheet4.xml', s4);
  console.log('[sheet4] Trésorerie & BFR remplie');

  // ────────────────────────────────────────────────
  // SHEET 5: Hypothèses de Projection
  // ────────────────────────────────────────────────
  let s5 = await zip.file('xl/worksheets/sheet5.xml')?.async('string') ?? '';

  const caRef   = caAnneeN || 1;
  const caLigne = interpolateYears(getProjLigne('CA Total'));
  if (caLigne) {
    const vals     = [caLigne.an1, caLigne.an2, caLigne.an3, caLigne.an4, caLigne.an5];
    const prevVals = [caRef, caLigne.an1, caLigne.an2, caLigne.an3, caLigne.an4];
    vals.forEach((v: any, i: number) => {
      const curr = cleanNumber(v);
      const prev = cleanNumber(prevVals[i]);
      if (curr !== null && prev !== null && prev > 0) {
        const growth = (((curr - prev) / prev) * 100).toFixed(1) + '%';
        s5 = setStr(s5, `${cols[i]}6`, growth);
      }
    });
  }

  activites.slice(0, 3).forEach((act: any, i: number) => {
    if (act.nom) s5 = setStr(s5, `A${7 + i}`, act.nom);
  });

  if (data.besoins_financiers?.capex_total) s5 = setStr(s5, 'B32', data.besoins_financiers.capex_total);
  if (data.besoins_financiers?.timing)      s5 = setStr(s5, 'G32', data.besoins_financiers.timing);

  zip.file('xl/worksheets/sheet5.xml', s5);
  console.log('[sheet5] Hypothèses remplies');

  // ────────────────────────────────────────────────
  // SHEET 6: Projection Financière 5 Ans (CRITICAL)
  // ────────────────────────────────────────────────
  let s6 = await zip.file('xl/worksheets/sheet6.xml')?.async('string') ?? '';

  // Helper: fill a projection row from data
  const fillProjRow = (rowNum: number, ligne: any, addCagr = false) => {
    if (!ligne) return;
    const interp = interpolateYears(ligne);
    years.forEach((yr, i) => {
      const val = cleanNumber(interp[yr]);
      if (val !== null) s6 = setNum(s6, `${cols[i]}${rowNum}`, val);
    });
    if (addCagr && interp.cagr) s6 = setStr(s6, `G${rowNum}`, interp.cagr);
  };

  // Helper: calculate a derived line from two existing lines
  const deriveLine = (lineA: any, lineB: any, op: 'sub' | 'div100'): any => {
    if (!lineA || !lineB) return null;
    const a = interpolateYears(lineA);
    const b = interpolateYears(lineB);
    const result: any = { poste: 'derived' };
    years.forEach(yr => {
      const va = cleanNumber(a[yr]);
      const vb = cleanNumber(b[yr]);
      if (va !== null && vb !== null) {
        if (op === 'sub') result[yr] = Math.round(va - vb);
        if (op === 'div100') result[yr] = vb !== 0 ? Math.round((va / vb) * 10000) / 100 : 0;
      }
    });
    return result;
  };

  // Get or calculate all projection lines
  const projCA = getProjLigne('CA Total');
  const projMB = getProjLigne('Marge Brute') || getProjLigne('marge brute');
  const projMBpct = getProjLigne('Marge Brute (%)') || getProjLigne('marge brute (%)');
  const projEBITDA = getProjLigne('EBITDA');
  const projEBITDApct = getProjLigne('Marge EBITDA (%)') || getProjLigne('marge ebitda');
  const projRN = getProjLigne('Résultat Net') || getProjLigne('resultat net');
  const projCF = getProjLigne('Cash-Flow Net') || getProjLigne('cash-flow net');
  const projTreso = getProjLigne('Trésorerie Cumulée') || getProjLigne('tresorerie');

  // Row 6: CA Total
  fillProjRow(6, projCA, true);

  // Rows 7-9: CA par activité (proportional distribution)
  if (projCA) {
    const caInterp = interpolateYears(projCA);
    const totalActCA = totalCA > 0 ? totalCA : caAnneeN;
    activites.slice(0, 3).forEach((act: any, i: number) => {
      const row = 7 + i;
      const actCA = cleanNumber(act.ca) || 0;
      const proportion = totalActCA > 0 ? actCA / totalActCA : (i === 0 ? 1 : 0);

      years.forEach((yr, j) => {
        const caYear = cleanNumber(caInterp[yr]);
        if (caYear !== null) {
          s6 = setNum(s6, `${cols[j]}${row}`, Math.round(caYear * proportion));
        }
      });
    });
  }

  // Row 11: Coûts directs (CA - Marge Brute)
  const coutsDirectsLine = deriveLine(projCA, projMB, 'sub');
  if (coutsDirectsLine) {
    // Swap: coûts = CA - MB
    const caInterp = interpolateYears(projCA);
    const mbInterp = projMB ? interpolateYears(projMB) : null;
    years.forEach((yr, j) => {
      const caV = cleanNumber(caInterp?.[yr]);
      const mbV = mbInterp ? cleanNumber(mbInterp[yr]) : null;
      if (caV !== null && mbV !== null) {
        s6 = setNum(s6, `${cols[j]}11`, Math.round(caV - mbV));
      } else if (caV !== null) {
        // Estimate from margin %
        const margePct = cleanNumber(ratios.rentabilite?.marge_brute?.valeur) || 40;
        s6 = setNum(s6, `${cols[j]}11`, Math.round(caV * (1 - margePct / 100)));
      }
    });
  }

  // Row 12: Marge Brute
  fillProjRow(12, projMB);
  // If no MB line, calculate from CA and margin %
  if (!projMB && projCA) {
    const caInterp = interpolateYears(projCA);
    const margePct = cleanNumber(ratios.rentabilite?.marge_brute?.valeur) || 40;
    years.forEach((yr, j) => {
      const caV = cleanNumber(caInterp[yr]);
      if (caV !== null) s6 = setNum(s6, `${cols[j]}12`, Math.round(caV * margePct / 100));
    });
  }

  // Row 13: Marge Brute %
  if (projMBpct) {
    fillProjRow(13, projMBpct);
  } else {
    // Calculate from CA and MB
    const mbLine = projMB || getProjLigne('Marge Brute');
    const caInterp = projCA ? interpolateYears(projCA) : null;
    const mbInterp = mbLine ? interpolateYears(mbLine) : null;
    if (caInterp && mbInterp) {
      years.forEach((yr, j) => {
        const caV = cleanNumber(caInterp[yr]);
        const mbV = cleanNumber(mbInterp[yr]);
        if (caV && mbV && caV > 0) {
          s6 = setNum(s6, `${cols[j]}13`, Math.round((mbV / caV) * 10000) / 100);
        }
      });
    }
  }

  // Rows 15-18: Charges fixes (total, salaires, loyers, autres)
  {
    const chargesFixesPct = cleanNumber(indicateurs.charges_fixes_ca) || 15;
    const masseSalPct = cleanNumber(indicateurs.masse_salariale_ca) || 10;
    const caInterp = projCA ? interpolateYears(projCA) : null;

    if (caInterp) {
      // Estimate charges fixes proportionally
      const chargesFixesPropSalaires = masseSalPct / (chargesFixesPct || 1);
      const loyersProp = 0.15; // typical
      const autresProp = 1 - chargesFixesPropSalaires - loyersProp;

      years.forEach((yr, j) => {
        const caV = cleanNumber(caInterp[yr]);
        if (caV !== null) {
          const chargesTotal = Math.round(caV * chargesFixesPct / 100);
          const salaires = Math.round(chargesTotal * Math.min(chargesFixesPropSalaires, 0.7));
          const loyers = Math.round(chargesTotal * Math.min(loyersProp, 0.3));
          const autres = Math.max(0, chargesTotal - salaires - loyers);

          s6 = setNum(s6, `${cols[j]}15`, chargesTotal);
          s6 = setNum(s6, `${cols[j]}16`, salaires);
          s6 = setNum(s6, `${cols[j]}17`, loyers);
          s6 = setNum(s6, `${cols[j]}18`, autres);
        }
      });
    }
  }

  // Row 20: EBITDA
  fillProjRow(20, projEBITDA);
  if (!projEBITDA && projMB && projCA) {
    // EBITDA = MB - Charges fixes
    const caInterp = interpolateYears(projCA);
    const mbInterp = interpolateYears(projMB);
    const chargesFixesPct = cleanNumber(indicateurs.charges_fixes_ca) || 15;
    years.forEach((yr, j) => {
      const mbV = cleanNumber(mbInterp[yr]);
      const caV = cleanNumber(caInterp[yr]);
      if (mbV !== null && caV !== null) {
        const charges = Math.round(caV * chargesFixesPct / 100);
        s6 = setNum(s6, `${cols[j]}20`, mbV - charges);
      }
    });
  }

  // Row 21: Marge EBITDA %
  if (projEBITDApct) {
    fillProjRow(21, projEBITDApct);
  } else if (projEBITDA && projCA) {
    const caInterp = interpolateYears(projCA);
    const ebitdaInterp = interpolateYears(projEBITDA);
    years.forEach((yr, j) => {
      const caV = cleanNumber(caInterp[yr]);
      const ebV = cleanNumber(ebitdaInterp[yr]);
      if (caV && ebV && caV > 0) {
        s6 = setNum(s6, `${cols[j]}21`, Math.round((ebV / caV) * 10000) / 100);
      }
    });
  }

  // Row 23: Résultat Net
  fillProjRow(23, projRN);

  // Row 24: Marge nette %
  {
    const rnInterp = projRN ? interpolateYears(projRN) : null;
    const caInterp = projCA ? interpolateYears(projCA) : null;
    if (rnInterp && caInterp) {
      years.forEach((yr, j) => {
        const caV = cleanNumber(caInterp[yr]);
        const rnV = cleanNumber(rnInterp[yr]);
        if (caV && rnV && caV > 0) {
          s6 = setNum(s6, `${cols[j]}24`, Math.round((rnV / caV) * 100));
        }
      });
    }
  }

  // Row 32: Cash-Flow Net
  fillProjRow(32, projCF);

  // Row 33: Trésorerie Cumulée
  fillProjRow(33, projTreso);

  // Seuil de rentabilité (rows 39-41)
  s6 = setNum(s6, 'B39', cleanNumber(data.seuil_rentabilite?.ca_point_mort));
  s6 = setStr(s6, 'B40', data.seuil_rentabilite?.atteint_en);
  s6 = setStr(s6, 'B41', data.seuil_rentabilite?.verdict);

  // Verdict projection
  if (data.projection_5ans?.verdict) s6 = setStr(s6, 'A43', data.projection_5ans.verdict);

  zip.file('xl/worksheets/sheet6.xml', s6);
  console.log('[sheet6] Projection 5 ans remplie');

  // ────────────────────────────────────────────────
  // SHEET 7: Analyse par Scénarios
  // ────────────────────────────────────────────────
  let s7 = await zip.file('xl/worksheets/sheet7.xml')?.async('string') ?? '';

  // Hypothèses par scénario (rows 7-10)
  const hypoRows: [number, string][] = [
    [7, 'Croissance CA'], [8, 'Marge brute'], [9, 'Charges fixes'], [10, 'Investissement'],
  ];
  for (const [rowNum, ind] of hypoRows) {
    const r = getScenario(ind);
    if (!r) continue;
    s7 = setStr(s7, `B${rowNum}`, r.prudent);
    s7 = setStr(s7, `C${rowNum}`, r.central);
    s7 = setStr(s7, `D${rowNum}`, r.ambitieux);
  }

  // Résultats comparés (rows 13-18)
  const scenRows: [number, string][] = [
    [13, 'CA An 5'], [14, 'EBITDA'], [15, 'Marge EBITDA'],
    [16, 'Résultat Net'], [17, 'Trésorerie'], [18, 'ROI'],
  ];
  for (const [rowNum, ind] of scenRows) {
    const r = getScenario(ind);
    if (!r) continue;
    s7 = setStr(s7, `B${rowNum}`, r.prudent);
    s7 = setStr(s7, `C${rowNum}`, r.central);
    s7 = setStr(s7, `D${rowNum}`, r.ambitieux);
    // Écart (col E)
    const pNum = cleanNumber(r.prudent);
    const aNum = cleanNumber(r.ambitieux);
    if (pNum !== null && aNum !== null) {
      s7 = setNum(s7, `E${rowNum}`, Math.abs(aNum - pNum));
    } else if (r.prudent && r.ambitieux) {
      s7 = setStr(s7, `E${rowNum}`, `${r.prudent} → ${r.ambitieux}`);
    }
  }

  // Sensibilité (rows 23-25)
  if (sensib[0]) s7 = setStr(s7, 'B23', sensib[0]);
  if (sensib[1]) s7 = setStr(s7, 'B24', sensib[1]);
  if (sensib[2]) s7 = setStr(s7, 'B25', sensib[2]);

  // Recommandation + synthèse
  if (data.scenarios?.recommandation_scenario) s7 = setStr(s7, 'B29', data.scenarios.recommandation_scenario);
  if (data.synthese_expert) s7 = setStr(s7, 'B30', data.synthese_expert.substring(0, 500));
  if (data.scenarios?.verdict) s7 = setStr(s7, 'A32', data.scenarios.verdict);

  zip.file('xl/worksheets/sheet7.xml', s7);
  console.log('[sheet7] Scénarios remplis');

  // ────────────────────────────────────────────────
  // SHEET 8: Synthèse Exécutive
  // ────────────────────────────────────────────────
  let s8 = await zip.file('xl/worksheets/sheet8.xml')?.async('string') ?? '';

  // Try to find rows dynamically by label
  const rowChiffres      = findRowByLabel(s8, 'Ce que montrent les chiffres');
  const rowForces        = findRowByLabel(s8, 'Forces');
  const rowFaiblesses    = findRowByLabel(s8, 'Faiblesses');
  const rowFortPotentiel = findRowByLabel(s8, 'fort potentiel');
  const rowProbleme      = findRowByLabel(s8, 'probl');
  const rowMessageCle    = findRowByLabel(s8, 'Message cl');
  const rowDecisions     = findRowByLabel(s8, 'cisions recommand');
  const rowImpact        = findRowByLabel(s8, 'Impact attendu');
  const rowBesoins       = findRowByLabel(s8, 'Besoins financiers');
  const rowPhrase        = findRowByLabel(s8, 'Les chiffres ne servent');

  // Build content strings
  const resumeChiffres = (sante.resume_chiffres ?? []).join(' | ');
  const forcesTexte = (sante.forces ?? data.points_forts ?? []).slice(0, 4).map((f: string, i: number) => `${i + 1}. ${f}`).join(' | ');
  const faiblTexte  = (sante.faiblesses ?? data.points_faibles ?? []).slice(0, 4).map((f: string, i: number) => `${i + 1}. ${f}`).join(' | ');
  const actFort = activites.filter((a: any) => a.classification === 'RENFORCER')
    .map((a: any) => `${a.nom} → marge ${a.marge_pct}`).join(', ');
  const actProb = activites.filter((a: any) => a.classification !== 'RENFORCER')
    .map((a: any) => `${a.nom} (${a.classification})`).join(', ');
  const planTexte = planAction.slice(0, 5).map((a: any, i: number) =>
    `${i + 1}. [${a.horizon}] ${a.action}${a.cout ? ` (${a.cout})` : ''}`
  ).join(' | ');
  const impactTexte = [
    data.impact_attendu?.ca_an5     ? `CA An5: ${data.impact_attendu.ca_an5}`     : '',
    data.impact_attendu?.ebitda_an5 ? `EBITDA: ${data.impact_attendu.ebitda_an5}` : '',
    data.impact_attendu?.marge_ebitda ? `Marge: ${data.impact_attendu.marge_ebitda}` : '',
  ].filter(Boolean).join(' | ');
  const besoinsTexte = [
    data.besoins_financiers?.capex_total ? `CAPEX: ${data.besoins_financiers.capex_total}` : '',
    data.besoins_financiers?.timing      ? `Timing: ${data.besoins_financiers.timing}`     : '',
  ].filter(Boolean).join(' | ');

  // Fill with dynamic rows (fallback to hardcoded positions)
  const chifRow = rowChiffres ? rowChiffres + 1 : 8;
  if (resumeChiffres) s8 = setStr(s8, `A${chifRow}`, resumeChiffres);

  const forRow = rowForces ? rowForces + 1 : 10;
  if (forcesTexte) s8 = setStr(s8, `A${forRow}`, forcesTexte);

  const faibRow = rowFaiblesses ? rowFaiblesses + 1 : 14;
  if (faiblTexte) s8 = setStr(s8, `A${faibRow}`, faiblTexte);

  const fortRow = rowFortPotentiel ? rowFortPotentiel + 1 : 20;
  if (actFort) s8 = setStr(s8, `A${fortRow}`, actFort);

  const probRow = rowProbleme ? rowProbleme + 1 : 23;
  if (actProb) s8 = setStr(s8, `A${probRow}`, actProb);

  if (data.analyse_marge?.message_cle) {
    const msgRow = rowMessageCle ? rowMessageCle : 25;
    s8 = setStr(s8, `A${msgRow}`, `👉 Message clé : ${data.analyse_marge.message_cle}`);
  }

  const decRow = rowDecisions ? rowDecisions + 1 : 29;
  if (planTexte) s8 = setStr(s8, `A${decRow}`, planTexte);

  const impRow = rowImpact ? rowImpact + 1 : 33;
  if (impactTexte) s8 = setStr(s8, `A${impRow}`, impactTexte);

  const besRow = rowBesoins ? rowBesoins + 1 : 36;
  if (besoinsTexte) s8 = setStr(s8, `A${besRow}`, besoinsTexte);

  if (data.synthese_expert) {
    const expertRow = rowPhrase ? rowPhrase - 1 : 39;
    s8 = setStr(s8, `A${expertRow}`, data.synthese_expert.substring(0, 300));
  }

  zip.file('xl/worksheets/sheet8.xml', s8);
  console.log('[sheet8] Synthèse exécutive remplie');

  // ── Generate final ZIP ──
  console.log(`[framework-excel] ✅ Template rempli pour "${enterpriseName}" — 8 onglets complétés`);
  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
