// Feed da empresa — permite publicar posts com texto e foto, visualizar posts de outras empresas e interagir.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import RankingEmpresas from "../ranking_empresas/RankingEmpresas";
import { decode } from "base-64";
import NotificacoesPush from "../../components/notificacoes/NotificacoesPush";
import { useNavigation } from "@react-navigation/native";

export default function FeedEmpresa({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoPost, setNovoPost] = useState("");
  const [imagemSelecionada, setImagemSelecionada] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [userId, setUserId] = useState(null);
  const [rankKey, setRankKey] = useState(0);
  const [dadosImagemPost, setDadosImagemPost] = useState(null);
  const nav = useNavigation();

  async function fetchFeed() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id);

      const { data, error } = await supabase
        .from("posts_empresas")
        .select(
          `
          *,
          empresa:cadastro_empresa!posts_empresas_empresa_id_fkey(
            nome,
            foto_url
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeed();
  }, []);

  const selecionarImagem = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const ext = file.uri.split(".").pop().split(/[?#]/)[0].toLowerCase();

      setImagemSelecionada(file.uri);
      setDadosImagemPost({
        base64: file.base64,
        ext: ext,
      });
    } catch (error) {
      console.log("Erro ao selecionar:", error.message);
    }
  };

  const base64ToArrayBuffer = (base64) => {
    // Limpeza para garantir que não vá o cabeçalho data:image
    const base64Limpo = base64.includes(",") ? base64.split(",")[1] : base64;
    const binaryString = decode(base64Limpo);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  async function handlePublicar() {
    if (!novoPost.trim() && !imagemSelecionada) return;
    setEnviando(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let urlImagemFinal = null;

      if (imagemSelecionada && dadosImagemPost) {
        const fileName = `${user.id}/${Date.now()}.${dadosImagemPost.ext}`;
        const arrayBuffer = base64ToArrayBuffer(dadosImagemPost.base64);

        const { error: uploadError } = await supabase.storage
          .from("posts_fotos_empresas")
          .upload(fileName, arrayBuffer, {
            contentType: `image/${dadosImagemPost.ext}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("posts_fotos_empresas")
          .getPublicUrl(fileName);

        urlImagemFinal = data.publicUrl;
      }

      const { error: insertError } = await supabase
        .from("posts_empresas")
        .insert({
          empresa_id: user.id,
          conteudo_texto: novoPost,
          posts_fotos_empresas: urlImagemFinal,
        });

      if (insertError) throw insertError;

      setNovoPost("");
      setImagemSelecionada(null);
      setDadosImagemPost(null);
      fetchFeed();
      Alert.alert("Sucesso", "Publicado!");
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setEnviando(false);
    }
  }

  const handleInteracao = async (postId, tipo) => {
    try {
      const post = posts.find((p) => p.id === postId);
      const interacoes = post.interacoes_usuarios || {
        aplaudiram: [],
        recomendaram: [],
      };
      const map = { aplaudir: "aplaudiram", recomendar: "recomendaram" };

      if (interacoes[map[tipo]]?.includes(userId)) {
        return Alert.alert("Aviso", "Você já fez isso.");
      }

      const novasInteracoes = {
        ...interacoes,
        [map[tipo]]: [...(interacoes[map[tipo]] || []), userId],
      };

      const campo = `contagem_${tipo}`;
      const { error } = await supabase
        .from("posts_empresas")
        .update({
          [campo]: (post[campo] || 0) + 1,
          interacoes_usuarios: novasInteracoes,
        })
        .eq("id", postId);

      if (error) throw error;

      await supabase.rpc("atualizar_ranking_total", {
        target_empresa_id: post.empresa_id,
      });
      setRankKey((prev) => prev + 1);
      fetchFeed();
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerFeed}>
        <Text style={styles.tituloFeed}>Achei Vaga</Text>
        {/* Lógica de Notificações */}
        <NotificacoesPush />
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => nav.navigate("NotificacoesGlobal")}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={22}
            color="#7dd3fc"
          />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>
      <View style={styles.containerInput}>
        <View style={styles.rowInput}>
          <TextInput
            style={styles.input}
            placeholder="O que sua empresa quer publicar?"
            placeholderTextColor="#64748b"
            value={novoPost}
            onChangeText={setNovoPost}
            multiline
          />
        </View>

        {imagemSelecionada && (
          <View style={{ marginTop: 10, position: "relative" }}>
            <Image
              source={{ uri: imagemSelecionada }}
              style={styles.previewImagem}
            />
            <TouchableOpacity
              style={{ position: "absolute", right: 5, top: 5 }}
              onPress={() => {
                setImagemSelecionada(null);
                setDadosImagemPost(null);
              }}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={26}
                color="#ff4d4d"
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.rowActionsInput}>
          <TouchableOpacity style={styles.btnMedia} onPress={selecionarImagem}>
            <MaterialCommunityIcons name="camera" size={20} color="#00f2ff" />
            <Text style={styles.txtBtnMedia}>Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPublicar}
            onPress={handlePublicar}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color="#0a0b10" />
            ) : (
              <Text style={styles.txtPublicar}>Publicar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={fetchFeed}
        ListHeaderComponent={<RankingEmpresas key={rankKey} />}
        renderItem={({ item }) => {
          const jaInteragiu = (tipo) =>
            item.interacoes_usuarios?.[
              tipo === "aplaudir" ? "aplaudiram" : "recomendaram"
            ]?.includes(userId);

          return (
            <View style={styles.cardPost}>
              <View style={styles.postHeader}>
                <Image
                  source={{
                    uri:
                      item.empresa?.foto_url ||
                      "https://via.placeholder.com/100",
                  }}
                  style={styles.avatarPost}
                />
                <Text style={styles.nomeEmpresaPost}>
                  {item.empresa?.nome || "Empresa"}
                </Text>
              </View>

              <Text style={styles.textoPost}>{item.conteudo_texto}</Text>

              {item.posts_fotos_empresas && (
                <Image
                  source={{ uri: item.posts_fotos_empresas }}
                  style={styles.fotoPost}
                />
              )}

              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleInteracao(item.id, "aplaudir")}
                >
                  <MaterialCommunityIcons
                    name="hand-clap"
                    size={20}
                    color={jaInteragiu("aplaudir") ? "#64748b" : "#39ff14"}
                  />
                  <Text style={styles.actionTxt}>
                    {item.contagem_aplaudir || 0} Aplaudir
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    navigation.navigate("ComentariosEmpresas", {
                      postId: item.id,
                    })
                  }
                >
                  <MaterialCommunityIcons
                    name="comment-outline"
                    size={18}
                    color="#00f2ff"
                  />
                  <Text style={styles.actionTxt}>
                    {item.contagem_comentarios || 0} Interagir
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleInteracao(item.id, "recomendar")}
                >
                  <MaterialCommunityIcons
                    name="medal-outline"
                    size={18}
                    color={jaInteragiu("recomendar") ? "#64748b" : "#FFF"}
                  />
                  <Text style={styles.actionTxt}>
                    {item.contagem_recomendar || 0} Recomendar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0b10",
    paddingHorizontal: 16,
  },

  /* ================= HEADER ================= */

  headerFeed: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 55,
    marginBottom: 18,
  },

  tituloFeed: {
    fontSize: 26,
    fontWeight: "900",
    color: "#00f2ff",
    letterSpacing: 1.5,
  },

  bellButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: "rgba(62,198,255,0.08)",
  },

  bellDot: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#39ff14",
  },

  /* ================= INPUT POST ================= */

  containerInput: {
    backgroundColor: "rgba(30,45,75,0.85)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(62,198,255,0.25)",
  },

  rowInput: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  input: {
    flex: 1,
    color: "#d3e6fd",
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: "top",
  },

  rowActionsInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    alignItems: "center",
  },

  btnMedia: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "rgba(0,242,255,0.08)",
  },

  txtBtnMedia: {
    color: "#3ec6ff",
    marginLeft: 6,
    fontWeight: "600",
  },

  btnPublicar: {
    backgroundColor: "#3ec6ff",
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: "#3ec6ff",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },

  txtPublicar: {
    color: "#0a0b10",
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  previewImagem: {
    width: "100%",
    height: 210,
    borderRadius: 14,
    marginTop: 12,
  },

  /* ================= CARD POST ================= */

  cardPost: {
    backgroundColor: "rgba(30,45,75,0.85)",
    marginBottom: 18,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(62,198,255,0.2)",
    shadowColor: "#3ec6ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 4,
  },

  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  avatarPost: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "#3ec6ff",
  },

  nomeEmpresaPost: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },

  textoPost: {
    color: "#d3e6fd",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },

  fotoPost: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    marginBottom: 14,
  },

  /* ================= AÇÕES ================= */

  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 14,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
  },

  actionTxt: {
    color: "#d3e6fd",
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },

  /* ================= ESTADOS ÍCONES ================= */

  iconAplaudirActive: {
    color: "#39ff14",
  },

  iconAplaudirInactive: {
    color: "#64748b",
  },

  iconRecomendarActive: {
    color: "#ffffff",
  },

  iconRecomendarInactive: {
    color: "#64748b",
  },

  iconComentario: {
    color: "#3ec6ff",
  },
});