// Proxy edge function — forwards memo data to Python server for PPTX generation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PARSER_URL = Deno.env.get("PARSER_URL");
    const PARSER_API_KEY = Deno.env.get("PARSER_API_KEY");

    if (!PARSER_URL || !PARSER_API_KEY) {
      return new Response(JSON.stringify({ error: "PARSER_URL or PARSER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const resp = await fetch(`${PARSER_URL}/generate-memo-pptx`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PARSER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Python PPTX error:", resp.status, errText);
      return new Response(JSON.stringify({ error: `PPTX generation failed: ${resp.status}` }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pptxBlob = await resp.arrayBuffer();

    return new Response(pptxBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="Investment_Memo.pptx"`,
      },
    });
  } catch (e: any) {
    console.error("generate-memo-pptx error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
