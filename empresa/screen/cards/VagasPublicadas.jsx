// Vagas publicadas — lista vagas da empresa com opções de editar, pausar/ativar e excluir.
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

export default function VagasPublicadas() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [vagas, setVagas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalButtons, setModalButtons] = useState([]);

  const showModal = (title, message, buttons) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalButtons(
      buttons
        ? buttons
        : [{ text: "OK", onPress: () => setModalVisible(false) }]
    );
    setModalVisible(true);
  };

  const fetchVagas = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        showModal("Atenção", "Você precisa estar logado para ver suas vagas.");
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from("vagas_empregos")
        .select("*")
        .eq("empresa_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setVagas(data || []);
    } catch (error) {
      console.error("Erro ao carregar vagas:", error);
      showModal("Erro", "Não foi possível carregar suas vagas no momento.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVagas();
    }, [fetchVagas])
  );

  const deletarVaga = (vaga) => {
    console.log("Botão EXCLUIR clicado! Vaga ID:", vaga?.id, "Tipo:", typeof vaga?.id);

    if (!vaga?.id) {
      showModal("Erro", "ID da vaga não encontrado.");
      return;
    }

    showModal(
      "Excluir Vaga",
      "Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel", onPress: () => setModalVisible(false) },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setModalVisible(false);
            console.log("=== ALERT CONFIRMADO! Iniciando exclusão real. ID:", vaga.id); // ← Deve aparecer ao clicar "Excluir"

            setRefreshing(true);

            try {
              const { data: { user } } = await supabase.auth.getUser();
              const currentUserId = user?.id;
              console.log("User ID atual (para RLS):", currentUserId);

              console.log("Executando delete...");

              const { data: deletedRows, error } = await supabase
                .from("vagas_empregos")
                .delete()
                .eq("id", vaga.id)
                .eq("empresa_id", currentUserId) // ← Adicione isso para reforçar RLS
                .select();

              console.log("Resultado do delete:", { deletedRows, error }); // ← Crucial: veja se error existe

              if (error) {
                console.error("Erro Supabase detalhado:", error.message, error.details, error.hint);
                throw error;
              }

              if (!deletedRows || deletedRows.length === 0) {
                console.warn("Nenhuma linha deletada - provável RLS bloqueando.");
                showModal(
                  "Falha na exclusão",
                  "Nenhuma vaga deletada. Verifique RLS:\n" +
                  "Supabase → Database → vagas_empregos → Policies → DELETE\n" +
                  "USING: empresa_id = auth.uid()"
                );
                return;
              }

              console.log("Deletado com sucesso!");
              showModal("Sucesso", "Vaga excluída!");
              fetchVagas();
            } catch (err) {
              console.error("Erro completo na exclusão:", err);
              showModal("Erro", `Falha ao excluir: ${err.message || "Desconhecido"}`);
            } finally {
              console.log("Finalizando exclusão (finally)");
              setRefreshing(false);
            }
          },
        },
      ]
    );
  };

  const alternarStatus = async (id, statusAtual) => {
    const novoStatus = statusAtual === "ativo" ? "pausado" : "ativo";

    // Atualização otimista
    setVagas((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: novoStatus } : v))
    );

    try {
      const { error } = await supabase
        .from("vagas_empregos")
        .update({ status: novoStatus })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      showModal("Erro", "Não foi possível alterar o status.");
      fetchVagas(); // Reverte se falhar
    }
  };

  const renderVaga = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.imagem_vaga_url ? (
          <Image
            source={{
              uri: `${item.imagem_vaga_url}${item.imagem_vaga_url.includes("?") ? "&" : "?"}t=${Date.now()}`,
              cache: "reload",
            }}
            style={styles.vagaImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.vagaImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={24} color="#444" />
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.cargoText} numberOfLines={1}>
            {item.cargo || "Cargo não informado"}
          </Text>
          <Text style={styles.localText}>
            <Ionicons name="location-outline" size={12} color="#666" />{" "}
            {item.endereco?.cidade || "—"}, {item.endereco?.estado || "—"}
          </Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.status === "ativo" ? "#39ff14" : "#ff3131" },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: item.status === "ativo" ? "#39ff14" : "#ff3131" },
              ]}
            >
              {item.status?.toUpperCase() || "INDEFINIDO"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.autoRow}>
        <View style={styles.autoItem}>
          <Ionicons name="flash" size={14} color="#00f2ff" />
          <Text style={styles.autoText}>
            Auto Seleção: {item.nivel_selecao ?? 0}%
          </Text>
        </View>
        <View style={styles.autoItem}>
          <Ionicons name="calendar" size={14} color="#00f2ff" />
          <Text style={styles.autoText}>
            Auto Agenda: {item.nivel_agendar ?? 0}%
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {/* Botão Editar */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnEditar]}
          onPress={() => navigation.navigate("AdicionarVaga", { vagaId: item.id })}
        >
          <Ionicons name="create-outline" size={18} color="#00f2ff" />
          <Text style={styles.btnTextBlue}>EDITAR</Text>
        </TouchableOpacity>

        {/* Botão Pausar/Ativar */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            item.status === "ativo" ? styles.btnPausar : styles.btnAtivar,
          ]}
          onPress={() => alternarStatus(item.id, item.status)}
        >
          <Ionicons
            name={item.status === "ativo" ? "pause-circle-outline" : "play-circle-outline"}
            size={18}
            color="#000"
          />
          <Text style={styles.btnTextBlack}>
            {item.status === "ativo" ? "PAUSAR" : "ATIVAR"}
          </Text>
        </TouchableOpacity>

        {/* Botão Excluir */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnExcluir]}
          onPress={() => deletarVaga(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.btnTextWhite}>EXCLUIR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Minhas <Text style={{ color: "#00f2ff" }}>Vagas</Text>
        </Text>

        <TouchableOpacity
          style={styles.plusBtn}
          onPress={() => navigation.navigate("AdicionarVaga")}
        >
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={vagas}
        keyExtractor={(item) => item.id}
        renderItem={renderVaga}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchVagas}
            tintColor="#00f2ff"
            colors={["#00f2ff"]}
          />
        }
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>
              Você ainda não publicou nenhuma vaga.
            </Text>
          )
        }
      />

      {loading && !refreshing && (
        <ActivityIndicator size="large" color="#00f2ff" style={styles.loader} />
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalButtons}>
              {modalButtons.map((btn, index) => (
                <TouchableOpacity key={index} onPress={btn.onPress}>
                  <Text
                    style={[
                      styles.modalButtonText,
                      btn.style === "destructive"
                        ? { color: "red" }
                        : btn.style === "cancel"
                          ? { fontWeight: "bold" }
                          : { color: "#007AFF" },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  plusBtn: {
    backgroundColor: "#00f2ff",
    borderRadius: 8,
    padding: 4,
  },
  card: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
  },
  vagaImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#111",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  cargoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  localText: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  autoRow: {
    flexDirection: "row",
    gap: 15,
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  autoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  autoText: {
    color: "#00f2ff",
    fontSize: 11,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnEditar: {
    borderWidth: 1,
    borderColor: "#00f2ff",
  },
  btnPausar: {
    backgroundColor: "#ff3131",
  },
  btnAtivar: {
    backgroundColor: "#39ff14",
  },
  btnExcluir: {
    backgroundColor: "#ff3131",
  },
  btnTextBlue: {
    color: "#00f2ff",
    fontWeight: "bold",
    fontSize: 12,
  },
  btnTextBlack: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 12,
  },
  btnTextWhite: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  emptyText: {
    color: "#444",
    textAlign: "center",
    marginTop: 100,
    fontSize: 16,
  },
  loader: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
  },
  modalButtonText: {
    fontSize: 16,
    padding: 10,
  },
});