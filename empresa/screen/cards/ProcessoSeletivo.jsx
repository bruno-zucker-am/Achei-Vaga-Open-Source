// Processo seletivo — lista candidatos selecionados, permite agendar entrevistas ou removê-los da fila.
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from "@react-navigation/native";
import { calculos } from "../../../components/calculos";
import { estilos } from "../../../components/estilos";

export default function SelecaoEmpresa() {
  const navigation = useNavigation();
  const route = useRoute();
  const { vagaId, isEdit } = route.params || {};
  const [carregando, setCarregando] = useState(true);
  const [candidatos, setCandidatos] = useState([]);
  const [atualizando, setAtualizando] = useState(false);

  // Estados para o Modal de Confirmação de Remoção
  const [modalRemoverVisivel, setModalRemoverVisivel] = useState(false);
  const [candidatoParaRemover, setCandidatoParaRemover] = useState(null);

  // Estados para o Modal de Agendamento
  const [modalAgendarVisivel, setModalAgendarVisivel] = useState(false);
  const [candidatoParaAgendar, setCandidatoParaAgendar] = useState(null);
  const [diasAgendamento, setDiasAgendamento] = useState([]);
  const [horariosAgendamento, setHorariosAgendamento] = useState([]);

  // Modal genérico para mensagens (sucesso/erro)
  const [modalMensagemVisivel, setModalMensagemVisivel] = useState(false);
  const [tituloMensagem, setTituloMensagem] = useState("");
  const [textoMensagem, setTextoMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("sucesso"); // "sucesso" ou "erro"

  const [formulario, setFormulario] = useState({
    configAgendamento: { dias: [], horarios: [] },
    autoAgendar: false,
  });

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return "N/A";
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const diffMes = hoje.getMonth() - nascimento.getMonth();
    if (
      diffMes < 0 ||
      (diffMes === 0 && hoje.getDate() < nascimento.getDate())
    ) {
      idade--;
    }
    return idade;
  };

  // Define os dias e horários pra escolher os agendamentos
  const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const horariosBase = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ];

  useEffect(() => {
    if (!vagaId) return;

    const carregarVaga = async () => {
      setCarregando(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) return;

        const { data, error } = await supabase
          .from("vagas_empregos")
          .select("agendamento_config")
          .eq("id", vagaId)
          .eq("empresa_id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        setFormulario({
          configAgendamento: data?.agendamento_config || {
            dias: [],
            horarios: [],
          },
        });
      } catch (err) {
        console.error("Erro ao carregar vaga:", err);
        mostrarMensagem("Erro", "Não foi possível carregar a vaga.", "erro");
      } finally {
        setCarregando(false);
      }
    };

    carregarVaga();
  }, [vagaId]);

  // ================= BUSCAR SELECIONADOS =================

  const buscarSelecionados = useCallback(async () => {
    try {
      setCarregando(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) return;

      const { data: selecoes, error } = await supabase
        .from("selecao_empresa")
        .select(
          `
        *,
        cadastro_candidato:candidato_id (*),
        vagas_empregos:vaga_id (*)
      `,
        )
        .eq("empresa_id", session.user.id)
        .eq("status", "selecionado"); // ✅ apenas quem pode ser agendado

      if (error) throw error;

      const formatados = (selecoes || []).map((item) => {
        const perfilCand = item.cadastro_candidato;
        const vagaRef = item.vagas_empregos;

        const nivelMatch = calculos(perfilCand, vagaRef);
        const corMatch = estilos(nivelMatch);

        return {
          id: item.id,
          candidato_id: item.candidato_id,
          vaga_id: item.vaga_id,
          nome: perfilCand?.nome || "Candidato",
          foto: perfilCand?.foto_url,
          cargo_vaga: vagaRef?.cargo,
          status: item.status,
          nivel: nivelMatch,
          cor: corMatch,
          idade: perfilCand?.idade || "N/A",
          cidade: perfilCand?.endereco?.cidade || "N/A",
          estado: perfilCand?.endereco?.estado || "N/A",
        };
      });

      setCandidatos(formatados);
    } catch (error) {
      console.error("Erro ao carregar selecionados:", error);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      buscarSelecionados();
    }, [buscarSelecionados]),
  );

  // ================= REMOVER CANDIDATO =================

  const abrirConfirmacaoRemover = (item) => {
    setCandidatoParaRemover(item);
    setModalRemoverVisivel(true);
  };

  const confirmarRemocao = async () => {
    if (!candidatoParaRemover) return;

    setModalRemoverVisivel(false);
    setCarregando(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("recusas_empresa").insert({
        empresa_id: user.id,
        candidato_id: candidatoParaRemover.candidato_id,
        vaga_id: candidatoParaRemover.vaga_id,
      });

      const { error } = await supabase
        .from("selecao_empresa")
        .delete()
        .eq("id", candidatoParaRemover.id);

      if (error) throw error;

      setCandidatos((prev) =>
        prev.filter((c) => c.id !== candidatoParaRemover.id),
      );

      mostrarMensagem("Sucesso", "Candidato removido com sucesso!", "sucesso");
    } catch (err) {
      console.error("Erro ao remover:", err.message);
      mostrarMensagem("Erro", "Não foi possível remover o candidato.", "erro");
    } finally {
      setCarregando(false);
      setCandidatoParaRemover(null);
    }
  };

  // ================= MODAL AGENDAR =================

  const abrirAgendar = (item) => {
    setCandidatoParaAgendar(item);
    setDiasAgendamento(formulario.configAgendamento.dias);
    setHorariosAgendamento(formulario.configAgendamento.horarios);
    setModalAgendarVisivel(true);
  };

  const alternarDiaAgendar = (dia) => {
    setDiasAgendamento((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  };

  const alternarHorarioAgendar = (h) => {
    setHorariosAgendamento((prev) => {
      if (prev.includes(h)) {
        return prev.filter((x) => x !== h);
      }

      if (prev.length >= 3) {
        mostrarMensagem("Limite", "Máximo 3 horários.", "erro");
        return prev;
      }

      return [...prev, h];
    });
  };

  // ================= CONFIRMAR AGENDAMENTO =================

  const confirmarAgendamento = async () => {
    if (!candidatoParaAgendar) return;

    // ✅ Impede salvar sem escolher exatamente 1 dia e 1 horário
    if (diasAgendamento.length !== 1 || horariosAgendamento.length !== 1) {
      mostrarMensagem("Erro", "Escolha exatamente 1 dia e 1 horário.", "erro");
      return;
    }

    const diaEscolhido = diasAgendamento[0];
    const horarioEscolhido = horariosAgendamento[0];

    setModalAgendarVisivel(false);
    setCarregando(true);

    try {
      // ==============================
      // 1️⃣ Salva config geral da vaga
      // ==============================
      const { error: erroVaga } = await supabase
        .from("vagas_empregos")
        .update({
          agendamento_config: {
            dias: diasAgendamento,
            horarios: horariosAgendamento,
          },
        })
        .eq("id", candidatoParaAgendar.vaga_id);

      if (erroVaga) throw erroVaga;

      // ==============================
      // 2️⃣ Salva horário INDIVIDUAL do candidato
      // ==============================
      const { error: erroStatus } = await supabase
        .from("selecao_empresa")
        .update({
          status: "agendado",
          horarios_entrevistas: {
            dias: [diaEscolhido],
            horarios: [horarioEscolhido],
          },
        })
        .eq("id", candidatoParaAgendar.id);

      if (erroStatus) throw erroStatus;

      // ==============================
      // 3️⃣ Remove da lista local
      // ==============================
      setCandidatos((prev) =>
        prev.filter((c) => c.id !== candidatoParaAgendar.id),
      );

      mostrarMensagem("Sucesso", "Candidato movido para a agenda!", "sucesso");

      navigation.navigate("EntrevistasEmpresa");
    } catch (err) {
      console.error("Erro no agendamento:", err);
      mostrarMensagem("Erro", "Falha ao salvar agendamento.", "erro");
    } finally {
      setCarregando(false);
      setCandidatoParaAgendar(null);
    }
  };

  // ================= MODAL MENSAGEM =================

  const mostrarMensagem = (titulo, texto, tipo) => {
    setTituloMensagem(titulo);
    setTextoMensagem(texto);
    setTipoMensagem(tipo);
    setModalMensagemVisivel(true);
  };

  const renderCandidato = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: item.foto }} style={styles.candidatoImage} />
        <View style={styles.infoContainer}>
          <Text style={styles.nomeText}>{item.nome}</Text>
          <Text style={styles.infoText}>
            {item.idade} anos • {item.cidade}/{item.estado}
          </Text>
          <Text style={styles.vagaRefText}>Vaga: {item.cargo_vaga}</Text>
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
              {item.nivel}%
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        {/* BOTÃO DE STATUS - AGORA VERDE NEON */}
        <TouchableOpacity
          style={[styles.statusBtn, { borderColor: "#39ff14" }]}
          onPress={() => alterarStatus(item)}
        >
          <Text style={{ color: "#39ff14", fontWeight: "bold", fontSize: 12 }}>
            {item.status.toUpperCase()}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnRemover}
          onPress={() => abrirConfirmacaoRemover(item)}
        >
          <Ionicons name="close-circle-outline" size={20} color="#fff" />
          <Text style={styles.btnTextWhite}>Remover</Text>
        </TouchableOpacity>
        {/* Pega dia e horário pra agendar */}
        <TouchableOpacity
          style={styles.btnRemover}
          onPress={() => abrirAgendar(item)}
        >
          <Ionicons name="calendar-outline" size={20} color="#00f2ff" />
          <Text style={styles.btnTextWhite}>Agendar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* MODAL DE CONFIRMAÇÃO DE REMOÇÃO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalRemoverVisivel}
        onRequestClose={() => setModalRemoverVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={50} color="#ff3131" />
            <Text style={styles.modalTitle}>Remover Candidato?</Text>
            <Text style={styles.modalText}>
              Deseja retirar {candidatoParaRemover?.nome} da lista? Ele não
              aparecerá para você por 30 dias.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancelar]}
                onPress={() => setModalRemoverVisivel(false)}
              >
                <Text style={styles.btnTextWhite}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnConfirmar]}
                onPress={confirmarRemocao}
              >
                <Text style={styles.btnTextBlack}>REMOVER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE AGENDAMENTO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalAgendarVisivel}
        onRequestClose={() => setModalAgendarVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agendar Entrevista</Text>
            <Text style={styles.modalText}>
              Selecione dias e horários para {candidatoParaAgendar?.nome}
            </Text>

            <Text style={styles.subLabel}>DIAS DISPONÍVEIS</Text>
            <View style={styles.rowChips}>
              {diasSemana.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.chip,
                    diasAgendamento.includes(d) && styles.chipAtivo,
                  ]}
                  onPress={() => alternarDiaAgendar(d)}
                >
                  <Text
                    style={{
                      color: diasAgendamento.includes(d) ? "#000" : "#fff",
                      fontSize: 12,
                    }}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.subLabel}>HORÁRIOS (máx. 3)</Text>
            <View style={styles.rowChips}>
              {horariosBase.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.chip,
                    horariosAgendamento.includes(h) && styles.chipAtivo,
                  ]}
                  onPress={() => alternarHorarioAgendar(h)}
                >
                  <Text
                    style={{
                      color: horariosAgendamento.includes(h) ? "#000" : "#fff",
                      fontSize: 12,
                    }}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancelar]}
                onPress={() => setModalAgendarVisivel(false)}
              >
                <Text style={styles.btnTextWhite}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnConfirmar]}
                onPress={confirmarAgendamento}
              >
                <Text style={styles.btnTextBlack}>CONFIRMAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL GENÉRICO PARA MENSAGENS */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalMensagemVisivel}
        onRequestClose={() => setModalMensagemVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name={
                tipoMensagem === "sucesso" ? "checkmark-circle" : "alert-circle"
              }
              size={50}
              color={tipoMensagem === "sucesso" ? "#39ff14" : "#ff3131"}
            />
            <Text style={styles.modalTitle}>{tituloMensagem}</Text>
            <Text style={styles.modalText}>{textoMensagem}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#39ff14" }]}
              onPress={() => setModalMensagemVisivel(false)}
            >
              <Text style={styles.btnTextBlack}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HEADER COM BOTÃO VOLTAR */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#39ff14" />
        </TouchableOpacity>
        <Text style={styles.title}>Selecionados</Text>
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{candidatos.length}</Text>
        </View>
      </View>
      <FlatList
        data={candidatos}
        keyExtractor={(item) => item.id}
        renderItem={renderCandidato}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={buscarSelecionados}
            tintColor="#39ff14"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 60,
    marginBottom: 20,
  },
  btnVoltar: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 5,
  },
  countContainer: {
    backgroundColor: "#39ff14",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  countText: { color: "#000", fontWeight: "900", fontSize: 14 },
  card: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  cardHeader: { flexDirection: "row", gap: 12 },
  candidatoImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#111",
  },
  infoContainer: { flex: 1 },
  nomeText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  infoText: { color: "#aaa", fontSize: 13, marginTop: 2 },
  vagaRefText: { color: "#666", fontSize: 13, marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 15 },
  statusBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  btnRemover: {
    flex: 1,
    backgroundColor: "#ff3131",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  btnTextWhite: { color: "#fff", fontWeight: "bold" },
  btnTextBlack: { color: "#000", fontWeight: "bold" },
  compatibilidadeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  barraProgressoBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#1a1a1a",
    borderRadius: 3,
    overflow: "hidden",
  },
  barraProgressoFill: { height: "100%" },
  nivelText: { fontSize: 12, fontWeight: "bold", width: 35 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  modalText: {
    color: "#aaa",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%" },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnCancelar: { backgroundColor: "#222" },
  btnConfirmar: { backgroundColor: "#39ff14" },
  subLabel: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  rowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipAtivo: {
    backgroundColor: "#39ff14",
  },
});
