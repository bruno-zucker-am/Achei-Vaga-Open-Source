// BossTalk — lista de conversas B2B entre empresas. Suporta fixar, arquivar, excluir e criar novas conversas.
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");

export default function ChatExterno() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [conversas, setConversas] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const [usuariosOnline, setUsuariosOnline] = useState({});
  const [busca, setBusca] = useState("");
  const [userId, setUserId] = useState(null);

  const [modalNovaConversa, setModalNovaConversa] = useState(false);
  const [buscaContato, setBuscaContato] = useState("");
  const [contatos, setContatos] = useState([]);
  const [loadingContato, setLoadingContato] = useState(false);

  // Estados de fixação
  const fixarConversa = async (conversationId) => {
    // 1. Acha a conversa na sua lista local para saber o status atual
    const conversaAlvo = conversas.find(
      (c) => c.conversation_id === conversationId,
    );
    const novoStatus = !conversaAlvo?.pinned;

    // Limite de 5 fixadas (Regra de negócio que você criou)
    const totalFixadas = conversas.filter((c) => c.pinned).length;
    if (novoStatus && totalFixadas >= 5) {
      alert("Limite de 5 conversas fixadas atingido!");
      return;
    }

    // 2. Salva no Supabase (Persistência)
    const { error } = await supabase
      .from("mensagens_empresas")
      .update({ pinned: novoStatus })
      .eq("conversation_id", conversationId);

    if (!error) {
      // 3. Recarrega a lista para refletir a mudança
      fetchConversas();
    }
  };

  // Buscar sessão do usuário
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) setUserId(session.user.id);
      else setLoading(false);
    };
    getSession();
  }, []);

  // Buscar conversas e setup realtime
  useEffect(() => {
    if (!userId) return;
    fetchConversas();
    const cleanup = setupRealtime();
    return () => cleanup && cleanup();
  }, [userId]);

  // Buscar conversas com detalhes da empresa
  const fetchConversas = async () => {
    try {
      setLoading(true);
      if (!userId) return;
      const { data, error } = await supabase
        .from("mensagens_empresas")
        .select(
          `
          *,
          perfil_empresa:cadastro_empresa!fk_mensagens_cadastro_empresa(user_id, nome, foto_url)
        `,
        )
        .or(`destinatario_id.eq.${userId},sender_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConversas(agruparMensagens(data));
    } catch (err) {
      console.error("BossTalk fetch erro:", err);
    } finally {
      setLoading(false);
    }
  };

  // AGRUPAR MENSAGENS: arquivar, Desarquivar, excluir
  const agruparMensagens = (mensagens) => {
    const mapa = {};

    // IMPORTANTE: Processamos do mais antigo para o mais novo
    // para garantir que a gente "aprenda" quem é o contato antes da sua última resposta.
    const mensagensOrdenadas = [...mensagens].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );

    mensagensOrdenadas.forEach((msg) => {
      const id = msg.conversation_id;

      if (msg.deleted_for?.includes(userId)) return;

      if (!mapa[id]) {
        mapa[id] = {
          ...msg,
          total_nao_lidas: 0,
        };
      } else {
        // --- LOGICA DE PROTEÇÃO DO BRUNO ---
        const perfilAnterior = mapa[id].perfil_empresa;
        const perfilNovoEhMeu = msg.perfil_empresa?.user_id === userId;

        if (new Date(msg.created_at) > new Date(mapa[id].created_at)) {
          const totalAtual = mapa[id].total_nao_lidas;
          const jaDesarquivou = mapa[id].euDesarquivei;

          mapa[id] = { 
            ...msg, 
            total_nao_lidas: totalAtual,
            euDesarquivei: jaDesarquivou,
            // SE a mensagem nova for sua, a gente força o perfil a continuar sendo o do contato
            perfil_empresa: perfilNovoEhMeu ? perfilAnterior : msg.perfil_empresa 
          };
        }

        // Se o que tava no mapa era você (porque você iniciou a conversa) 
        // e agora chegou uma msg do contato, a gente troca pelo dele.
        if (mapa[id].perfil_empresa?.user_id === userId && !perfilNovoEhMeu) {
          mapa[id].perfil_empresa = msg.perfil_empresa;
        }
      }

      if (msg.pinned) mapa[id].pinned = true;
      if (msg.desarquivar_for?.includes(userId)) mapa[id].euDesarquivei = true;

      if (msg.sender_id !== userId && msg.status !== "lida") {
        mapa[id].total_nao_lidas += 1;
      }
    });

    // Reordena para as mais recentes aparecerem no topo da lista
    return Object.values(mapa).sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  };

  // REAL TIME
  const setupRealtime = () => {
    const channel = supabase.channel("bosstalk_chat", {
      config: { presence: { key: userId } },
    });
    channel
      .on("presence", { event: "sync" }, () =>
        setUsuariosOnline(channel.presenceState()),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mensagens_empresas" },
        () => fetchConversas(),
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED")
          await channel.track({ online_at: new Date().toISOString() });
      });
    return () => channel.unsubscribe();
  };

  const buscarContatos = async () => {
    try {
      setLoadingContato(true);
      const { data, error } = await supabase
        .from("cadastro_empresa")
        .select("user_id, nome, foto_url")
        .neq("user_id", userId)
        .ilike("nome", `%${buscaContato}%`)
        .limit(20);
      if (error) throw error;
      setContatos(data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingContato(false);
    }
  };

  useEffect(() => {
    if (modalNovaConversa) buscarContatos();
  }, [buscaContato, modalNovaConversa]);

  const criarOuAbrirConversa = (item) => {
    const dadosContato = item.perfil_empresa || item;
    setModalNovaConversa(false);
    navigation.navigate("ChatInterno", {
      conversationId:
        item.conversation_id || [userId, dadosContato.user_id].sort().join("_"),
      contato: {
        user_id: dadosContato.user_id,
        nome: dadosContato.nome,
        foto_url: dadosContato.foto_url,
      },
    });
  };

  // Funções de recursos
  const excluirConversaBanco = async (conversationId) => {
    // 1. Pega quem já excluiu
    const { data } = await supabase
      .from("mensagens_empresas")
      .select("deleted_for")
      .eq("conversation_id", conversationId)
      .limit(1)
      .single();

    const novoArray = [...(data?.deleted_for || []), userId];

    // 2. Atualiza a coluna pra você parar de ver
    await supabase
      .from("mensagens_empresas")
      .update({ deleted_for: novoArray })
      .eq("conversation_id", conversationId);

    // 3. Remove da lista local na hora
    setConversas((prev) =>
      prev.filter((c) => c.conversation_id !== conversationId),
    );
  };

  const arquivarConversaBanco = async (conversationId) => {
    // A lógica correta para Supabase Array:
    const { data: currentData } = await supabase
      .from("mensagens_empresas")
      .select("archived_for")
      .eq("conversation_id", conversationId)
      .single();

    const novoArray = [...(currentData?.archived_for || []), userId];

    await supabase
      .from("mensagens_empresas")
      .update({ archived_for: novoArray })
      .eq("conversation_id", conversationId);

    fetchConversas();
  };

  const desarquivarConversaBanco = async (conversationId) => {
    console.log("Tentando desarquivar ID:", conversationId);
    try {
      const { data, error: fetchError } = await supabase
        .from("mensagens_empresas")
        .select("desarquivar_for")
        .eq("conversation_id", conversationId)
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const listaAtual = data?.desarquivar_for || [];

      // Se você já estiver na lista, não precisa fazer nada, mas vamos forçar o refresh
      if (listaAtual.includes(userId)) {
        console.log("Usuário já consta como desarquivado no banco.");
        fetchConversas();
        return;
      }

      const { error: updateError } = await supabase
        .from("mensagens_empresas")
        .update({ desarquivar_for: [...listaAtual, userId] })
        .eq("conversation_id", conversationId);

      if (updateError) throw updateError;

      console.log("Banco atualizado com sucesso!");
      fetchConversas(); // Força a recarga manual
    } catch (err) {
      console.error("Erro detalhado no desarquivamento:", err);
    }
  };

  const conversasFiltradas = useMemo(() => {
    return conversas
      .filter((c) => {
        const nomeParaBusca = c.perfil_empresa?.nome || "Conversa";
        const matchBusca = nomeParaBusca
          .toLowerCase()
          .includes(busca.toLowerCase());

        // LÓGICA DE OURO: Só é considerada arquivada se estiver no array
        // E NÃO tiver sido marcada como 'euDesarquivei' no agrupamento.
        const arquivadaNoBanco = c.archived_for?.includes(userId) || false;
        const estaArquivada = arquivadaNoBanco && !c.euDesarquivei;

        if (filtroAtivo === "Arquivadas") {
          return estaArquivada && matchBusca;
        }

        if (filtroAtivo === "Não lidas") {
          // Não lidas na aba principal (não arquivadas)
          return c.total_nao_lidas > 0 && !estaArquivada && matchBusca;
        }

        // Padrão (Todos): Mostra apenas o que NÃO está arquivado
        return !estaArquivada && matchBusca;
      })
      .sort((a, b) => {
        // Corrigindo a referência das variáveis para o Sort
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        // Critério de desempate: mais recentes primeiro
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [conversas, filtroAtivo, busca, userId]);

  // Renderização de item
  const renderItem = ({ item }) => {
    const isOnline = !!usuariosOnline[item.perfil_empresa?.user_id];
    const isPinned = item.pinned;

    // Verifica o estado atual para o botão
    const isArchived =
      item.archived_for?.includes(userId) &&
      !item.desarquivar_for?.includes(userId);

    return (
      <Swipeable
        // DIREITA: SEMPRE EXCLUIR (Conforme você pediu)
        renderRightActions={() => (
          <TouchableOpacity
            style={{
              backgroundColor: "#ef4444",
              justifyContent: "center",
              alignItems: "center",
              width: 80,
              height: "90%",
              borderRadius: 12,
              marginTop: 5,
            }}
            onPress={() => excluirConversaBanco(item.conversation_id)}
          >
            <Ionicons name="trash" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
              Excluir
            </Text>
          </TouchableOpacity>
        )}
        // ESQUERDA: ARQUIVAR OU DESARQUIVAR
        renderLeftActions={() => (
          <TouchableOpacity
            style={{
              backgroundColor: isArchived ? "#3b82f6" : "#00ff9d", // Azul se for desarquivar
              justifyContent: "center",
              alignItems: "center",
              width: 80,
              height: "90%",
              borderRadius: 12,
              marginTop: 5,
            }}
            onPress={() =>
              isArchived
                ? desarquivarConversaBanco(item.conversation_id)
                : arquivarConversaBanco(item.conversation_id)
            }
          >
            <Ionicons
              name={isArchived ? "arrow-undo" : "archive"}
              size={24}
              color="#020617"
            />
            <Text
              style={{ color: "#020617", fontSize: 10, fontWeight: "bold" }}
            >
              {isArchived ? "Mover p/ Todos" : "Arquivar"}
            </Text>
          </TouchableOpacity>
        )}
        onSwipeableRightOpen={() => excluirConversaBanco(item.conversation_id)}
      >
        <TouchableOpacity
          style={[
            styles.chatCard,
            isPinned && {
              backgroundColor: "#1e293b",
              borderLeftWidth: 4,
              borderLeftColor: "#00ff9d",
            },
          ]}
          onPress={() => criarOuAbrirConversa(item)}
          onLongPress={() => fixarConversa(item.conversation_id)}
          delayLongPress={500}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  item.perfil_empresa?.foto_url ||
                  "https://via.placeholder.com/150",
              }}
              style={styles.avatar}
            />
            {isOnline && <View style={styles.onlineBadge} />}
          </View>
          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text style={styles.userName}>{item.perfil_empresa?.nome}</Text>
              {isPinned && <Ionicons name="pin" size={14} color="#00ff9d" />}
            </View>
            <Text style={styles.chatTime}>
              {format(new Date(item.created_at), "HH:mm", { locale: ptBR })}
            </Text>
            <View style={styles.msgRow}>
              {item.tipo === "imagem" ? (
                <Text style={styles.lastMsg}>
                  <Ionicons name="camera" size={14} /> Foto
                </Text>
              ) : item.tipo === "audio" ? (
                <Text style={styles.lastMsg}>
                  <Ionicons name="mic" size={14} color="#00ff9d" /> Áudio
                </Text>
              ) : (
                <Text numberOfLines={1} style={styles.lastMsg}>
                  {item.mensagem}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // Renderiza contatos na modal de nova conversa
  const renderContato = ({ item }) => (
    <TouchableOpacity
      style={styles.contatoCard}
      onPress={() => criarOuAbrirConversa(item)}
    >
      <Image source={{ uri: item.foto_url }} style={styles.avatarSmall} />
      <Text style={styles.contatoNome}>{item.nome}</Text>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BossTalk</Text>
          <TouchableOpacity onPress={() => setModalNovaConversa(true)}>
            <Ionicons name="chatbubble-ellipses" size={26} color="#00ff9d" />
          </TouchableOpacity>
        </View>
        {/* Filtros */}
        <View style={styles.filterBar}>
          {["Todos", "Não lidas", "Arquivadas"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterBtn,
                filtroAtivo === f && styles.filterBtnActive,
              ]}
              onPress={() => setFiltroAtivo(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filtroAtivo === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Lista de conversas */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#00ff9d"
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={conversasFiltradas}
            keyExtractor={(item) => item.conversation_id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 15 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhuma conversa.</Text>
            }
          />
        )}
        {/* Botão nova conversa */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalNovaConversa(true)}
        >
          <Ionicons name="add" size={30} color="#020617" />
        </TouchableOpacity>
        {/* Modal nova conversa */}
        <Modal visible={modalNovaConversa} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Parceria</Text>
              <TouchableOpacity onPress={() => setModalNovaConversa(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Buscar empresa..."
              placeholderTextColor="#64748b"
              style={styles.searchInput}
              value={buscaContato}
              onChangeText={setBuscaContato}
            />
            {loadingContato ? (
              <ActivityIndicator size="large" color="#00ff9d" />
            ) : (
              <FlatList
                data={contatos}
                keyExtractor={(item) => item.user_id}
                renderItem={renderContato}
              />
            )}
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  filterBar: { flexDirection: "row", paddingHorizontal: 15, marginBottom: 10 },
  filterBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#0f172a",
  },
  filterBtnActive: { backgroundColor: "#00ff9d" },
  filterText: { color: "#94a3b8", fontWeight: "600" },
  filterTextActive: { color: "#020617" },
  chatCard: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
  },
  avatarContainer: { position: "relative" },
  avatar: { width: 55, height: 55, borderRadius: 15 },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#00ff9d",
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  chatInfo: { flex: 1, marginLeft: 15, justifyContent: "center" },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  userName: { color: "#fff", fontSize: 16 },
  textBold: { fontWeight: "bold" },
  chatTime: { color: "#64748b", fontSize: 12 },
  msgRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMsg: { color: "#94a3b8", fontSize: 14, flex: 1 },
  unreadBadge: {
    backgroundColor: "#00ff9d",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: { color: "#020617", fontSize: 12, fontWeight: "bold" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00ff9d",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  modalContainer: { flex: 1, backgroundColor: "#020617", padding: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 20,
  },
  modalTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  searchInput: {
    backgroundColor: "#0f172a",
    color: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  contatoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    marginBottom: 10,
  },
  avatarSmall: { width: 40, height: 40, borderRadius: 10, marginRight: 15 },
  contatoNome: { color: "#fff", fontSize: 16 },
  emptyText: { color: "#64748b", textAlign: "center", marginTop: 50 },
});
