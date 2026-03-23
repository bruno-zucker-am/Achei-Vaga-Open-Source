// Minhas candidaturas — lista as vagas para as quais o candidato se candidatou, com status e opção de desistir.
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
import { calculos } from "../../../components/calculos";
import { estilos } from "../../../components/estilos";

export default function CandidaturaCandidato() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [vagas, setVagas] = useState([]);
  const [refreshing, setRecarregar] = useState(false);

  const [candidato, setCandidato] = useState(null);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalTitulo, setModalTitulo] = useState("");
  const [modalMensagem, setModalMensagem] = useState("");
  const [modalButtons, setModalButtons] = useState([]);

  const mostrarModal = (titulo, mensagem, buttons) => {
    setModalTitulo(titulo);
    setModalMensagem(mensagem);
    setModalButtons(buttons);
    setModalVisivel(true);
  };

  const fetchVagas = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // Busca o perfil do candidato (uma vez só)
      const { data: prof, error: errProf } = await supabase
        .from("cadastro_candidato")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (errProf) throw errProf;
      setCandidato(prof);

      // 1. Pega as candidaturas
      const { data: candidaturas, error: errC } = await supabase
        .from("candidaturas_candidato")
        .select("empresa_id, status")
        .eq("user_id", session.user.id);

      if (errC) throw errC;
      if (!candidaturas || candidaturas.length === 0) {
        setVagas([]);
        return;
      }

      // 2. Pega os detalhes das vagas
      const idsEmpresas = candidaturas.map((c) => c.empresa_id);
      const { data: infoVagas, error } = await supabase
        .from("vagas_empregos")
        .select("*")
        .in("empresa_id", idsEmpresas);

      if (error) throw error;

      // 3. Formata as vagas com cálculo individual de compatibilidade
      const vagasFormatadas = infoVagas.map((vaga) => {
        const cand = candidaturas.find((c) => c.empresa_id === vaga.empresa_id);

        // Calcula nível e cor para ESSA vaga específica
        const nivelVaga = prof ? calculos(prof, vaga) : 0;
        const corVaga = estilos(nivelVaga);

        return {
          ...vaga,
          status: cand?.status || "pendente",
          nivel: nivelVaga,
          cor: corVaga,
        };
      });

      setVagas(vagasFormatadas);
    } catch (error) {
      console.error("Erro ao carregar candidaturas:", error);
    } finally {
      setLoading(false);
      setRecarregar(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVagas();
    }, [fetchVagas]),
  );

  const deletarVaga = (vaga) => {
    mostrarModal(
      "Retirar Candidatura",
      "Deseja realmente desistir desta oportunidade?",
      [
        {
          Text: "Voltar",
          style: "cancel",
          onPress: () => setModalVisivel(false),
        },
        {
          Text: "Desistir",
          style: "destructive",
          onPress: async () => {
            setModalVisivel(false);
            setRecarregar(true);
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;

              // 1. PRIMEIRO: Registra na tabela de recusas para ela NÃO voltar pro Match
              const { error: recusaError } = await supabase
                .from("recusas_candidato")
                .insert({
                  user_id: user.id,
                  empresa_id: vaga.empresa_id,
                });

              if (recusaError) {
                console.error("Erro ao registrar recusa técnica:", recusaError);
                // Se der erro de duplicidade (23505), ignore e siga para o delete
              }

              // 2. SEGUNDO: Deleta a candidatura
              const { error: deleteError } = await supabase
                .from("candidaturas_candidato")
                .delete()
                .eq("user_id", user.id)
                .eq("empresa_id", vaga.empresa_id);

              if (deleteError) throw deleteError;

              // 3. TERCEIRO: Remove da lista local na tela atual
              setVagas((prev) =>
                prev.filter((v) => v.empresa_id !== vaga.empresa_id),
              );

              alert(
                "Candidatura retirada. Você não verá mais esta vaga no Match.",
              );
            } catch (err) {
              console.error("Erro no processo de desistência:", err);
              alert("Falha ao processar desistência.");
            } finally {
              setRecarregar(false);
            }
          },
        },
      ],
    );
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "selecionado":
        return { label: "Selecionado", color: "#39ff14", icon: "star" };
      case "entrevistado":
        return { label: "Entrevistado", color: "#00f2ff", icon: "people" };
      default:
        return { label: "Pendente", color: "#ffb100", icon: "time" };
    }
  };

  const renderVaga = ({ item }) => {
    const statusCfg = getStatusConfig(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: item.imagem_vaga_url }}
            style={styles.vagaImage}
          />

          <View style={styles.infoContainer}>
            <Text style={styles.cargoText}>{item.cargo}</Text>

            {/* Barra de compatibilidade por vaga */}
            <View style={styles.compatibilidadeRow}>
              <View
                style={[
                  styles.barraProgressoBg,
                  { borderColor: item.cor + "44" },
                ]}
              >
                <View
                  style={[
                    styles.barraProgressoFill,
                    { width: `${item.nivel}%`, backgroundColor: item.cor },
                  ]}
                />
              </View>
              <Text style={[styles.nivelText, { color: item.cor }]}>
                {item.nivel.toFixed(0).padStart(2, "0")}%
              </Text>
            </View>

            <Text style={styles.localText}>{item.nome_empresa}</Text>

            <View style={styles.statusBadge}>
              <View
                style={[styles.statusDot, { backgroundColor: statusCfg.color }]}
              />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {statusCfg.label.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { borderColor: statusCfg.color, borderWidth: 1 },
            ]}
            onPress={() => {
              /* Muda status se desejar */
            }}
          >
            <Ionicons name={statusCfg.icon} size={18} color={statusCfg.color} />
            <Text style={{ color: statusCfg.color, fontWeight: "bold" }}>
              {statusCfg.label}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnExcluir]}
            onPress={() => deletarVaga(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.btnTextWhite}>Desistir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#00f2ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Minhas Candidaturas</Text>
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{vagas.length}</Text>
        </View>
      </View>

      <FlatList
        data={vagas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderVaga}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchVagas}
            tintColor="#00f2ff"
          />
        }
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>
              Nenhuma candidatura encontrada.
            </Text>
          )
        }
      />

      {loading && (
        <ActivityIndicator size="large" color="#00f2ff" style={styles.loader} />
      )}

      <Modal animationType="fade" transparent visible={modalVisivel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitulo}</Text>
            <Text style={styles.modalMessage}>{modalMensagem}</Text>
            <View style={styles.modalButtons}>
              {modalButtons.map((btn, i) => (
                <TouchableOpacity key={i} onPress={btn.onPress}>
                  <Text
                    style={[
                      styles.modalButtonText,
                      btn.style === "destructive" && { color: "red" },
                    ]}
                  >
                    {btn.Text}
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
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  countContainer: {
    backgroundColor: "#00f2ff",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  countText: { color: "#000", fontWeight: "bold", fontSize: 12 },
  card: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  cardHeader: { flexDirection: "row", gap: 12 },
  vagaImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#111",
  },
  infoContainer: { flex: 1 },
  cargoText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  localText: { color: "#666", fontSize: 13 },
  statusBadge: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: "bold" },
  actions: { flexDirection: "row", gap: 10, marginTop: 15 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnExcluir: { backgroundColor: "#ff3131" },
  btnTextWhite: { color: "#fff", fontWeight: "bold" },
  emptyText: { color: "#444", textAlign: "center", marginTop: 100 },
  loader: { position: "absolute", top: "50%", left: "50%" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 15,
    width: "80%",
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalMessage: { color: "#ccc", marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 15 },
  modalButtonText: { color: "#00f2ff", fontWeight: "bold" },
  compatibilidadeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  barraProgressoBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#1a1a1a",
    borderRadius: 3,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  barraProgressoFill: {
    height: "100%",
    borderRadius: 3,
  },
  nivelText: {
    fontSize: 12,
    fontWeight: "bold",
    width: 35,
  },
});
