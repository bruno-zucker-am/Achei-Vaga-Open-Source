import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

interface PushRecord {
  user_id: string;
  titulo: string;
  mensagem: string;
  id_referencia?: string;
  tipo_evento?: string;
}

serve(async (req: Request) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response("Configuração inválida", { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json();

    const records: PushRecord[] = Array.isArray(body)
      ? body
      : body.record
      ? [body.record]
      : [];

    if (records.length === 0) {
      return new Response("Nenhum registro recebido", { status: 400 });
    }

    const results = [];

    for (const record of records) {
      if (!record.user_id) continue;

      // 🔎 Busca token nas duas tabelas
      const [candidato, empresa] = await Promise.all([
        supabase
          .from("cadastro_candidato")
          .select("push_token")
          .eq("user_id", record.user_id)
          .maybeSingle(),
        supabase
          .from("cadastro_empresa")
          .select("push_token")
          .eq("user_id", record.user_id)
          .maybeSingle(),
      ]);

      const pushToken =
        candidato.data?.push_token || empresa.data?.push_token;

      if (!pushToken) {
        console.log("Token não encontrado:", record.user_id);
        continue;
      }

      const pushPayload = {
        to: pushToken,
        title: record.titulo,
        body: record.mensagem,
        priority: "high",
        sound: "default",
        badge: 1,
        channelId: "default",
        data: {
          id_referencia: record.id_referencia ?? null,
          tipo: record.tipo_evento ?? null,
        },
      };

      const expoResponse = await fetch(
        "https://exp.host/--/api/v2/push/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pushPayload),
        },
      );

      const expoResult = await expoResponse.json();

      results.push({
        user_id: record.user_id,
        status: expoResponse.status,
        response: expoResult,
      });
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(message, { status: 500 });
  }
});