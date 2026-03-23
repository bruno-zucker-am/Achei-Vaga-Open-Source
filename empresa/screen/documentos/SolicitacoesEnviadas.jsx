// Solicitações enviadas — lista documentos pendentes ou recebidos com opção de encerrar a solicitação.
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../../../lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function SolicitacoesEnviadas() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carrega as solicitações ao montar o componente
  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const fetchSolicitacoes = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const { data, error } = await supabase
        .from("documentos_admissao")
        .select("id, nome_documento, status, candidato_id")
        .eq("empresa_id", session.user.id)
        .in("status", ["pendente", "recebido"]); // Filtra o que ainda não acabou

      if (error) throw error;
      setSolicitacoes(data || []);
    } catch (e) {
      Alert.alert("Erro ao buscar", e.message);
    } finally {
      setLoading(false);
    }
  };

  const encerrarSolicitacao = async (id) => {
  try {
    // Ação no banco
    const { error } = await supabase
      .from("documentos_admissao")
      .update({ 
        encerrar: true, 
        status: "encerrado" 
      })
      .eq("id", id);

    if (error) throw error;

    // Remove da lista na tela imediatamente para o usuário ver que funcionou
    setSolicitacoes((prev) => prev.filter((item) => item.id !== id));
    
    Alert.alert("Sucesso", "Solicitação encerrada.");
  } catch (e) {
    Alert.alert("Erro", "Falha ao encerrar: " + e.message);
  }
};

  if (loading && solicitacoes.length === 0) {
    return <ActivityIndicator size="large" color="#39ff14" style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.tituloAba}>Solicitações em Aberto</Text>
      
      {solicitacoes.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="file-search-outline" size={48} color="#475569" />
          <Text style={styles.emptyText}>Nenhuma solicitação ativa encontrada.</Text>
        </View>
      ) : (
        solicitacoes.map((item) => (
          <View key={item.id} style={styles.itemContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{item.nome_documento}</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.dot, { backgroundColor: item.status === 'recebido' ? '#00f2ff' : '#39ff14' }]} />
                <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btnEncerrar}
              onPress={() => encerrarSolicitacao(item.id)}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color="#FFF" />
              <Text style={styles.btnText}>Encerrar</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tituloAba: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  itemContainer: {
    backgroundColor: "#161b22",
    padding: 16,
    marginBottom: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  docName: { color: "#FFF", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  statusBadge: { flexDirection: "row", alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { color: "#64748b", fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },
  btnEncerrar: {
    flexDirection: "row",
    backgroundColor: "#ef444422",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ef444444",
    alignItems: "center",
  },
  btnText: { color: "#ef4444", fontWeight: "bold", fontSize: 12, marginLeft: 4 },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#475569", marginTop: 10, fontSize: 14 },
});