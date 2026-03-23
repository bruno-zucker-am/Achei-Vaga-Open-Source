// Histórico de chamadas efetuadas — lista chamadas realizadas pela empresa com tipo, duração e status.
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabase";

export default function Efetuadas() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setCarregando(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log("Usuário não autenticado");
        return;
      }

      // 1. Buscamos as chamadas e trazemos o NOME da empresa destino (Inner Join)
      const { data, error } = await supabase
        .from("chamadas_empresa")
        .select(`
          *,
          cadastro_empresa!chamadas_empresa_empresa_destino_fkey ( nome )
        `)
        .eq("empresa_origem", user.id)
        .neq("status", "contato")
        .order("data_criacao", { ascending: false });

      if (error) throw error;

      setLista(data || []);
    } catch (error) {
      console.log("Erro ao carregar histórico:", error.message);
    } finally {
      setCarregando(false);
    }
  }

  if (carregando) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#00FF88" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {lista.length === 0 ? (
        <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>
          Nenhuma chamada efetuada.
        </Text>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.empresa}>
                Para: {item.cadastro_empresa?.nome || "Empresa desconhecida"}
              </Text>
              <Text style={styles.texto}>
                {item.tipo?.toUpperCase()} • {item.duracao}s • {item.dia_semana}
              </Text>
              <Text style={[
                styles.status, 
                { color: item.status === 'chamando' ? '#FFBB00' : '#00FF88' }
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0F14", padding: 15 },
  item: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: "#1A1D24",
    backgroundColor: '#161A20',
    borderRadius: 10,
    marginBottom: 8
  },
  empresa: { color: "#fff", fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  texto: { color: "#ccc", fontSize: 13 },
  status: { fontSize: 10, marginTop: 6, fontWeight: 'bold' }
});