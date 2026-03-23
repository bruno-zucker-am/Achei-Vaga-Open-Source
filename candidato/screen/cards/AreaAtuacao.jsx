// Área de atuação do candidato — permite selecionar o nicho principal de mercado para melhorar o matching com vagas.
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Alert,
  LogBox,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { nichos as LISTA_DE_NICHOS } from "../../../components/nichos"; // Array de objetos: [{ label: '...', value: '...' }]
import { useNavigation } from "@react-navigation/native";

LogBox.ignoreLogs([
  "AuthApiError: Invalid Refresh Token: Refresh Token Not Found",
]);

export default function AreaAtuacao() {
  const navigation = useNavigation();

  // Estados
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nichos: [] }); // nichos será array de values (strings), ex: ['tecnologia']

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
            .select("nichos")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (dbError) throw dbError;
          if (data && data.nichos) {
            setForm({ nichos: data.nichos }); // Assume que o banco salva array de values
          }
        }
      } catch (e) {
        console.error("🕵️ Erro ao carregar:", e.message);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  const salvarAlteracoes = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada.");

      console.log("Dados que serão salvos:", {
        user_id: session.user.id,
        nichos: form.nichos,
      });

      const { error: dbError } = await supabase
        .from("cadastro_candidato")
        .update({ nichos: form.nichos })
        .eq("user_id", session.user.id);

      if (dbError) throw dbError;

      console.log(
        "Salvamento realizado com sucesso! Nichos salvos:",
        form.nichos,
      );

      Alert.alert(
        "Sucesso! 🎉",
        "Seu nicho foi atualizado com sucesso. Voltando ao perfil em 3 segundos...",
        [{ text: "OK" }],
      );

      // Espera 3 segundos e navega de volta
      setTimeout(() => {
        navigation.navigate("PerfilCandidato"); // Ajuste o nome da rota se for diferente
      }, 3000);
    } catch (error) {
      console.error("Erro ao salvar nichos:", error.message);
      Alert.alert(
        "Erro",
        error.message || "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para pegar o label do nicho selecionado (para display)
  const getNichoLabel = (value) => {
    const nicho = LISTA_DE_NICHOS.find((n) => n.value === value);
    return nicho ? nicho.label : value; // fallback se não encontrar
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0b10" }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← VOLTAR</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>Selecione Sua Área de Atuação</Text>

          <View style={styles.cardAutomacao}>
            <Text style={styles.label}>Nicho Principal (Máx. 1)</Text>
            <TouchableOpacity
              style={styles.inputSelect}
              onPress={() => setModalVisible(true)}
            >
              <Text
                style={{
                  color: form.nichos.length ? "#fff" : "#666",
                  fontSize: 16,
                }}
              >
                {form.nichos.length > 0
                  ? getNichoLabel(form.nichos[0])
                  : "Toque para selecionar..."}
              </Text>
              <Text style={{ color: "#00f2ff", fontSize: 18 }}>⌵</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.btn,
            loading && { opacity: 0.7 }, // Mantém o efeito visual de "processando"
          ]}
          onPress={salvarAlteracoes}
          disabled={loading} // Impede cliques enquanto carrega
          activeOpacity={0.7} // Feedback tátil mais suave
        >
          {loading ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator
                color="#000"
                size="small"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.btnText}>
                Salvando suas preferências... 😊
              </Text>
            </View>
          ) : (
            <Text style={styles.btnText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Áreas de Atuação</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: "#ef4444", fontWeight: "bold" }}>
                  FECHAR
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={LISTA_DE_NICHOS}
              keyExtractor={(item) => item.value} // Melhor usar value como key (único)
              renderItem={({ item }) => {
                const selecionado = form.nichos.includes(item.value);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selecionado && styles.modalItemAtivo,
                    ]}
                    onPress={() => {
                      setForm({ ...form, nichos: [item.value] }); // Salva o value (string)
                      setModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selecionado && { color: "#39ff14" },
                      ]}
                    >
                      {item.label} {/* Exibe o label visível */}
                    </Text>
                    {selecionado && <Text style={{ color: "#39ff14" }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  container: { padding: 25 },
  backBtn: { marginTop: 50, marginBottom: 20 },
  backBtnText: { color: "#00f2ff", fontWeight: "bold", letterSpacing: 1 },
  titulo: { fontSize: 26, fontWeight: "900", color: "#FFF", marginBottom: 10 },
  label: {
    color: "#00f2ff",
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 12,
    letterSpacing: 1,
  },
  cardAutomacao: {
    backgroundColor: "#111218",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2029",
  },
  inputSelect: {
    backgroundColor: "#050505",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 20,
    backgroundColor: "#0a0b10",
  },
  btn: {
    backgroundColor: "#39ff14",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center", // Centraliza o conteúdo (importante para o row com spinner)
  },
  btnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
  },
  modalContent: {
    backgroundColor: "#111218",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  modalItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalItemText: { color: "#ccc", fontSize: 16 },
  modalItemAtivo: {
    borderLeftWidth: 3,
    borderLeftColor: "#39ff14",
    paddingLeft: 10,
  },
});
