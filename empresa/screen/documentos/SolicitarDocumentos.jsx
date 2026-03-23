// Solicitação de documentos — empresa busca candidato por ID e seleciona os documentos necessários para admissão.
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import SolicitacoesEnviadas from "../../screen/documentos/SolicitacoesEnviadas";
import SolicitacoesRecebidas from "../../screen/documentos/SolicitacoesRecebidas";
import SolicitacoesFinalizadas from "../../screen/documentos/SolicitacoesFinalizadas";

export default function SolicitarDocumentos() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [candidatoIdDigitado, setCandidatoIdDigitado] = useState("");
  const [candidatoEncontrado, setCandidatoEncontrado] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("solicitar");

  const [documentosBase, setDocumentosBase] = useState([
    { id: "1", nome: "RG", duplo: true, selecionado: false, obs: "" },
    { id: "2", nome: "CPF", duplo: false, selecionado: false, obs: "" },
    { id: "3", nome: "CNH", duplo: true, selecionado: false, obs: "" },
    { id: "4", nome: "Comprovante Residência", duplo: false, selecionado: false, obs: "" },
    { id: "5", nome: "Título de Eleitor", duplo: false, selecionado: false, obs: "" },
    { id: "6", nome: "Carteira de Trabalho", duplo: true, selecionado: false, obs: "" },
  ]);

  const buscarCandidato = async () => {
    if (!candidatoIdDigitado.startsWith("$CDT")) {
      Alert.alert("Erro", "ID inválido. Deve começar com $CDT");
      return;
    }
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from("cadastro_candidato")
        .select("user_id, nome, email, foto_url, visivel_id")
        .eq("visivel_id", candidatoIdDigitado.trim())
        .limit("1")
        .single();

      if (error || !data) throw new Error("Candidato não encontrado.");
      setCandidatoEncontrado(data);
    } catch (e) {
      Alert.alert("Ops", e.message);
      setCandidatoEncontrado(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSelecao = (id) => {
    setDocumentosBase((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, selecionado: !doc.selecionado } : doc,
      ),
    );
  };

  const toggleDuplo = (id) => {
    setDocumentosBase((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, duplo: !doc.duplo } : doc)),
    );
  };

  const atualizarObs = (id, texto) => {
    setDocumentosBase((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, obs: texto } : doc)),
    );
  };

  const confirmarSolicitacao = async () => {
    const selecionados = documentosBase.filter((d) => d.selecionado);
    if (selecionados.length === 0)
      return Alert.alert("Atenção", "Selecione ao menos um doc.");

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = selecionados.map((doc) => ({
        empresa_id: session.user.id,
        candidato_id: candidatoEncontrado.user_id,
        nome_documento: doc.nome,
        requer_verso: doc.duplo,
        observacao_empresa: doc.obs,
        status: "pendente",
      }));

      const { error } = await supabase
        .from("documentos_admissao")
        .insert(payload);
      if (error) throw error;

      Alert.alert("Sucesso", "Solicitação enviada! O candidato foi notificado.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0b10" }}>
      {/* Abas horizontais no topo */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === "solicitar" && styles.tabActive]}
          onPress={() => setAbaAtiva("solicitar")}
        >
          <Text style={[styles.tabText, abaAtiva === "solicitar" && styles.tabTextActive]}>Solicitar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === "enviadas" && styles.tabActive]}
          onPress={() => setAbaAtiva("enviadas")}
        >
          <Text style={[styles.tabText, abaAtiva === "enviadas" && styles.tabTextActive]}>Enviadas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === "recebidas" && styles.tabActive]}
          onPress={() => setAbaAtiva("recebidas")}
        >
          <Text style={[styles.tabText, abaAtiva === "recebidas" && styles.tabTextActive]}>Recebidas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === "finalizadas" && styles.tabActive]}
          onPress={() => setAbaAtiva("finalizadas")}
        >
          <Text style={[styles.tabText, abaAtiva === "finalizadas" && styles.tabTextActive]}>Finalizadas</Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo dinâmico abaixo das abas */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ paddingVertical: 10 }}
        >
          <Text style={styles.txtVoltar}>← VOLTAR</Text>
        </TouchableOpacity>

        {abaAtiva === "solicitar" && (
          <ScrollView>
            <Text style={styles.tituloMain}>Nova Solicitação</Text>

            <View style={styles.section}>
              <Text style={styles.label}>ID DO CANDIDATO ($CDT)</Text>
              <View style={styles.searchBar}>
                <TextInput
                  style={styles.input}
                  placeholder="$CDT00000000"
                  placeholderTextColor="#475569"
                  value={candidatoIdDigitado}
                  onChangeText={setCandidatoIdDigitado}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.btnSearch} onPress={buscarCandidato}>
                  {searchLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Feather name="search" size={20} color="#000" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {candidatoEncontrado && (
              <View style={styles.candidatoCard}>
                <Ionicons name="person-circle" size={40} color="#39ff14" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.nomeCand}>{candidatoEncontrado.nome}</Text>
                  <Text style={styles.emailCand}>{candidatoEncontrado.email}</Text>
                </View>
              </View>
            )}

            <Text style={styles.subtitulo}>SELECIONE OS DOCUMENTOS:</Text>

            {documentosBase.map((doc) => (
              <View
                key={doc.id}
                style={[styles.docItem, doc.selecionado && styles.docItemAtivo]}
              >
                <View style={styles.docRow}>
                  <TouchableOpacity
                    onPress={() => toggleSelecao(doc.id)}
                    style={styles.checkArea}
                  >
                    <MaterialCommunityIcons
                      name={
                        doc.selecionado ? "checkbox-marked" : "checkbox-blank-outline"
                      }
                      size={26}
                      color={doc.selecionado ? "#39ff14" : "#475569"}
                    />
                    <Text
                      style={[
                        styles.docNome,
                        { color: doc.selecionado ? "#FFF" : "#94a3b8" },
                      ]}
                    >
                      {doc.nome}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.switchArea}>
                    <Text style={styles.txtDuplo}>FRENTE/VERSO?</Text>
                    <Switch
                      value={doc.duplo}
                      onValueChange={() => toggleDuplo(doc.id)}
                      trackColor={{ false: "#1e293b", true: "#065f46" }}
                      thumbColor={doc.duplo ? "#39ff14" : "#64748b"}
                    />
                  </View>
                </View>

                {doc.selecionado && (
                  <TextInput
                    style={styles.obsInput}
                    placeholder="Instruções adicionais..."
                    placeholderTextColor="#475569"
                    onChangeText={(t) => atualizarObs(doc.id, t)}
                  />
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.btnFinal,
                (!candidatoEncontrado || loading) && { opacity: 0.5 },
              ]}
              onPress={confirmarSolicitacao}
              disabled={!candidatoEncontrado || loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.txtBtnFinal}>GERAR SOLICITAÇÃO</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Os arquivos expiram em 48h após o envio.
            </Text>
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {abaAtiva === "enviadas" && <SolicitacoesEnviadas />}
        {abaAtiva === "recebidas" && <SolicitacoesRecebidas />}
        {abaAtiva === "finalizadas" && <SolicitacoesFinalizadas />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  txtVoltar: {
    color: "#00f2ff",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
  },
  tituloMain: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
  },
  section: { marginBottom: 20 },
  label: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
  },
  searchBar: {
    flexDirection: "row",
    backgroundColor: "#161b22",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  input: { flex: 1, color: "#FFF", padding: 15, fontSize: 16 },
  btnSearch: {
    backgroundColor: "#39ff14",
    width: 55,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
  },
  candidatoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2e1a",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#39ff1433",
  },
  nomeCand: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  emailCand: { color: "#39ff14", fontSize: 12 },
  subtitulo: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 15,
  },
  docItem: {
    backgroundColor: "#161b22",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  docItemAtivo: { borderColor: "#39ff1444", backgroundColor: "#0f172a" },
  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkArea: { flexDirection: "row", alignItems: "center", flex: 1 },
  docNome: { marginLeft: 10, fontSize: 16, fontWeight: "600" },
  switchArea: { alignItems: "center" },
  txtDuplo: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "bold",
  },
  obsInput: {
    backgroundColor: "#020617",
    color: "#FFF",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  btnFinal: {
    backgroundColor: "#39ff14",
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#39ff14",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  txtBtnFinal: { color: "#000", fontWeight: "900", fontSize: 16 },
  footerNote: {
    color: "#00f2ff",
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#161b22",
    borderBottomWidth: 1,
    borderColor: "#1e293b",
    paddingVertical: 10,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#39ff14",
  },
  tabText: {
    color: "#64748b",
    fontWeight: "bold",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#39ff14",
  },
});