// Agenda de entrevistas do candidato — lista convites recebidos, permite confirmar ou recusar, e acessar videochamada.
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import ChamadaCandidato from "../../candidato/screen/cards/ChamadaCandidato";

export default function EntrevistasCandidatos() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entrevistas, setEntrevistas] = useState([]);
  const [modalConvite, setModalConvite] = useState(false);
  const [itemFoco, setItemFoco] = useState(null);

  // Estatísticas do topo (Mock do seu print)
  const [stats, setStats] = useState({ convites: 0, hoje: 0, novos: 0 });

  // Adicione um estado para controlar se o modal já foi mostrado automaticamente
  const [modalJaMostrado, setModalJaMostrado] = useState(false);

  const buscarEntrevistas = useCallback(async () => {
    try {
      // Tiramos o setLoading(true) daqui para não dar flicker na tela no refresh
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("selecao_empresa")
        .select(
          `
        *,
        vagas_empregos (
          cargo,
          cadastro_empresa (
            nome,
            foto_url
          )
        )
      `,
        )
        .eq("candidato_id", user.id);

      if (error) throw error;

      setEntrevistas(data || []);

      // Atualiza estatísticas
      const agendados = data.filter((i) => i.status === "agendado");
      setStats({
        convites: data.length,
        hoje: 0,
        novos: agendados.length,
      });

      // SÓ ABRE O MODAL SE:
      // 1. Existir convite pendente
      // 2. O modal ainda não tiver sido fechado/mostrado nesta carga
      if (agendados.length > 0 && !modalConvite && !modalJaMostrado) {
        setItemFoco(agendados[0]);
        setModalConvite(true);
        setModalJaMostrado(true); // Bloqueia a abertura automática na próxima atualização
      }
    } catch (err) {
      console.error("Erro ao buscar entrevistas:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [modalConvite, modalJaMostrado]); // Adicione as dependências aqui

  useEffect(() => {
    buscarEntrevistas();
  }, [buscarEntrevistas]);

  const responderConvite = async (confirmar) => {
    try {
      setModalConvite(false);
      setLoading(true);

      if (confirmar) {
        // 1. Atualiza para CONFIRMADO
        const { error } = await supabase
          .from("selecao_empresa")
          .update({ status: "confirmado" })
          .eq("id", itemFoco.id);

        if (error) throw error;
        Alert.alert("Sucesso!", "Sua entrevista foi confirmada. Boa sorte!");
      } else {
        // 2. RECUSA: Salva na tabela de recusas e remove da seleção
        await supabase.from("recusas_candidato").insert({
          candidato_id: itemFoco.candidato_id,
          vaga_id: itemFoco.vaga_id,
        });

        await supabase.from("selecao_empresa").delete().eq("id", itemFoco.id);
        Alert.alert("Aviso", "Convite recusado.");
      }

      buscarEntrevistas();
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível processar sua resposta.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.iconBox}>
          <Image
            source={{ uri: item.vagas_empregos?.cadastro_empresa?.foto_url }}
            style={styles.logoEmpresa}
          />
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.empresaTxt}>
            {item.vagas_empregos?.cadastro_empresa?.nome}
          </Text>
          <Text style={styles.cargoTxt}>{item.vagas_empregos?.cargo}</Text>
          <View style={styles.dateBadge}>
            <Ionicons name="time-outline" size={14} color="#00f2ff" />
            <Text style={styles.dateTxt}>
              {item.horarios_entrevistas?.dias[0]} às{" "}
              {item.horarios_entrevistas?.horarios[0]}
            </Text>
          </View>
        </View>

        {/* AJUSTE DO RÓTULO DE STATUS */}
        <View style={styles.statusLabelBox}>
          <Text
            style={[
              styles.statusLabelTxt,
              {
                color:
                  item.status === "agendado" || item.status === "entrevistado"
                    ? "#39ff14" // Verde para quem já tem horário
                    : "#ff9f00", // Laranja para 'selecionado' ou outros
              },
            ]}
          >
            {item.status === "agendado"
              ? "MARCADA"
              : item.status === "entrevistado"
                ? "FINALIZADA"
                : "PENDENTE"}
          </Text>
        </View>
      </View>

      {/* LÓGICA DO BOTÃO DE VÍDEO DO $BRUNOZUCKER */}
      {item.status === "agendado" || item.status === "entrevistado" ? (
        <View style={{ paddingHorizontal: 15, paddingBottom: 15 }}>
          <ChamadaCandidato item={item} />
        </View>
      ) : (
        <TouchableOpacity
          style={{ padding: 15, alignItems: "center" }}
          onPress={() => {
            setItemFoco(item);
            setModalConvite(true);
          }}
        >
          <Text style={{ color: "#00f2ff", fontSize: 13, fontWeight: "bold" }}>
            CLIQUE PARA VER DETALHES E CONFIRMAR
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER E STATS (Replicando Mock) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Agenda</Text>
        <Ionicons name="calendar-outline" size={24} color="#39ff14" />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>
            {stats.convites < 10 ? `0${stats.convites}` : stats.convites}
          </Text>
          <Text style={styles.statLabel}>CONVITES</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: "#39ff14" }]}>
            {stats.hoje}
          </Text>
          <Text style={styles.statLabel}>FINALIZADAS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: "#00f2ff" }]}>
            {stats.novos}
          </Text>
          <Text style={styles.statLabel}>NOVOS</Text>
        </View>
      </View>

      <Text style={styles.subTitle}>PRÓXIMAS ENTREVISTAS</Text>

      {loading && !refreshing ? (
        <ActivityIndicator
          size="large"
          color="#39ff14"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={entrevistas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={buscarEntrevistas}
              tintColor="#39ff14"
            />
          }
        />
      )}

      {/* MODAL DE NOTIFICAÇÃO/CONVITE */}
      <Modal visible={modalConvite} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.neonCircle}>
              <MaterialCommunityIcons
                name="briefcase-check"
                size={40}
                color="#39ff14"
              />
            </View>

            <Text style={styles.modalTitle}>Novo Agendamento!</Text>
            <Text style={styles.modalDesc}>
              Uma empresa quer te entrevistar:
            </Text>

            <View style={styles.infoPreview}>
              <Text style={styles.previewLabel}>EMPRESA</Text>
              <Text style={styles.previewValue}>
                {itemFoco?.vagas_empregos?.cadastro_empresa?.nome}
              </Text>

              <Text style={styles.previewLabel}>VAGA</Text>
              <Text style={styles.previewValue}>
                {itemFoco?.vagas_empregos?.cargo}
              </Text>

              <View style={styles.rowGrid}>
                <View>
                  <Text style={styles.previewLabel}>DIA</Text>
                  <Text style={styles.previewValue}>
                    {itemFoco?.horarios_entrevistas?.dias[0]}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.previewLabel}>HORÁRIO</Text>
                  <Text style={styles.previewValue}>
                    {itemFoco?.horarios_entrevistas?.horarios[0]}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btnConfirm}
              onPress={() => responderConvite(true)}
            >
              <Text style={styles.btnConfirmTxt}>CONFIRMAR PRESENÇA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnRefuse}
              onPress={() => responderConvite(false)}
            >
              <Text style={styles.btnRefuseTxt}>RECUSAR CONVITE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 60,
    marginBottom: 25,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 30 },
  statCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  statNum: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  statLabel: { color: "#666", fontSize: 10, marginTop: 5, fontWeight: "bold" },
  subTitle: {
    color: "#555",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#121212",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  cardContent: { flexDirection: "row", alignItems: "center" },
  logoEmpresa: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#222",
  },
  infoBox: { flex: 1, marginLeft: 15 },
  empresaTxt: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cargoTxt: { color: "#888", fontSize: 13 },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  dateTxt: { color: "#00f2ff", fontSize: 12, fontWeight: "bold" },
  statusLabelTxt: { fontSize: 10, fontWeight: "bold" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "88%",
    backgroundColor: "#111",
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  neonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#39ff14",
    marginBottom: 20,
    shadowColor: "#39ff14",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  modalDesc: { color: "#888", fontSize: 14, marginTop: 5, marginBottom: 20 },
  infoPreview: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  previewLabel: { color: "#555", fontSize: 10, fontWeight: "bold" },
  previewValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 10,
  },
  rowGrid: { flexDirection: "row", justifyContent: "space-between" },
  btnConfirm: {
    width: "100%",
    backgroundColor: "#39ff14",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  btnConfirmTxt: { color: "#000", fontWeight: "900", fontSize: 14 },
  btnRefuse: {
    width: "100%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  btnRefuseTxt: { color: "#ff3131", fontWeight: "bold", fontSize: 13 },
});
