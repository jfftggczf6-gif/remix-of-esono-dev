

## Fix: Empty space under "Fiche entreprise" card

**Problem**: The "Fiche entreprise" card only has 3 fields but sits in a 2-column grid next to the much taller "Qualité du dossier" card. With `items-start`, the card no longer stretches but leaves visible empty space below it.

**Solution**: Enrich the "Fiche entreprise" card with more data fields from both the enterprise object and the pre-screening data, so it fills more vertical space and balances with the "Qualité du dossier" card. Additionally, add a summary note from the executive summary below the fields to use the remaining space.

### Changes in `PreScreeningViewer.tsx`

1. **Add more enterprise fields** to the Fiche entreprise card:
   - `description` or `activite_principale` from enterprise/data
   - `capital_social`, `registre_commerce` if available
   - `chiffre_affaires` from santeFinanciere
   - `resultat_net` from santeFinanciere
   - `date_dernier_exercice` from santeFinanciere

2. **Add a short text block** at the bottom of the card showing `resumeExecutif?.synthese` (first ~200 chars) or `classDetail` as a brief summary paragraph, giving the card more visual weight.

3. This avoids layout hacks and makes the card genuinely more useful.

