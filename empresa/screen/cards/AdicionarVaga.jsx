// Formulário de criação/edição de vaga — inclui nicho, cargo, salário, contrato, automação de seleção e agendamento.
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { nichos } from "../../../components/nichos";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function AdicionarVaga() {
  const navigation = useNavigation();
  const route = useRoute();
  const { vagaId } = route.params || {}; // Se vagaId existir, é modo edição
  const isEdit = !!vagaId;

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [form, setForm] = useState({
    nichos: [],
    status: "pausado",
    imagem_vaga_url: null,
    cargo: "",
    salario: "",
    contrato: "",
    endereco: { cidade: "", estado: "" },
    formacao: "",
    auto_selecao: false,
    nivel_selecao: 50,
    auto_agendar: false,
    nivel_agendar: 50,
    agendamento_config: { dias: [], horarios: [] },
    descricao: "",
  });

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

  // Carrega dados da vaga se for modo edição (igual ao EditarPerfilEmpresa)
  useEffect(() => {
    if (isEdit && vagaId) {
      const carregarVaga = async () => {
        setLoading(true);
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user?.id) return;

          const { data, error } = await supabase
            .from("vagas_empregos")
            .select("*")
            .eq("id", vagaId)
            .eq("empresa_id", session.user.id) // Segurança: só do usuário atual
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setForm({
              nichos: data.nichos || [],
              status: data.status || "pausado",
              imagem_vaga_url: data.imagem_vaga_url || null,
              cargo: data.cargo || "",
              salario: data.salario || "",
              contrato: data.contrato || "",
              endereco: data.endereco || { cidade: "", estado: "" },
              auto_selecao: data.auto_selecao || false,
              nivel_selecao: data.nivel_selecao || 50,
              auto_agendar: data.auto_agendar || false,
              nivel_agendar: data.nivel_agendar || 50,
              agendamento_config: data.agendamento_config || {
                dias: [],
                horarios: [],
              },

              descricao: data.descricao || "",
            });
          }
        } catch (err) {
          console.error("Erro ao carregar vaga:", err);
          Alert.alert("Erro", "Não foi possível carregar a vaga.");
        } finally {
          setLoading(false);
        }
      };

      carregarVaga();
    }
  }, [vagaId, isEdit]);

  // Handle genérico para campos normais e aninhados (igual EditarPerfilEmpresa)
  const handleChange = (field, value) => {
    let sanitized = value;
    if (field === "endereco.estado") {
      sanitized = value.toUpperCase().slice(0, 2);
    }

    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setForm((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: sanitized },
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: sanitized }));
    }
  };

  const selecionarImagem = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      handleChange("imagem_vaga_url", result.assets[0].uri);
    }
  };

  const uploadFotoVaga = async (uri, userId) => {
    try {
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${userId}/${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from("fotos_vagas")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("fotos_vagas")
        .getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Erro no upload:", error);
      return null;
    }
  };

  const toggleDia = (dia) => {
    setForm((prev) => {
      const dias = prev.agendamento_config.dias;
      const novosDias = dias.includes(dia)
        ? dias.filter((d) => d !== dia)
        : [...dias, dia];
      return {
        ...prev,
        agendamento_config: { ...prev.agendamento_config, dias: novosDias },
      };
    });
  };

  const toggleHorario = (h) => {
    setForm((prev) => {
      let horarios = [...prev.agendamento_config.horarios];
      if (horarios.includes(h)) {
        horarios = horarios.filter((x) => x !== h);
      } else {
        if (horarios.length >= 3) {
          Alert.alert("Limite", "Máximo 3 horários.");
          return prev;
        }
        horarios.push(h);
      }
      return {
        ...prev,
        agendamento_config: { ...prev.agendamento_config, horarios },
      };
    });
  };

  const alternarNicho = (value) => {
    setForm((prev) => {
      const nichos = prev.nichos;
      if (nichos.includes(value)) {
        return { ...prev, nichos: nichos.filter((n) => n !== value) };
      } else {
        if (nichos.length >= 10) {
          Alert.alert("Limite", "Máximo 10 nichos.");
          return prev;
        }
        return { ...prev, nichos: [...nichos, value] };
      }
    });
  };

  const handlePublicar = async () => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Usuário não autenticado.");

      let urlFinal = form.imagem_vaga_url;
      if (form.imagem_vaga_url && !form.imagem_vaga_url.startsWith("http")) {
        urlFinal = await uploadFotoVaga(form.imagem_vaga_url, session.user.id);
        if (!urlFinal) {
          Alert.alert("Atenção", "Vaga salva sem foto.");
        }
      }

      const vagaData = {
        ...form,
        empresa_id: session.user.id,
        imagem_vaga_url: urlFinal || null,
        updated_at: new Date().toISOString(),
      };

      let insertedId = vagaId;

      if (isEdit) {
        // Modo edição: update
        const { error } = await supabase
          .from("vagas_empregos")
          .update(vagaData)
          .eq("id", vagaId)
          .eq("empresa_id", session.user.id);

        if (error) throw error;
        Alert.alert("Sucesso", "Vaga atualizada com sucesso!");
      } else {
        // Modo criação: insert e força status "ativo" na publicação
        vagaData.status = "ativo"; // Força ativo ao publicar nova vaga
        vagaData.created_at = new Date().toISOString();

        const { data, error } = await supabase
          .from("vagas_empregos")
          .insert([vagaData])
          .select("id")
          .single();

        if (error) throw error;

        insertedId = data.id;
        Alert.alert("Sucesso", "Vaga publicada com sucesso!");
      }

      // Após salvar (create ou edit), recarrega a tela em modo edição com o ID
      // Isso garante que o status fique "ativo" após publicação e carregue os dados salvos
      navigation.replace("VagasPublicadas", { vagaId: insertedId });
    } catch (err) {
      console.error("Erro ao salvar vaga:", err);
      Alert.alert("Erro", err.message || "Falha ao salvar a vaga.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={{ color: "#00f2ff", fontSize: 16, fontWeight: "600" }}>
          ← Voltar
        </Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>
        {isEdit ? "Editar Vaga" : "Adicionar Vaga"}
      </Text>

      {/* HEADER COM FOTO E STATUS */}
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.fotoQuadrada}
          onPress={selecionarImagem}
        >
          {form.imagem_vaga_url ? (
            <Image
              source={{ uri: form.imagem_vaga_url }}
              style={styles.imageFull}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="camera" size={32} color="#00f2ff" />
          )}
        </TouchableOpacity>

        <View style={styles.statusControl}>
          <Text style={[styles.label, { marginBottom: 0, marginRight: 8 }]}>
            Status da Vaga
          </Text>
          <Switch
            value={form.status === "ativo"}
            onValueChange={(v) =>
              handleChange("status", v ? "ativo" : "pausado")
            }
            trackColor={{ false: "#333", true: "#00ff8844" }}
            thumbColor={form.status === "ativo" ? "#00ff88" : "#666"}
          />
        </View>
      </View>

      <Text style={styles.label}>nichos Selecionados (máx. 10)</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: form.nichos.length ? "#fff" : "#666" }}>
          {form.nichos.length > 0
            ? form.nichos.join(", ")
            : "Selecione os nichos da vaga..."}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Cargo*"
        placeholderTextColor="#666"
        value={form.cargo}
        onChangeText={(t) => handleChange("cargo", t)}
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Salário"
          placeholderTextColor="#666"
          value={form.salario}
          onChangeText={(t) => handleChange("salario", t)}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Contrato"
          placeholderTextColor="#666"
          value={form.contrato}
          onChangeText={(t) => handleChange("contrato", t)}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Cidade"
          placeholderTextColor="#666"
          value={form.endereco.cidade}
          onChangeText={(t) => handleChange("endereco.cidade", t)}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="UF"
          placeholderTextColor="#666"
          value={form.endereco.estado}
          onChangeText={(t) => handleChange("endereco.estado", t)}
          maxLength={2}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.cardAutomacao}>
        <View style={styles.rowAutomacao}>
          <Text style={styles.label}>Auto Seleção</Text>
          <Switch
            value={form.auto_selecao}
            onValueChange={(v) => handleChange("auto_selecao", v)}
            trackColor={{ false: "#333", true: "#00f2ff55" }}
          />
        </View>
        <Slider
          disabled={!form.auto_selecao}
          minimumValue={0}
          maximumValue={100}
          value={form.nivel_selecao}
          onValueChange={(v) => handleChange("nivel_selecao", Math.floor(v))}
          minimumTrackTintColor="#00f2ff"
        />
        <Text style={styles.val}>{form.nivel_selecao}%</Text>

        <View style={styles.divider} />

        <View style={styles.rowAutomacao}>
          <Text style={styles.label}>Auto Agendar</Text>
          <Switch
            value={form.auto_agendar}
            onValueChange={(v) => handleChange("auto_agendar", v)}
            trackColor={{ false: "#333", true: "#00ff8855" }}
          />
        </View>
        <Slider
          disabled={!form.auto_agendar}
          minimumValue={0}
          maximumValue={100}
          value={form.nivel_agendar}
          onValueChange={(v) => handleChange("nivel_agendar", Math.floor(v))}
          minimumTrackTintColor="#00ff88"
        />
        <Text style={styles.val}>{form.nivel_agendar}%</Text>

        {form.auto_agendar && (
          <View style={{ marginTop: 15 }}>
            <Text style={styles.subLabel}>DIAS DISPONÍVEIS</Text>
            <View style={styles.rowChips}>
              {diasSemana.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.chip,
                    form.agendamento_config.dias.includes(d) &&
                      styles.chipAtivo,
                  ]}
                  onPress={() => toggleDia(d)}
                >
                  <Text
                    style={{
                      color: form.agendamento_config.dias.includes(d)
                        ? "#000"
                        : "#fff",
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
                    form.agendamento_config.horarios.includes(h) &&
                      styles.chipAtivo,
                  ]}
                  onPress={() => toggleHorario(h)}
                >
                  <Text
                    style={{
                      color: form.agendamento_config.horarios.includes(h)
                        ? "#000"
                        : "#fff",
                      fontSize: 12,
                    }}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <Text style={styles.label}>Descrição da Vaga</Text>
      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: "top" }]}
        placeholder="Requisitos, benefícios, informações adicionais..."
        placeholderTextColor="#666"
        multiline
        value={form.descricao}
        onChangeText={(t) => handleChange("descricao", t)}
      />

      <TouchableOpacity
        style={styles.btn}
        onPress={handlePublicar}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.btnText}>
            {isEdit ? "ATUALIZAR VAGA" : "PUBLICAR VAGA"}
          </Text>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar nichos</Text>
            <ScrollView style={{ marginVertical: 15 }}>
              {nichos.map((n) => {
                const selecionado = form.nichos.includes(n.value);
                return (
                  <TouchableOpacity
                    key={n.value}
                    style={[
                      styles.modalItem,
                      selecionado && styles.modalItemAtivo,
                    ]}
                    onPress={() => alternarNicho(n.value)}
                  >
                    <Text
                      style={{
                        color: selecionado ? "#39ff14" : "#fff",
                        fontWeight: selecionado ? "bold" : "normal",
                      }}
                    >
                      {n.label}
                    </Text>
                    {selecionado && (
                      <Ionicons
                        name="checkmark-sharp"
                        size={20}
                        color="#39ff14"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.btnText}>CONFIRMAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  backBtn: {
    marginTop: 40,
    marginBottom: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 30,
    letterSpacing: 1,
  },
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  statusControl: { flexDirection: "row", alignItems: "center" },
  fotoQuadrada: {
    width: 80,
    height: 80,
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#00f2ff",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageFull: { width: "100%", height: "100%" },
  label: {
    color: "#00f2ff",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 6,
  },
  subLabel: {
    color: "#888",
    fontSize: 11,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  cardAutomacao: {
    backgroundColor: "#080808",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#111",
  },
  rowAutomacao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  divider: { height: 1, backgroundColor: "#1a1a1a", marginVertical: 16 },
  val: {
    color: "#fff",
    textAlign: "right",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 4,
  },
  rowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#0a0a0a",
  },
  chipAtivo: { backgroundColor: "#39ff14", borderColor: "#39ff14" },
  btn: {
    backgroundColor: "#00ff88",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  btnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#0a0a0a",
    width: "88%",
    maxHeight: "75%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  modalTitle: {
    color: "#00f2ff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalItemAtivo: { backgroundColor: "#39ff1408" },
});
