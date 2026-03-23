// Visualização das informações do candidato — exibe todos os dados cadastrados em modo somente leitura.
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { supabase } from "../../../lib/supabase";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "AuthApiError: Invalid Refresh Token: Refresh Token Not Found",
]);

export default function InformacoesCandidatos() {
  const [loading, setLoading] = useState(false);
  const [] = useState("");

  const [form, setForm] = useState({
    nome: "",
    idade: "",
    habilitacao: "",
    telefone: "",
    email: "",
    senha: "",
    confirmaSenha: "",
    objetivo: "",
    endereco: {
      cep: "",
      rua: "",
      bairro: "",
      numero: "",
      cidade: "",
      estado: "",
    },
    formacao: { escola: "", curso: "", status: "" },
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
          const { data, error: dbError } = await supabase
            .from("cadastro_candidato")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (dbError) throw dbError;

          if (data) {
            setForm({
              nome: data.nome || "",
              idade: data.idade || "",
              habilitacao: data.habilitacao || "",
              telefone: data.telefone || "",
              email: session.user.email || "",
              senha: "",
              confirmarSenha: "",
              objetivo: data.objetivo || "",
              endereco: {
                cep: data.endereco?.cep || "",
                rua: data.endereco?.rua || "",
                bairro: data.endereco?.bairro || "",
                numero: data.endereco?.numero || "",
                cidade: data.endereco?.cidade || "",
                estado: data.endereco?.estado || "",
              },
              formacao: {
                escola: data.formacao?.escola || "",
                curso: data.formacao?.curso || "",
                status: data.formacao?.status || "",
              },
              cursos: data.cursos || [],
              experiencias: data.experiencias || [],
              perfil: data.perfil || "",
            });
          }
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("🕵️ Erro no processo:", e.message);
        }
      } finally {
        // Dá um respiro de 500ms para a rede estabilizar o dado no estado
        setTimeout(() => setLoading(false), 500);
      }
    };

    carregarDados();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }}
      style={{ backgroundColor: "#0a0b10" }}
    >
      <View style={styles.container}>
        <Text style={styles.titulo}>Informações do Candidato</Text>

        {/* --- GRUPO: DADOS PESSOAIS (BORDA AZUL) --- */}
        <View style={[styles.inputContainer, styles.borderAzul]}>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.input}>{form.nome}</Text>
        </View>

        <View style={[styles.inputContainer, styles.borderAzul]}>
          <Text style={styles.label}>Idade:</Text>
          <Text style={styles.input}>{form.idade}</Text>
        </View>

        <View style={[styles.inputContainer, styles.borderAzul]}>
          <Text style={styles.label}>Habilitação:</Text>
          <Text style={styles.input}>{form.habilitacao}</Text>
        </View>

        <View style={[styles.inputContainer, styles.borderAzul]}>
          <Text style={styles.label}>Telefone:</Text>
          <Text style={styles.input}>{form.telefone}</Text>
        </View>

        <View style={[styles.inputContainer, styles.borderAzul]}>
          <Text style={styles.label}>E-mail:</Text>
          <Text style={styles.input}>{form.email}</Text>
        </View>

        <View style={[styles.inputContainer, styles.borderAzul]}>
          <Text style={styles.label}>Objetivo:</Text>
          <Text style={styles.input}>{form.objetivo}</Text>
        </View>

        {/* --- GRUPO: ENDEREÇO (BORDA VERDE) --- */}

        {/* CEP sozinho */}
        <View style={[styles.inputContainer, styles.borderVerde]}>
          <Text style={styles.label}>CEP:</Text>
          <Text style={styles.input}>{form.endereco.cep}</Text>
        </View>

        {/* Rua + Número */}
        <View style={styles.row}>
          <View
            style={[
              styles.inputContainer,
              styles.borderVerde,
              { width: "70%" },
            ]}
          >
            <Text style={styles.label}>Rua:</Text>
            <Text style={styles.input}>{form.endereco.rua}</Text>
          </View>

          <View
            style={[
              styles.inputContainer,
              styles.borderVerde,
              { width: "26%" },
            ]}
          >
            <Text style={styles.label}>Número:</Text>
            <Text style={styles.input}>{form.endereco.numero}</Text>
          </View>
        </View>

        {/* Bairro sozinho */}
        <View style={[styles.inputContainer, styles.borderVerde]}>
          <Text style={styles.label}>Bairro:</Text>
          <Text style={styles.input}>{form.endereco.bairro}</Text>
        </View>

        {/* Cidade + UF */}
        <View style={styles.row}>
          <View
            style={[
              styles.inputContainer,
              styles.borderVerde,
              { width: "72%" },
            ]}
          >
            <Text style={styles.label}>Cidade:</Text>
            <Text style={styles.input}>{form.endereco.cidade}</Text>
          </View>

          <View
            style={[
              styles.inputContainer,
              styles.borderVerde,
              { width: "24%" },
            ]}
          >
            <Text style={styles.label}>UF:</Text>
            <Text style={styles.input}>{form.endereco.estado}</Text>
          </View>
        </View>

        {/* --- GRUPO: FORMAÇÃO (COM ESPAÇO ACIMA) --- */}
        {form.formacao?.escola !== "" && (
          <View style={{ marginTop: 10 }}>
            <View style={[styles.inputContainer, styles.borderVerde]}>
              <Text style={styles.label}>Instituição de Ensino:</Text>
              <Text style={styles.input}>{form.formacao.escola}</Text>
            </View>
            {form.formacao.curso !== "" && (
              <View style={[styles.inputContainer, styles.borderVerde]}>
                <Text style={styles.label}>Curso:</Text>
                <Text style={styles.input}>{form.formacao.curso}</Text>
              </View>
            )}
            {form.formacao.status !== "" && (
              <View style={[styles.inputContainer, styles.borderVerde]}>
                <Text style={styles.label}>Status da Formação:</Text>
                <Text style={styles.input}>{form.formacao.status}</Text>
              </View>
            )}
          </View>
        )}

        {/* --- GRUPO: CURSOS (COM ESPAÇO ACIMA) --- */}
        {form.cursos && form.cursos.length > 0 && (
          <View style={{ marginTop: 10 }}>
            {form.cursos.map((item, index) => (
              <View key={index} style={{ marginBottom: 15 }}>
                <View style={[styles.inputContainer, styles.borderVerde]}>
                  <Text style={styles.label}>Curso / Certificado:</Text>
                  <Text style={styles.input}>{item.nome || "Sem nome"}</Text>
                </View>
                {item.instituicao && (
                  <View style={[styles.inputContainer, styles.borderVerde]}>
                    <Text style={styles.label}>Instituição:</Text>
                    <Text style={styles.input}>{item.instituicao}</Text>
                  </View>
                )}
                {item.ano && (
                  <View style={[styles.inputContainer, styles.borderVerde]}>
                    <Text style={styles.label}>Ano de Conclusão:</Text>
                    <Text style={styles.input}>{item.ano}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* --- GRUPO: EXPERIÊNCIAS (COM ESPAÇO ACIMA) --- */}
        {form.experiencias && form.experiencias.length > 0 && (
          <View style={{ marginTop: -5 }}>
            {form.experiencias.map((exp, index) => (
              <View key={index} style={{ marginBottom: 20 }}>
                {exp.empresa && (
                  <View style={[styles.inputContainer, styles.borderVerde]}>
                    <Text style={styles.label}>Empresa:</Text>
                    <Text style={styles.input}>{exp.empresa}</Text>
                  </View>
                )}
                {exp.cargo && (
                  <View style={[styles.inputContainer, styles.borderVerde]}>
                    <Text style={styles.label}>Cargo:</Text>
                    <Text style={styles.input}>{exp.cargo}</Text>
                  </View>
                )}
                {exp.descricao && (
                  <View
                    style={[
                      styles.inputContainer,
                      styles.borderVerde,
                      { height: "auto", paddingVertical: 10 },
                    ]}
                  >
                    <Text style={styles.label}>Atividades Realizadas:</Text>
                    <Text style={[styles.input, { textAlign: "justify" }]}>
                      {exp.descricao}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* --- GRUPO: PERFIL (COM ESPAÇO ACIMA) --- */}
        {form.perfil !== "" && (
          <View
            style={[
              styles.inputContainer,
              styles.borderVerde,
              { height: "auto", marginTop: -10 },
            ]}
          >
            <Text style={styles.label}>Perfil Profissional:</Text>
            <View style={styles.cardBranco}>
              <Text style={[styles.input, { textAlign: "justify" }]}>
                {form.perfil}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#0a0b10",
  },

  titulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "left",
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#39ff14", // Verde Neon
    paddingLeft: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#161b22", // Card Dark
  },
  borderAzul: { borderColor: "#00f2ff44" },
  borderVerde: { borderColor: "#39ff1444" },
  label: {
    fontSize: 10,
    color: "#00f2ff", // Label em Azul Neon
    fontWeight: "bold",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 15,
    color: "#E2E8F0", // Branco acinzentado para leitura
    fontWeight: "600",
  },
});
