// Ranking global de empresas — exibe classificação por pontos acumulados via interações no feed.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

export default function RankingEmpresas() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // 👉 ID da empresa logada (ajuste se você já tiver contexto auth)
  const empresaLogadaId = null;

  useEffect(() => {
    fetchRanking();
  }, []);

  async function fetchRanking() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("ranking_empresas")
        .select(`
          empresa_id,
          pontos,
          empresa:cadastro_empresa!ranking_empresas_empresa_id_fkey(
            nome
          )
        `)
        .order("pontos", { ascending: false });

      if (error) throw error;

      setRanking(data || []);
    } catch (error) {
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  }

  function getMedalColor(index) {
    if (index === 0) return "#FFD700";
    if (index === 1) return "#C0C0C0";
    if (index === 2) return "#CD7F32";
    return "#64748b";
  }

  const rankingFiltrado = ranking.filter((item) =>
    item.empresa?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#39ff14" />;
  }

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="trophy" size={60} color="#FFD700" />

        <Text style={styles.title}>Global Business Ranking</Text>

        {empresaLogadaId && (
          <Text style={styles.subtitle}>
            Sua empresa está com X pontos!
          </Text>
        )}
      </View>

      {/* BUSCA */}
      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
        <TextInput
          placeholder="Buscar empresa ou ID..."
          placeholderTextColor="#64748b"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* HEADER TABELA */}
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderText}>POSIÇÃO</Text>
        <Text style={styles.tableHeaderText}>EMPRESA</Text>
        <Text style={styles.tableHeaderText}>PONTOS</Text>
      </View>

      <ScrollView>
        {rankingFiltrado.map((item, index) => {
          const isMinhaEmpresa = item.empresa_id === empresaLogadaId;

          return (
            <View
              key={item.empresa_id}
              style={[
                styles.row,
                isMinhaEmpresa && styles.rowHighlight,
              ]}
            >
              {/* POSIÇÃO */}
              <View style={styles.posicaoContainer}>
                <Text
                  style={[
                    styles.posicaoText,
                    { color: getMedalColor(index) },
                  ]}
                >
                  {index + 1}°
                </Text>
              </View>

              {/* EMPRESA */}
              <Text style={styles.nomeEmpresa}>
                {item.empresa?.nome}
              </Text>

              {/* PONTOS */}
              <Text style={styles.pontosText}>
                {item.pontos}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 15,
  },

  header: {
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
  },

  subtitle: {
    color: "#39ff14",
    marginTop: 6,
  },

  searchBox: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  searchInput: {
    flex: 1,
    color: "#FFF",
    marginLeft: 10,
  },

  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 5,
  },

  tableHeaderText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  rowHighlight: {
    borderColor: "#39ff14",
    shadowColor: "#39ff14",
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },

  posicaoContainer: {
    width: 60,
  },

  posicaoText: {
    fontSize: 16,
    fontWeight: "bold",
  },

  nomeEmpresa: {
    flex: 1,
    color: "#FFF",
    fontWeight: "bold",
  },

  pontosText: {
    color: "#39ff14",
    fontWeight: "bold",
  },
});
