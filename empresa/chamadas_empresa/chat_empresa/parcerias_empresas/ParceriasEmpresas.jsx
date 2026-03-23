// Ecossistema de parcerias — permite descobrir outras empresas e firmar parcerias com um clique.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function ParceriasEmpresas() {
  // --- ESTADOS DO ALGORITMO ---
  const navigation = useNavigation();
  const [empresas, setEmpresas] = useState([]);
  const [parcerias, setParcerias] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState("descobrir"); // 'descobrir' ou 'parceiros'
  // --- 1. CARREGAR TELA (PASSO 1 DO ALGORITMO) ---
  useEffect(() => {
    fetchDadosIniciais();
  }, []);

  async function fetchDadosIniciais() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Busca empresas e conexões simultaneamente para performance
      // CORREÇÃO: Usando 'user_id' no .neq() para não dar erro de coluna inexistente
      const [resEmpresas, resParcerias] = await Promise.all([
        supabase.from("cadastro_empresa").select("*").neq("user_id", user?.id),
        supabase
          .from("parcerias_empresas")
          .select("parceiro_id")
          .eq("empresa_id", user?.id),
      ]);

      if (resEmpresas.error) throw resEmpresas.error;

      setEmpresas(resEmpresas.data || []);
      setParcerias(resParcerias.data?.map((p) => p.parceiro_id) || []);
    } catch (error) {
      console.error("Erro ao carregar ecossistema:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 2. LÓGICA DE FILTRAGEM (PASSO 2 DO ALGORITMO) ---
  const filtrarEmpresas = () => {
    let lista = empresas;

    // Filtro por Tab (Descobrir vs Meus Parceiros)
    // CORREÇÃO: Usando 'user_id' para validar a parceria
    if (tabAtiva === "parceiros") {
      lista = lista.filter((emp) => parcerias.includes(emp.user_id));
    }

    // Filtro por Barra de Busca (Nome ou ID)
    if (busca.trim() !== "") {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (emp) =>
          emp.nome?.toLowerCase().includes(termo) ||
          emp.user_id?.toString().includes(termo),
      );
    }

    return lista;
  };

  // --- 6. AÇÃO BOTÃO PARCERIA (PASSO 6 DO ALGORITMO) ---
  async function realizarParceria(parceiroId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("parcerias_empresas").insert({
        empresa_id: user.id,
        parceiro_id: parceiroId,
      });

      if (error) {
        if (error.code === "23505") {
          Alert.alert("Aviso", "Esta parceria já está ativa.");
          return;
        }
        throw error;
      }

      // Atualiza estado local para o botão mudar para "Parceiro" instantaneamente
      setParcerias((prev) => [...prev, parceiroId]);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível firmar a parceria no momento.");
    }
  }

  // --- RENDERIZAÇÃO DE COMPONENTES ---

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#39ff14" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER (CONFORME MOCKUP) */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="handshake" size={45} color="#39ff14" />
        <Text style={styles.title}>Ecossistema de Parcerias</Text>
        <Text style={styles.subtitle}>
          Conecte-se com outras empresas e gere novos negócios.
        </Text>
      </View>

      {/* TABS DE NAVEGAÇÃO INTERNA */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setTabAtiva("descobrir")}
          style={[
            styles.tabButton,
            tabAtiva === "descobrir" && styles.tabActive,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              tabAtiva === "descobrir" && styles.tabTextActive,
            ]}
          >
            Descobrir Empresas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTabAtiva("parceiros")}
          style={[
            styles.tabButton,
            tabAtiva === "parceiros" && styles.tabActive,
          ]}
        >
          <Ionicons
            name="people"
            size={16}
            color={tabAtiva === "parceiros" ? "#39ff14" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              tabAtiva === "parceiros" && styles.tabTextActive,
            ]}
          >
            {" "}
            Meus Parceiros
          </Text>
        </TouchableOpacity>
      </View>

      {/* BARRA DE BUSCA (PASSO 2) */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#64748b"
          style={{ marginRight: 10 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar empresa por nome ou ID"
          placeholderTextColor="#64748b"
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      {/* LISTA DE EMPRESAS (PASSO 3) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {filtrarEmpresas().map((item) => {
          // CORREÇÃO: Usando 'user_id' para checar o status do botão
          const jaEParceiro = parcerias.includes(item.user_id);

          return (
            // CORREÇÃO: Removido o 'key=' duplicado que causava erro de sintaxe
            <View key={item.user_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Image
                  source={{
                    uri: item.foto_url || "https://via.placeholder.com/60",
                  }}
                  style={styles.logo}
                />
                <View style={styles.empData}>
                  <Text style={styles.empNome}>{item.nome?.toUpperCase()}</Text>
                  <Text style={styles.empSegmento}>
                    {item.segmento || "Parceiro do App"}
                  </Text>
                  <View style={styles.locRow}>
                    <Ionicons name="location-sharp" size={12} color="#475569" />
                    <Text style={styles.locText}>
                      {item.cidade || "Brasil"}, {item.uf || "Global"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* BOTÕES DE AÇÃO (PASSO 4, 5 e 6) */}
              <View style={styles.actionRow}>
                {/* 4. AÇÃO BOTÃO PERFIL */}
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() =>
                    navigation.navigate("InformacoesEmpresa", {
                      empresaId: item.user_id,
                    })
                  }
                >
                  <Ionicons name="person" size={14} color="#94a3b8" />
                  <Text style={styles.btnSecondaryText}> Perfil</Text>
                </TouchableOpacity>

                {/* 5. AÇÃO BOTÃO MENSAGEM (ROTA GENÉRICA) */}
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() =>
                    navigation.navigate("BossTalk", { empresaId: item.user_id })
                  }
                >
                  <MaterialCommunityIcons
                    name="message-text"
                    size={14}
                    color="#94a3b8"
                  />
                  <Text style={styles.btnSecondaryText}> Mensagem</Text>
                  <Ionicons
                    name="chevron-down"
                    size={12}
                    color="#94a3b8"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>

                {/* 6. AÇÃO BOTÃO PARCERIA */}
                <TouchableOpacity
                  style={[styles.btnPrimary, jaEParceiro && styles.btnActive]}
                  onPress={() => !jaEParceiro && realizarParceria(item.user_id)}
                >
                  <MaterialCommunityIcons
                    name={jaEParceiro ? "check-decagram" : "handshake"}
                    size={18}
                    color={jaEParceiro ? "#FFF" : "#000"}
                  />
                  <Text
                    style={[
                      styles.btnPrimaryText,
                      jaEParceiro && { color: "#FFF" },
                    ]}
                  >
                    {jaEParceiro ? " Parceiro" : " Parceria"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filtrarEmpresas().length === 0 && (
          <Text style={styles.emptyText}>Nenhuma empresa encontrada.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0b10",
    paddingHorizontal: 15,
  },
  header: {
    alignItems: "center",
    marginTop: 50,
    marginBottom: 20,
  },
  title: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 10,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 5,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#161b22",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.2)",
  },
  tabText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "bold",
  },
  tabTextActive: {
    color: "#39ff14",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  searchInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#161b22",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  empData: {
    marginLeft: 15,
    flex: 1,
  },
  empNome: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  empSegmento: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 2,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  locText: {
    color: "#475569",
    fontSize: 11,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnSecondaryText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#39ff14",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimaryText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
  },
  btnActive: {
    backgroundColor: "#059669",
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 20,
  },
});
