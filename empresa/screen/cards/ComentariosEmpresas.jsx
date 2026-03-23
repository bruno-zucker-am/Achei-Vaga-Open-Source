// Comentários/interações de um post — lista mensagens de empresas e permite enviar nova interação.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";

export default function ComentariosEmpresas({ route, navigation }) {
  const { postId } = route.params;
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  async function fetchComentarios() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("comentarios_empresas")
        .select(`*, cadastro_empresa (nome, foto_url)`)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error("Erro ao carregar comentários:", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComentarios();
  }, []);

  async function handleEnviar() {
    if (!novoComentario.trim()) return;
    setEnviando(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("comentarios_empresas").insert([
        {
          post_id: postId,
          empresa_id: user.id,
          texto: novoComentario,
          created_at: new Date(),
        },
      ]);
      if (error) throw error;
      setNovoComentario("");
      fetchComentarios();
    } catch (error) {
      alert("Erro ao enviar: " + error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#00f2ff" />
        </TouchableOpacity>
        <Text style={styles.tituloHeader}>Interações</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00f2ff" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={comentarios}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <View style={styles.cardComentario}>
              <Image
                source={{
                  uri:
                    item.cadastro_empresa?.foto_url ||
                    "https://via.placeholder.com/100",
                }}
                style={styles.avatarComentario}
              />
              <View style={styles.contentComentario}>
                <Text style={styles.nomeEmpresa}>
                  {item.cadastro_empresa?.nome}
                </Text>
                <Text style={styles.textoComentario}>{item.texto}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyTxt}>
              Nenhuma empresa interagiu ainda.
            </Text>
          }
        />
      )}

      <View style={styles.footer}>
        <TextInput
          style={styles.input}
          placeholder="Escreva sua interação..."
          placeholderTextColor="#64748b"
          value={novoComentario}
          onChangeText={setNovoComentario}
          multiline
        />
        <TouchableOpacity
          style={styles.btnEnviar}
          onPress={handleEnviar}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#0a0b10" />
          ) : (
            <MaterialCommunityIcons name="send" size={22} color="#0a0b10" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0b10" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  tituloHeader: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  cardComentario: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#161b22",
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  avatarComentario: { width: 40, height: 40, borderRadius: 10 },
  contentComentario: { marginLeft: 12, flex: 1 },
  nomeEmpresa: {
    color: "#00f2ff",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 4,
  },
  textoComentario: { color: "#cbd5e1", fontSize: 14 },
  emptyTxt: { color: "#64748b", textAlign: "center", marginTop: 50 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#161b22",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  input: {
    flex: 1,
    backgroundColor: "#0a0b10",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#FFF",
    marginRight: 10,
  },
  btnEnviar: {
    backgroundColor: "#00f2ff",
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
