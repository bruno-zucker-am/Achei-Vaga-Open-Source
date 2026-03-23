// Feed do candidato — exibe posts das empresas, permite aplaudir, recomendar e seguir. Inclui ranking de empresas no topo.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import RankingEmpresas from "../../empresa/ranking_empresas/RankingEmpresas";
import NotificacoesPush from "../../components/notificacoes/NotificacoesPush";
import { useNavigation } from "@react-navigation/native";

export default function FeedCandidato({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [feedData, setFeedData] = useState([]);
  const [userId, setUserId] = useState(null);
  const [seguindoId, setSeguindoId] = useState(null);
  const [refreshRanking, setRefreshRanking] = useState(0);
  const nav = useNavigation();

  useEffect(() => {
    getUser();
    fetchFeed();
  }, []);

  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id);
  }

  const fetchFeed = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("posts_empresas")
        .select(
          `
    *,
    empresa:cadastro_empresa!posts_empresas_empresa_id_fkey(nome,
            foto_url)
  `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFeedData(data || []);
    } catch (error) {
      console.error("Erro:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInteracao = async (id, tipo, empresaId = null) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const post = feedData.find((item) => item.id === id);

      const interacoes = post.interacoes_usuarios || {
        aplaudiram: [],
        recomendaram: [],
        seguiram: [],
      };

      const mapeamento = {
        aplaudir: "aplaudiram",
        recomendar: "recomendaram",
        seguir: "seguiram",
      };

      const chaveTipo = mapeamento[tipo];

      if (interacoes[chaveTipo]?.includes(user.id)) {
        return Alert.alert("Aviso", "Você já realizou essa ação.");
      }

      const novasInteracoes = {
        ...interacoes,
        [chaveTipo]: [...(interacoes[chaveTipo] || []), user.id],
      };

      const campoContagem = `contagem_${tipo}`;

      const { error } = await supabase
        .from("posts_empresas")
        .update({
          [campoContagem]: (post[campoContagem] || 0) + 1,
          interacoes_usuarios: novasInteracoes,
        })
        .eq("id", id);

      if (error) throw error;

      // Atualiza ranking global
      if (tipo === "aplaudir" || tipo === "recomendar") {
        // Chama a função mágica que criamos no SQL
        const { error: rpcError } = await supabase.rpc(
          "atualizar_ranking_total",
          {
            target_empresa_id: post.empresa_id,
          },
        );

        if (rpcError) console.log("Erro no RPC:", rpcError.message);

        setRefreshRanking((prev) => prev + 1);
      }

      if (tipo === "seguir") {
        setSeguindoId(id); // Deixa o botão verde/seguindo na hora

        setTimeout(() => {
          // REMOVA: setSeguindoId(null); <-- Deixa ele quieto aqui pra não resetar o visual
          navigation.navigate("CandidatoSegue", { empresaId });
        }, 3000);
      }

      fetchFeed();
    } catch (error) {
      console.error(error.message);
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
      <FlatList
        data={feedData}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={fetchFeed}
        ListHeaderComponent={<RankingEmpresas refresh={refreshRanking} />}
        renderItem={({ item }) => {
          const jaInteragiu = (tipo) => {
            const mapeamento = {
              aplaudir: "aplaudiram",
              recomendar: "recomendaram",
              seguir: "seguiram",
            };

            const chave = mapeamento[tipo];
            // Garante que estamos tratando como objeto, caso venha string do banco
            const interacoes =
              typeof item.interacoes_usuarios === "string"
                ? JSON.parse(item.interacoes_usuarios)
                : item.interacoes_usuarios;

            return interacoes?.[chave]?.includes(userId);
          };

          const textoExibir =
            typeof item.conteudo_texto === "object"
              ? item.conteudo_texto?.texto
              : item.conteudo_texto;

          return (
            <View style={styles.cardPost}>
              <View style={styles.postHeader}>
                <Image
                  source={{
                    uri:
                      item.empresa?.foto_url ||
                      "https://via.placeholder.com/100",
                  }}
                  style={styles.avatarMini}
                />

                <Text style={styles.nomeEmpresaPost}>
                  {item.empresa?.nome || "Empresa"}
                </Text>
              </View>

              <Text style={styles.textoPost}>
                {textoExibir || (item.vaga_id ? "Nova vaga publicada!" : "")}
              </Text>

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
                  disabled={jaInteragiu("aplaudir")}
                >
                  <MaterialCommunityIcons
                    name="hand-clap"
                    size={20}
                    color={jaInteragiu("aplaudir") ? "#64748b" : "#39ff14"}
                  />
                  <Text
                    style={[
                      styles.actionTxt,
                      jaInteragiu("aplaudir") && { color: "#64748b" },
                    ]}
                  >
                    {item.contagem_aplaudir || 0} Aplaudir
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    handleInteracao(item.id, "seguir", item.empresa_id)
                  }
                  // Se já seguiu no banco OU acabou de clicar, desabilita o botão
                  disabled={jaInteragiu("seguir") || seguindoId === item.id}
                >
                  <MaterialCommunityIcons
                    // Troca o ícone se estiver seguindo
                    name={
                      jaInteragiu("seguir") || seguindoId === item.id
                        ? "check-circle"
                        : "plus-circle-outline"
                    }
                    size={18}
                    // AQUI VAI A COR QUE VOCÊ PERGUNTOU
                    color={
                      jaInteragiu("seguir") || seguindoId === item.id
                        ? "#39ff14"
                        : "#00f2ff"
                    }
                  />

                  <Text
                    style={[
                      styles.actionTxt,
                      // AQUI TAMBÉM VAI A COR NO TEXTO
                      (jaInteragiu("seguir") || seguindoId === item.id) && {
                        color: "#39ff14",
                      },
                    ]}
                  >
                    {/* AQUI VAI A LÓGICA DO TEXTO QUE VOCÊ PERGUNTOU */}
                    {jaInteragiu("seguir") || seguindoId === item.id
                      ? "SEGUINDO"
                      : `${item.contagem_seguir || 0} Seguir`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleInteracao(item.id, "recomendar")}
                  disabled={jaInteragiu("recomendar")}
                >
                  <MaterialCommunityIcons
                    name="medal-outline"
                    size={18}
                    color={jaInteragiu("recomendar") ? "#64748b" : "#FFF"}
                  />
                  <Text
                    style={[
                      styles.actionTxt,
                      jaInteragiu("recomendar") && { color: "#64748b" },
                    ]}
                  >
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
  container: { flex: 1, backgroundColor: "#0a0b10", paddingHorizontal: 15 },
  headerFeed: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 15,
  },
  tituloFeed: {
    fontSize: 24,
    fontWeight: "900",
    color: "#00f2ff",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionRanking: { marginBottom: 15 },
  rowLabel: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  subtitulo: {
    fontSize: 12,
    color: "#00f2ff",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollRanking: { flexDirection: "row" },
  miniCard: {
    backgroundColor: "#161b22",
    padding: 10,
    borderRadius: 12,
    marginRight: 10,
    width: 130,
    borderWidth: 1,
    alignItems: "center",
  },
  borderAzul: { borderColor: "#00f2ff33" },
  borderVerde: { borderColor: "#39ff1433" },
  txtPosicao: {
    fontSize: 10,
    color: "#00f2ff",
    fontWeight: "bold",
    marginBottom: 2,
  },
  txtRankingNome: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  txtPontos: { color: "#64748b", fontSize: 9, marginTop: 2 },
  subtituloGeral: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 15,
    marginTop: 10,
  },
  cardPost: {
    backgroundColor: "#161b22",
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarMini: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#00f2ff22",
    borderWidth: 1,
    borderColor: "#00f2ff",
  },
  nomeEmpresaPost: {
    color: "#FFF",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 15,
  },
  textoPost: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  placeholderImagem: {
    width: "100%",
    height: 160,
    backgroundColor: "#0a0b10",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  postActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 12,
    justifyContent: "space-between",
  },
  actionBtn: { flexDirection: "row", alignItems: "center" },
  actionTxt: { color: "#FFF", fontSize: 11, fontWeight: "600", marginLeft: 6 },
});
