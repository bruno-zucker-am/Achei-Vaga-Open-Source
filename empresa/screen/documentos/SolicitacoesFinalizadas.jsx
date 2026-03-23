// Histórico de solicitações finalizadas — exibe documentos encerrados com data e status.
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { supabase } from "../../../lib/supabase";

export default function SolicitacoesFinalizadas() {
  const [finalizadas, setFinalizadas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFinalizadas();
  }, []);

  const fetchFinalizadas = async () => {
    console.log("DEBUG: Carregando histórico de finalizadas...");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("documentos_admissao")
        .select("id, nome_documento, status, criado_em")
        .eq("empresa_id", session.user.id)
        .in("status", ["finalizado", "encerrado"]);

      if (error) throw error;
      console.log("DEBUG: Finalizadas carregadas:", data?.length);
      setFinalizadas(data || []);
    } catch (e) {
      console.error("DEBUG Erro fetchFinalizadas:", e.message);
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View>
        <Text style={styles.docName}>{item.nome_documento}</Text>
        <Text style={styles.data}>Finalizado em: {new Date(item.criado_em).toLocaleDateString()}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.statusTxt}>{item.status.toUpperCase()}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {loading ? (
        <ActivityIndicator color="#39ff14" />
      ) : (
        <FlatList
          data={finalizadas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={{color: '#94a3b8', textAlign: 'center'}}>Histórico vazio.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  itemContainer: { backgroundColor: "#161b22", padding: 15, marginBottom: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: "#475569", flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docName: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  data: { color: "#64748b", fontSize: 11, marginTop: 4 },
  badge: { backgroundColor: "#1e293b", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  statusTxt: { color: "#94a3b8", fontSize: 10, fontWeight: "bold" }
});