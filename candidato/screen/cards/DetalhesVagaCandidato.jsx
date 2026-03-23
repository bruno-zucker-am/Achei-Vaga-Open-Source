// Detalhes de uma vaga — exibe cargo, salário, contrato, localização e compatibilidade. Permite candidatar-se.
import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { calculos } from "../../../components/calculos";
import { estilos } from "../../../components/estilos";

export default function DetalhesVagaCandidato() {
  const navigation = useNavigation();
  const route = useRoute();
  const { vagaId } = route.params || {};

  const [perfilEmpresa, setPerfilEmpresa] = useState(null);
  const [candidato, setCandidato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const [form, setForm] = useState({
    nichos: [],
    empresa_id: "",
    cargo: "",
    salario: "",
    contrato: "",
    endereco: { cidade: "", estado: "" },
    descricao: "",
  });

  // CÁLCULOS DENTRO DO COMPONENTE
  const nivel = useMemo(() => {
    if (!candidato || !perfilEmpresa) return 0;
    return calculos(candidato, perfilEmpresa);
  }, [candidato, perfilEmpresa]);

  const cor = useMemo(() => estilos(nivel), [nivel]);

  useEffect(() => {
    const carregarDados = async () => {
      // Agora pegamos o candidatoId que veio da navegação
      const { vagaId, candidatoId } = route.params || {};

      if (!vagaId || !candidatoId) {
        console.log("Faltando parâmetros");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. BUSCA A VAGA (Para fazer o cálculo de match)
        const { data: vagaData } = await supabase
          .from("vagas_empregos")
          .select("*")
          .eq("id", vagaId)
          .single();

        if (vagaData) {
          setPerfilEmpresa(vagaData);
          setForm({
            empresa_id: vagaData.empresa_id,
            cargo: vagaData.cargo,
            salario: vagaData.salario,
            contrato: vagaData.contrato,
            descricao: vagaData.descricao,
            nichos: vagaData.nichos || [],
            endereco: vagaData.endereco || { cidade: "", estado: "" },
          });
        }

        // 2. BUSCA O CANDIDATO (O que a empresa clicou, não o logado)
        const { data: candidatoData } = await supabase
          .from("cadastro_candidato")
          .select("*")
          .eq("user_id", candidatoId) // USANDO O ID QUE VEIO DA ROTA
          .single();

        if (candidatoData) {
          setCandidato(candidatoData);
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e.message);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [vagaId, route.params?.candidatoId]); // Observa a mudança de ID

  const candidatar = async () => {
    setEnviando(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) return;

      await supabase.from("registro_atividades").insert({
        user_id: session.user.id,
        empresa_id: form.empresa_id,
        acao: "candidatar",
      });

      setEnviado(true);

      setTimeout(() => {
        navigation.goBack();
      }, 3000);
    } catch (err) {
      console.log(err);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00f2ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        {/* VOLTAR */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={22} color="#00f2ff" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        {/* CARD */}
        <View style={styles.card}>
          {/* NICHOS */}
          {form.nichos?.length > 0 && (
            <Text style={styles.nicho}>{form.nichos[0]}</Text>
          )}

          <Text style={styles.cargo}>{form.cargo}</Text>

          <Text style={styles.salario}>
            R$ {Number(form.salario).toLocaleString("pt-BR")}
          </Text>

          {/* CHIPS */}
          <View style={styles.infoList}>
            {!!form.contrato && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={16} color="#aaa" />
                <Text style={styles.infoText}>{form.contrato}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#aaa" />
              <Text style={styles.infoText}>
                {form.endereco.cidade}/{form.endereco.estado}
              </Text>
            </View>
          </View>

          {/* SEÇÃO DE COMPATIBILIDADE */}
          <View style={styles.compatRow}>
            <View
              style={[
                styles.compatCircle,
                {
                  borderColor: "#333", // Fundo do círculo (parte vazia)
                  borderTopColor: estilos(nivel, "cor"), // Sua função de estilos
                  borderRightColor:
                    nivel >= 25 ? estilos(nivel, "cor") : "#333",
                  borderBottomColor:
                    nivel >= 50 ? estilos(nivel, "cor") : "#333",
                  borderLeftColor: nivel >= 75 ? estilos(nivel, "cor") : "#333",
                  transform: [{ rotate: "45deg" }],
                },
              ]}
            >
              <View style={{ transform: [{ rotate: "-45deg" }] }}>
                <Text
                  style={[
                    styles.compatCircleText,
                    { color: estilos(nivel, "cor") },
                  ]}
                >
                  {nivel}%
                </Text>
              </View>
            </View>

            <View>
              <Text style={styles.compatTitle}>COMPATIBILIDADE</Text>
              <Text
                style={[
                  styles.compatSubtitle,
                  { color: estilos(nivel, "cor") },
                ]}
              >
                {estilos(nivel, "texto")}
              </Text>
            </View>
          </View>
        </View>
        {/* DESCRIÇÃO */}
        <Text style={styles.sectionTitle}>SOBRE A VAGA</Text>

        <View style={styles.descBox}>
          <Text style={styles.desc}>{form.descricao}</Text>
        </View>
      </ScrollView>

      {/* BOTÃO */}
      <TouchableOpacity
        style={[styles.btn, enviado && { backgroundColor: "#00f2ff" }]}
        onPress={candidatar}
        disabled={enviando || enviado}
      >
        {enviando ? (
          <ActivityIndicator color="#000" />
        ) : enviado ? (
          <Text style={styles.btnText}>Candidatura enviada ✅</Text>
        ) : (
          <>
            <Ionicons name="send" size={18} color="#000" />
            <Text style={styles.btnText}>CANDIDATAR-SE</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  back: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
    gap: 6,
  },
  backText: {
    color: "#00f2ff",
    fontSize: 16,
  },

  card: {
    backgroundColor: "#0A0A0A",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },

  nicho: {
    color: "#00f2ff",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: "center", // 🔥 centraliza
    textTransform: "uppercase", // 🔥 deixa MAIÚSCULO
  },

  cargo: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 10,
  },

  salario: {
    color: "#39ff14",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },

  chips: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },

  infoList: {
    marginTop: 6,
    gap: 10,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  infoText: {
    color: "#ddd",
    fontSize: 14,
    fontWeight: "500",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },

  chipText: {
    color: "#ddd",
    fontSize: 13,
    fontWeight: "600",
  },

  compatBox: {
    marginTop: 22,
  },

  compatPercent: {
    color: "#39ff14",
    fontSize: 20,
    fontWeight: "900",
  },

  compatText: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 6,
  },

  barBg: {
    width: "100%",
    height: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    backgroundColor: "#39ff14",
  },

  sectionTitle: {
    color: "#00f2ff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
    marginTop: 26,
    marginBottom: 8,
  },

  descBox: {
    backgroundColor: "#0A0A0A",
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#39ff14",
  },

  desc: {
    color: "#ccc",
    fontSize: 16,
    lineHeight: 24,
  },

  btn: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#39ff14",
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  btnText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
  },
  compatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 22,
  },

  circleWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },

  circleBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#111",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  circleFill: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#39ff14",
  },

  circleText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
    zIndex: 2,
  },

  compatLabel: {
    color: "#00f2ff",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  compatDesc: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 2,
  },
  compatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    gap: 14,
  },

  compatCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: "#39ff14",
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
  },

  compatCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    // borderColor: "#39ff14", // REMOVA ESSA LINHA (agora é dinâmica no style do componente)
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
  },

  compatCircleText: {
    // color: "#39ff14", // REMOVA ESSA LINHA (dinâmica)
    fontSize: 14,
    fontWeight: "900",
  },

  compatSubtitle: {
    // color: "#aaa", // REMOVA ESSA LINHA (dinâmica)
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
  },
});
