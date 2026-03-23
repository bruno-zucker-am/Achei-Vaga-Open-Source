import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

export default function NotificacoesGlobal({ navigation }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Inicializa buscando notificações e ativando o canal em tempo real
  useEffect(() => {
    let canal;

    async function inicializar() {
      setCarregando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca histórico de notificações do usuário
      await buscarNotificacoes(user.id);

      // Escuta novas notificações em tempo real (INSERT na tabela)
      canal = supabase
        .channel(`notificacoes-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notificacoes_push", filter: `user_id=eq.${user.id}` },
          (payload) => {
            setNotificacoes((anterior) => [payload.new, ...anterior]);
          }
        )
        .subscribe();

      // Marca todas as notificações como lidas após exibir
      await marcarComoLidas(user.id);
      setCarregando(false);
    }

    inicializar();

    return () => {
      if (canal) supabase.removeChannel(canal);
    };
  }, []);

  // Busca todas as notificações do usuário ordenadas por data
  async function buscarNotificacoes(idUsuario) {
    const { data, error } = await supabase
      .from("notificacoes_push")
      .select("*")
      .eq("user_id", idUsuario)
      .order("criado_em", { ascending: false });

    if (!error) setNotificacoes(data || []);
  }

  // Marca todas as notificações não lidas como lidas
  async function marcarComoLidas(idUsuario) {
    await supabase
      .from("notificacoes_push")
      .update({ lido: true })
      .eq("user_id", idUsuario)
      .eq("lido", false);
  }

  // Renderiza cada item da lista com ícone e estilo conforme status de leitura
  const renderItem = ({ item }) => (
    <View style={[estilos.card, item.lido ? estilos.cardLido : estilos.cardNovo]}>
      <View style={estilos.containerIcone}>
        <MaterialCommunityIcons
          name={item.lido ? "bell-outline" : "bell-badge"}
          size={24}
          color={item.lido ? "#64748b" : "#00f2ff"}
        />
      </View>
      <View style={estilos.conteudo}>
        <Text style={estilos.titulo}>{item.titulo}</Text>
        <Text style={estilos.mensagem}>{item.mensagem}</Text>
        <Text style={estilos.data}>
          {new Date(item.criado_em).toLocaleDateString('pt-BR')} às{' '}
          {new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar barStyle="light-content" />

      <View style={estilos.cabecalho}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botaoVoltar}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#00f2ff" />
        </TouchableOpacity>
        <Text style={estilos.tituloCabecalho}>Notificações</Text>
        <View style={{ width: 32 }} />
      </View>

      {carregando ? (
        <View style={estilos.loading}>
          <ActivityIndicator size="large" color="#00f2ff" />
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <View style={estilos.vazio}>
              <MaterialCommunityIcons name="bell-off-outline" size={60} color="#1e2d4b" />
              <Text style={estilos.textoVazio}>Nenhuma notificação por aqui.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0b10" },
  cabecalho: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 15, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(62, 198, 255, 0.1)",
  },
  tituloCabecalho: { color: "#00f2ff", fontSize: 18, fontWeight: "bold", textTransform: "uppercase" },
  botaoVoltar: {},
  lista: { padding: 15 },
  card: {
    flexDirection: "row", padding: 16, marginBottom: 12,
    borderRadius: 16, borderWidth: 1,
  },
  cardNovo: { backgroundColor: "rgba(30, 45, 75, 0.6)", borderColor: "rgba(0, 242, 255, 0.3)" },
  cardLido: { backgroundColor: "rgba(20, 20, 25, 0.4)", borderColor: "rgba(100, 116, 139, 0.1)" },
  containerIcone: { marginRight: 15, justifyContent: "center" },
  conteudo: { flex: 1 },
  titulo: { color: "#FFF", fontWeight: "bold", fontSize: 16, marginBottom: 4 },
  mensagem: { color: "#94a3b8", fontSize: 14, lineHeight: 20 },
  data: { color: "#475569", fontSize: 11, marginTop: 8 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  vazio: { flex: 1, alignItems: "center", marginTop: 100 },
  textoVazio: { color: "#475569", marginTop: 10, fontSize: 16 }
});
