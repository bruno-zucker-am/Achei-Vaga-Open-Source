// Detalhes do candidato (visão da empresa) — exibe perfil completo do candidato com compatibilidade e botão de selecionar.
import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { calculos } from "../../../components/calculos";
import { estilos } from "../../../components/estilos";
import { Ionicons } from "@expo/vector-icons";

export default function DetalhesVagaEmpresa() {
  const navigation = useNavigation();
  const route = useRoute();

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(null); // Aqui ficam os dados
  const [carregandoBotao, setCarregandoBotao] = useState(false); // Novo estado booleano
  const [enviado, setEnviado] = useState(false);
  const [perfilEmpresa, setPerfilEmpresa] = useState(null);
  const [candidato, setCandidato] = useState(null);
  // 1. PRIMEIRO CALCULA O NIVEL
  const nivel = useMemo(() => {
    // 1. Proteção: Se um dos dois for nulo, retorna 0 logo de cara e nem tenta dar log
    if (!candidato || !perfilEmpresa) {
      return 0;
    }
    // 2. Agora é seguro dar log e calcular, pois o JS sabe que os objetos existem
    console.log("--- DEBUG MATCH ---");
    console.log("CAMPOS CANDIDATO:", Object.keys(candidato));
    console.log("CAMPOS EMPRESA:", Object.keys(perfilEmpresa));

    const resultado = calculos(candidato, perfilEmpresa);
    console.log("Nível Calculado:", resultado);

    return resultado;
  }, [candidato, perfilEmpresa]);

  // 2. DEPOIS CALCULA A COR (usando o nivel que já existe acima)
  const cor = useMemo(() => estilos(nivel), [nivel]);

  const [form, setForm] = useState({
    nichos: [],
    nome: "",
    idade: "",
    objetivo: "",
    endereco: {
      cidade: "",
      estado: "",
    },
    formacao: { escola: "", curso: "" },
    cursos: [],
    experiencias: [],
    perfil: "",
  });

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          // BUSCA OS DADOS DA EMPRESA LOGADA PARA O MATCH FUNCIONAR
          const { data: empresaData } = await supabase
            .from("vagas_empregos")
            .select("*")
            .eq("empresa_id", session.user.id)
            .single();

          if (empresaData) {
            setPerfilEmpresa(empresaData);
          }

          const { data, error: dbError } = await supabase
            .from("cadastro_candidato")
            .select("*");

          if (dbError) throw dbError;

          if (data && data.length > 0) {
            const candidato = data[0]; // Usando o nome que você já usa

            console.log("Candidato encontrado:", candidato.nome);

            setCandidato(candidato); // Isso ativa o useMemo(nivel)
            setEnviando(candidato);

            setForm({
              fotos_url: candidato.foto_url,
              nichos: candidato.nichos || [],
              nome: candidato.nome,
              idade: candidato.idade,
              objetivo: candidato.objetivo,
              endereco: {
                cidade: candidato.endereco?.cidade || "",
                estado: candidato.endereco?.estado || "",
              },
              formacao: {
                escola: candidato.formacao?.escola || "",
                curso: candidato.formacao?.curso || "",
              },
              cursos: candidato.cursos || [],
              experiencias: candidato.experiencias || [],
              perfil: candidato.perfil,
            });
          }
        }
      } catch (e) {
        console.error("🕵️ Erro no processo:", e.message);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };

    carregarDados();
  }, []);

  const selecionar = async () => {
    if (!candidato || !perfilEmpresa) return;
    // 1. Ativa o loading do botão (o booleano novo)
    setCarregandoBotao(true);

    try {
      // 2. Pega a sessão atual
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        console.log("Usuário não logado");
        return;
      }

      // 3. Insere a atividade no banco
      // ATENÇÃO: Verifique se 'form.user_id' é o ID do CANDIDATO que você carregou no useEffect
      const { error } = await supabase.from("registro_atividades").insert({
        user_id: session.user.id, // ID da Empresa (quem está logado)
        user_id: form.user_id, // ID do Candidato (quem está sendo selecionado)
        acao: "selecionar",
      });

      if (error) throw error;

      // 4. Sucesso!
      setEnviado(true);

      // 5. Feedback visual e volta pra tela anterior
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (err) {
      console.error("Erro ao selecionar candidato:", err.message);
      alert("Erro ao selecionar: " + err.message);
    } finally {
      // 6. Desativa o loading independente de dar certo ou errado
      setCarregandoBotao(false);
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
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }}
      style={{ backgroundColor: "#0a0b10" }}
    >
      <View style={styles.headerTop}>
        {/* Botão de Voltar à Esquerda */}
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Nichos Centralizados */}
        <View style={styles.containerNichos}>
          {form.nichos &&
            form.nichos.map((nicho, index) => (
              <View key={index} style={styles.badgeNicho}>
                <Text style={styles.textoNicho}>{nicho.toUpperCase()}</Text>
              </View>
            ))}
        </View>
      </View>

      <View style={styles.container}>
        {/* HEADER: Foto, Nome e Compatibilidade */}
        <View style={styles.header}>
          <Image
            source={{
              uri: form.fotos_url || "https://via.placeholder.com/150",
            }}
            style={styles.fotoPerfil}
          />
          <View style={styles.infoBasica}>
            <Text style={styles.nomeText}>{form.nome}</Text>
            <Text style={styles.subText}>
              {form.idade} anos • {form.endereco.cidade}, {form.endereco.estado}
            </Text>
          </View>
        </View>

        <View style={styles.compatCard}>
          {/* Círculo com o truque para não parecer 100% */}
          <View
            style={[
              styles.progressCircle,
              {
                borderColor: "#333",
                borderTopColor: estilos(nivel, "cor"),
                borderRightColor: nivel >= 25 ? estilos(nivel, "cor") : "#333",
                borderBottomColor: nivel >= 50 ? estilos(nivel, "cor") : "#333",
                borderLeftColor: nivel >= 75 ? estilos(nivel, "cor") : "#333",
                transform: [{ rotate: "45deg" }],
              },
            ]}
          >
            <View style={{ transform: [{ rotate: "-45deg" }] }}>
              <Text
                style={[styles.progressText, { color: estilos(nivel, "cor") }]}
              >
                {nivel}%
              </Text>
            </View>
          </View>

          {/* Textos ao lado pegando direto da função */}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text
              style={[
                styles.compatPercentText,
                { color: estilos(nivel, "cor") },
              ]}
            >
              {nivel}%
            </Text>
            <Text
              style={[styles.compatStatus, { color: estilos(nivel, "cor") }]}
            >
              {estilos(nivel, "texto")}
            </Text>
          </View>
        </View>

        {/* OBJETIVO PROFISSIONAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OBJETIVO PROFISSIONAL</Text>
          <Text style={styles.sectionContent}>{form.objetivo}</Text>
        </View>

        {/* FORMAÇÃO ACADÊMICA */}
        {form.formacao?.escola !== "" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FORMAÇÃO ACADÊMICA</Text>
            <View style={styles.expItem}>
              <View style={styles.iconContainer}>
                <Ionicons name="school" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.expEmpresa}>{form.formacao.curso}</Text>
                <Text style={styles.expCargo}>{form.formacao.escola}</Text>
                <Text style={styles.expDesc}>{form.formacao.status}</Text>
              </View>
            </View>
          </View>
        )}

        {/* CURSOS DE QUALIFICAÇÃO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURSOS DE QUALIFICAÇÃO</Text>
          {form.cursos.map((curso, index) => (
            <View key={index} style={styles.itemRow}>
              <Ionicons name="time-outline" size={16} color="#8E8E93" />
              <Text style={styles.itemText}>{curso.nome}</Text>
            </View>
          ))}
        </View>

        {/* EXPERIÊNCIA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXPERIÊNCIA</Text>
          {form.experiencias.map((exp, index) => (
            <View key={index} style={styles.expItem}>
              <View style={styles.iconContainer}>
                <Ionicons name="briefcase" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.expEmpresa}>{exp.empresa}</Text>
                <Text style={styles.expCargo}>{exp.cargo}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* PERFIL PROFISSIONAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERFIL PROFISSIONAL</Text>
          <Text style={styles.sectionContent}>{form.perfil}</Text>
        </View>

        {/* BOTÃO SELECIONAR (FIXO NO FINAL) */}
        <TouchableOpacity
          style={[styles.btnAction, enviado && { backgroundColor: "#00f2ff" }]}
          onPress={selecionar}
          disabled={carregandoBotao || enviado} // Usa o novo estado aqui
        >
          {carregandoBotao ? ( // Agora ele só entra em loop se você clicar
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnActionText}>
              {enviado ? "CANDIDATO SELECIONADO ✅" : "SELECIONAR"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  fotoPerfil: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#1c1c1e",
  },
  infoBasica: {
    marginLeft: 15,
  },
  nomeText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  subText: {
    color: "#8E8E93",
    fontSize: 14,
  },
  compatCard: {
    backgroundColor: "#1c1c1e",
    borderRadius: 50, // Garante o formato de "pílula"
    padding: 15,
    flexDirection: "row", // Círculo de um lado, texto do outro
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  compatPercentText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  compatStatus: {
    fontSize: 14,
    opacity: 0.8,
  },
  sectionTitle: {
    color: "#5ac8fa", // Azul claro da imagem
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  sectionContent: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  itemText: {
    color: "#fff",
    fontSize: 15,
  },
  expItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0b10",
    marginBottom: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#1c1c1e",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expEmpresa: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  expCargo: {
    color: "#8E8E93",
    fontSize: 14,
  },
  btnAction: {
    backgroundColor: "#34c759", // No futuro use LinearGradient para o efeito da imagem
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  btnActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 5,
    marginBottom: 20,
  },
  btnVoltar: {
    position: "absolute",
    left: 0,
    zIndex: 10,
  },
  containerNichos: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeNicho: {
    backgroundColor: "rgba(90, 200, 250, 0.1)",
    borderWidth: 1,
    borderColor: "#5ac8fa",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textoNicho: {
    color: "#5ac8fa",
    fontSize: 10,
    fontWeight: "900",
  },
});
