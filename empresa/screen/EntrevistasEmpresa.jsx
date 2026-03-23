// Agenda de entrevistas da empresa — lista entrevistas agendadas e finalizadas, com botão de videochamada.
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import ChamadaEmpresa from "../../empresa/screen/cards/ChamadaEmpresa";

export default function EntrevistasEmpresa() {
  const [entrevistas, setEntrevistas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("pendentes");
  const [stats, setStats] = useState({ total: 0, feitas: 0, pendentes: 0 });
  const [modalConfirmarVisivel, setModalConfirmarVisivel] = useState(false);
  const [itemParaEntrevistar, setItemParaEntrevistar] = useState(null);

  const buscarEntrevistas = useCallback(async () => {
    try {
      setCarregando(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("selecao_empresa")
        .select(`
          id, status, horarios_entrevistas,
          cadastro_candidato:candidato_id ( nome, foto_url ),
          vagas_empregos:vaga_id ( cargo )
        `)
        .eq("empresa_id", session.user.id)
        .in("status", ["agendado", "entrevistado"]);

      if (error) throw error;

      const formatados = (data || []).map((item) => ({
        id: item.id,
        candidato: item.cadastro_candidato?.nome || "Candidato",
        foto: item.cadastro_candidato?.foto_url,
        cargo: item.vagas_empregos?.cargo || "Vaga",
        hora: item.horarios_entrevistas?.horarios?.[0] || "A definir",
        data: item.horarios_entrevistas?.dias?.[0] || "",
        status: item.status,
        horarios_entrevistas: item.horarios_entrevistas // Necessário para o componente de chamada
      }));

      setEntrevistas(formatados);
      setStats({
        total: formatados.length,
        feitas: formatados.filter((e) => e.status === "entrevistado").length,
        pendentes: formatados.filter((e) => e.status === "agendado").length,
      });
    } catch (err) {
      console.error("Erro:", err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { buscarEntrevistas(); }, [buscarEntrevistas]));

  const abrirConfirmarEntrevistado = (item) => {
    setItemParaEntrevistar(item);
    setModalConfirmarVisivel(true);
  };

  const confirmarEntrevistado = async () => {
    if (!itemParaEntrevistar) return;
    setModalConfirmarVisivel(false);
    await supabase.from("selecao_empresa").update({ status: "entrevistado" }).eq("id", itemParaEntrevistar.id);
    buscarEntrevistas();
  };

  const entrevistasFiltradas = entrevistas.filter((item) => 
    abaAtiva === "pendentes" ? item.status === "agendado" : item.status === "entrevistado"
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={carregando} onRefresh={buscarEntrevistas} tintColor="#39ff14" />}>
      <View style={styles.header}><Text style={styles.tituloHeader}>Agenda de Entrevistas</Text></View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats.total}</Text><Text style={styles.statLabel}>TOTAL</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum, { color: "#39ff14" }]}>{stats.feitas}</Text><Text style={styles.statLabel}>FEITAS</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum, { color: "#00f2ff" }]}>{stats.pendentes}</Text><Text style={styles.statLabel}>PENDENTES</Text></View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, abaAtiva === "pendentes" && styles.tabAtiva]} onPress={() => setAbaAtiva("pendentes")}><Text style={styles.tabTxt}>Pendentes</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, abaAtiva === "finalizadas" && styles.tabAtiva]} onPress={() => setAbaAtiva("finalizadas")}><Text style={styles.tabTxt}>Finalizadas</Text></TouchableOpacity>
      </View>

      {entrevistasFiltradas.map((item) => (
        <View key={item.id} style={styles.cardEntrevista}>
          <Image source={{ uri: item.foto || "https://via.placeholder.com/50" }} style={styles.avatar} />
          <View style={styles.infoEntrevista}>
            <Text style={styles.nomeCandidato}>{item.candidato}</Text>
            <Text style={styles.cargoCandidato}>{item.cargo}</Text>
            <View style={styles.timeRow}><Ionicons name="calendar-outline" size={14} color="#64748b" /><Text style={styles.dataEntrevista}>{item.data}</Text></View>
            <View style={styles.timeRow}><Ionicons name="time-outline" size={14} color="#64748b" /><Text style={styles.horaEntrevista}>{item.hora}</Text></View>
          </View>

          <View style={styles.statusCol}>
            {/* O SEGREDO ESTÁ AQUI: ChamadaEmpresa substituiu o TouchableOpacity antigo */}
            <ChamadaEmpresa item={item} onUpdate={buscarEntrevistas} />

            {item.status === "agendado" && (
              <TouchableOpacity onPress={() => abrirConfirmarEntrevistado(item)}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      {entrevistasFiltradas.length === 0 && (
        <Text style={styles.empty}>Nenhuma entrevista aqui.</Text>
      )}

      {/* MODAL */}
      <Modal transparent visible={modalConfirmarVisivel} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finalizar entrevista?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancelar]}
                onPress={() => setModalConfirmarVisivel(false)}
              >
                <Text style={styles.btnTextWhite}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.btnConfirmar]}
                onPress={confirmarEntrevistado}
              >
                <Text style={styles.btnTextBlack}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0b10", padding: 20 },

  header: { marginTop: 40, marginBottom: 20 },

  tituloHeader: { color: "#fff", fontSize: 22, fontWeight: "800" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  statBox: {
    backgroundColor: "#161b22",
    width: "31%",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },

  statNum: { color: "#fff", fontSize: 20, fontWeight: "900" },

  statLabel: { color: "#64748b", fontSize: 10, marginTop: 4 },

  tabs: {
    flexDirection: "row",
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#161b22",
    marginRight: 8,
  },

  tabAtiva: { backgroundColor: "#39ff14" },

  tabTxt: { color: "#fff", fontWeight: "700" },

  cardEntrevista: {
    backgroundColor: "#161b22",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  avatar: { width: 50, height: 50, borderRadius: 14, marginRight: 14 },

  infoEntrevista: { flex: 1 },

  nomeCandidato: { color: "#fff", fontSize: 16, fontWeight: "700" },

  cargoCandidato: { color: "#64748b", fontSize: 13 },

  timeRow: { flexDirection: "row", alignItems: "center" },

  horaEntrevista: { color: "#00f2ff", marginLeft: 5, fontSize: 12 },

  statusCol: { alignItems: "center", gap: 6 },

  btnCall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },

  empty: { color: "#64748b", textAlign: "center", marginTop: 40 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    width: "85%",
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },

  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  modalButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },

  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  btnCancelar: { backgroundColor: "#222" },

  btnConfirmar: { backgroundColor: "#39ff14" },

  btnTextWhite: { color: "#fff", fontWeight: "700" },

  btnTextBlack: { color: "#000", fontWeight: "900" },
  dataEntrevista: {
    color: "#39ff14",
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
  },
});
