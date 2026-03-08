

## Probleme

Le Business Plan Word (.docx) est stocké dans le bucket `bp-outputs` (privé). Lors de la génération, une **URL signée** est créée avec une durée de 7200 secondes (2 heures) et sauvegardée dans `deliverables.data._meta.download_url`. Quand l'utilisateur clique sur "Télécharger Word" plus tard, cette URL est **expirée**, ce qui retourne une erreur 404/403, et le client affiche "Erreur de téléchargement".

C'est exactement le même problème qui avait été résolu pour le module ODD : les URLs signées expirent.

## Solution

Modifier `handleDownloadBpWord` dans `EntrepreneurDashboard.tsx` pour **ne pas utiliser l'URL signée stockée**. A la place, générer une nouvelle URL signée à la volée depuis le bucket `bp-outputs` en utilisant le nom du fichier stocké dans `_meta.file_name`.

### Modification concrète

**`src/components/dashboard/EntrepreneurDashboard.tsx`** - Remplacer `handleDownloadBpWord` :

```typescript
const handleDownloadBpWord = async () => {
  try {
    const bpDeliv = deliverables.find((d: any) => d.type === 'business_plan');
    const fileName = (bpDeliv?.data as any)?._meta?.file_name;
    if (!fileName) throw new Error('Fichier non disponible');
    
    const { data: signedData, error } = await supabase.storage
      .from('bp-outputs')
      .createSignedUrl(fileName, 300);
    
    if (error || !signedData?.signedUrl) throw new Error('Erreur de téléchargement');
    
    const response = await fetch(signedData.signedUrl);
    if (!response.ok) throw new Error('Erreur de téléchargement');
    const blob = await response.blob();
    
    const downloadName = fileName || `BusinessPlan.docx`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    toast.success('Business Plan Word téléchargé !');
  } catch (err: any) {
    toast.error(err.message || 'Erreur de téléchargement');
  }
};
```

Mettre a jour l'appel au bouton pour ne plus passer l'URL en parametre (ligne ~1169).

