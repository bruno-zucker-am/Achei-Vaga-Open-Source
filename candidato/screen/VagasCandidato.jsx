// Tela de vagas do candidato — exibe uma vaga por vez com nível de compatibilidade. Permite candidatar ou recusar.
import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { calculos } from "../../components/calculos";
import { estilos } from "../../components/estilos";

export default function VagasCandidato({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [perfilEmpresa, setPerfilEmpresa] = useState(null);
  const [candidato, setCandidato] = useState(null);

  const nivel = useMemo(() => {
    if (!candidato || !perfilEmpresa) return 0;
    return calculos(candidato, perfilEmpresa);
  }, [candidato, perfilEmpresa]);

  const cor = useMemo(() => estilos(nivel), [nivel]);

  // AQUI: Função de busca isolada para ser reutilizada
  const buscarProximaVaga = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!candidato) {
        const { data: cand } = await supabase
          .from("cadastro_candidato")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setCandidato(cand);
      }

      // 1. Busca IDs das empresas já RECUSADAS
      const { data: recusas } = await supabase
        .from("recusas_candidato")
        .select("empresa_id")
        .eq("user_id", user.id);

      // 2. Busca IDs das empresas onde já há CANDIDATURA
      const { data: candidaturas } = await supabase
        .from("candidaturas_candidato")
        .select("empresa_id")
        .eq("user_id", user.id);

      // Une todos os IDs que devem ser ocultados
      const idsOcultar = [
        ...(recusas ? recusas.map((r) => r.empresa_id) : []),
        ...(candidaturas ? candidaturas.map((c) => c.empresa_id) : []),
      ];

      // 3. Busca uma vaga que NÃO esteja em nenhuma das duas listas
      let query = supabase.from("vagas_empregos").select("*");

      if (idsOcultar.length > 0) {
        // O Supabase exige que a lista seja formatada como (id1, id2, ...)
        query = query.not("empresa_id", "in", `(${idsOcultar.join(",")})`);
      }

      const { data: vga, error: vError } = await query.limit(1).maybeSingle();

      if (vError) throw vError;

      setPerfilEmpresa(vga);
    } catch (e) {
      console.error("Erro ao buscar próxima vaga:", e.message);
    } finally {
      setLoading(false);
    }
  };
  // Carrega ao entrar na tela
  useEffect(() => {
    buscarProximaVaga();
  }, []);

  const handleRecusar = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !perfilEmpresa) return;

      const { error } = await supabase.from("recusas_candidato").insert({
        user_id: user.id,
        empresa_id: perfilEmpresa.empresa_id,
      });

      if (error) throw error;

      // EM VEZ DE proximaVaga(), chamamos a busca novamente!
      await buscarProximaVaga();
    } catch (error) {
      console.error("Erro ao recusar:", error);
      alert("Erro ao processar recusa.");
    }
  };

  const handleCandidatar = async () => {
    if (!candidato || !perfilEmpresa) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("candidaturas_candidato").insert({
      user_id: user.id,
      empresa_id: perfilEmpresa.empresa_id,
    });

    if (error) {
      console.log("Erro:", error.message);
    } else {
      alert("Candidatura enviada! 🚀");
      await buscarProximaVaga(); // Já prepara a próxima antes de sair
      navigation.navigate("CandidaturaCandidato");
    }
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#39ff14"
        style={{ flex: 1, backgroundColor: "#0a0b10" }}
      />
    );
  if (!perfilEmpresa)
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff" }}>
          Nenhuma perfilEmpresa nova por aqui...
        </Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.statusTitle}>VAGA DISPONÍVEL 💼</Text>

        {/* Foto Quadrada da Empresa/perfilEmpresa */}
        <Image
          source={{ uri: perfilEmpresa.imagem_vaga_url }}
          style={styles.foto}
        />

        <Text style={styles.nome}>{perfilEmpresa.cargo}</Text>
        <Text style={styles.empresaInfo}>
          {perfilEmpresa.nicho} • {perfilEmpresa.contrato}
        </Text>
        <Text style={styles.localizacao}>
          📍 {perfilEmpresa.endereco?.cidade}, {perfilEmpresa.endereco?.estado}
        </Text>

        <View style={styles.matchContainer}>
          <View style={styles.matchTextRow}>
            <Text style={styles.matchLabel}>Sua compatibilidade</Text>
            {/* Adicionei a cor no texto também para manter o padrão */}
            <Text style={[styles.matchValue, { color: cor }]}>{nivel}%</Text>
          </View>
          <View style={styles.barraFundo}>
            <View
              style={[
                styles.barraProgresso,
                { width: `${nivel}%`, backgroundColor: cor }, // backgroundColor aqui!
              ]}
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: "#3d1e1e" }]}
            onPress={handleRecusar}
          >
            <Text style={styles.btnIcon}>✕</Text>
            <Text style={styles.btnText}>Recusar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: "#1c1c1e" }]}
            onPress={() =>
              navigation.navigate("DetalhesVagaCandidato", {
                vagaId: perfilEmpresa.id,
                //modoVisualizacao: true,
              })
            }
          >
            <Text style={styles.btnIcon}>📄</Text>
            <Text style={styles.btnText}>Detalhes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: "#88F04C" }]}
            onPress={handleCandidatar}
          >
            <Text style={styles.btnIcon}>🚀</Text>
            <Text style={styles.btnText}>Candidatar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0b10",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#161b22",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#39ff1411",
  },
  statusTitle: {
    color: "#88F04C",
    fontWeight: "800",
    marginBottom: 15,
    letterSpacing: 1,
  },
  foto: { width: 160, height: 160, borderRadius: 15, marginBottom: 15 }, // Foto Quadrada
  nome: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
  },
  empresaInfo: { color: "#8E8E93", marginTop: 5 },
  localizacao: { color: "#00f2ff", marginTop: 5, fontWeight: "600" },
  matchContainer: { width: "100%", marginVertical: 20 },
  matchTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  matchLabel: { color: "#8E8E93", fontSize: 12 },
  matchValue: { color: "#88F04C", fontWeight: "bold" },
  barraFundo: { height: 8, backgroundColor: "#000", borderRadius: 4 },
  barraProgresso: {
    height: "100%",
    backgroundColor: "#88F04C",
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  btnAction: {
    width: "31%",
    height: 75,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnIcon: { fontSize: 20, color: "#FFF" },
  btnText: {
    fontSize: 9,
    color: "#FFF",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 4,
  },
});
