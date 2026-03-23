// Chamadas recebidas — lista chamadas entrantes em tempo real com botão de atender.
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from "react-native";
import { supabase } from "../../lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AudioVideo from "./AudioVideo"; // Import para abrir a tela de chamada

export default function Recebidas() {
  const [lista, setLista] = useState([]);
  const [chamadaAtendida, setChamadaAtendida] = useState(null);

  useEffect(() => {
    carregarRecebidas();
    
    // Realtime para a chamada aparecer na hora sem dar refresh
    const channel = supabase
      .channel('chamadas_reais')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chamadas_empresa' }, 
        () => carregarRecebidas()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function carregarRecebidas() {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("chamadas_empresa")
      .select(`
        *,
        cadastro_empresa!chamadas_empresa_empresa_origem_fkey ( nome, foto_url )
      `)
      .eq("empresa_destino", user.id)
      .eq("status", "chamando") 
      .order("data_criacao", { ascending: false });

    if (!error) setLista(data || []);
  }

  /* ============================
      Lógica de Atender
  ============================ */
  async function atender(chamada) {
    // 1. Atualiza o status no banco para 'conectada'
    const { error } = await supabase
      .from("chamadas_empresa")
      .update({ status: "conectada" })
      .eq("id", chamada.id);

    if (error) {
      console.log("Erro ao atender:", error.message);
      return;
    }

    // 2. Define a chamada atual para abrir o componente AudioVideo
    setChamadaAtendida(chamada);
  }

  // Se atendeu, mostra a tela de Áudio/Vídeo
  if (chamadaAtendida) {
    return (
      <AudioVideo 
        chamada={chamadaAtendida} 
        encerrar={() => {
          setChamadaAtendida(null);
          carregarRecebidas();
        }} 
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lista}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhuma chamada no momento.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.cadastro_empresa?.foto_url }} style={styles.foto} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{item.cadastro_empresa?.nome}</Text>
              <Text style={styles.tipo}>Chamada de {item.tipo?.toUpperCase()}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.botaoAtender} 
              onPress={() => atender(item)}
            >
              <MaterialCommunityIcons name="phone" size={28} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0F14", padding: 15 },
  vazio: { color: "#888", textAlign: 'center', marginTop: 20 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: "#161A20", 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF88'
  },
  foto: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  nome: { color: "#fff", fontWeight: 'bold', fontSize: 16 },
  tipo: { color: "#00FF88", fontSize: 12 },
  botaoAtender: { backgroundColor: "#00FF88", padding: 12, borderRadius: 50 }
});