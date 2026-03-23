// Empresas que o candidato segue — lista empresas seguidas a partir das interações no feed.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function CandidatoSegue() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null); // 1. Criar o estado

  useEffect(() => {
    // 2. Criar uma função para inicializar tudo na ordem certa
    const inicializar = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchEmpresasRecomendadas(user.id); // Passa o ID direto aqui para não esperar o estado
      }
    };
    inicializar();
  }, []);

  async function fetchEmpresasRecomendadas(uid) {
    // 3. Recebe o uid como parâmetro
    try {
      setLoading(true);
      const currentUserId = uid || userId;

      if (!currentUserId) return;

      const { data: posts } = await supabase
        .from("posts_empresas")
        .select("empresa_id, interacoes_usuarios");

      // O filtro agora usando o ID correto
      const IDsSeguidos =
        posts
          ?.filter((p) => {
            const interacoes =
              typeof p.interacoes_usuarios === "string"
                ? JSON.parse(p.interacoes_usuarios)
                : p.interacoes_usuarios;
            return interacoes?.seguiram?.includes(currentUserId);
          })
          .map((p) => p.empresa_id) || [];

      // Remove duplicatas de IDs (caso a empresa tenha mais de um post)
      const idsUnicos = [...new Set(IDsSeguidos)];

      const { data, error } = await supabase
        .from("cadastro_empresa")
        .select(`user_id, nome, foto_url, vagas_empregos (id)`)
        .in("user_id", idsUnicos);

      if (error) throw error;

      const formatadas = data.map((emp) => ({
        id: emp.user_id,
        nome: emp.nome,
        vagas: emp.vagas_empregos?.length || 0,
        foto: emp.foto_url,
        jaSigo: true,
      }));

      setEmpresas(formatadas);
    } catch (error) {
      console.error("Erro ao carregar seguidos:", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeguir(empresaId) {
    // Aqui você pode disparar a lógica de seguir global se tiver uma tabela de seguidores separada
    // Por enquanto, vamos apenas dar um feedback visual ou navegar
    alert(
      "Você agora está seguindo " +
        empresas.find((e) => e.id === empresaId).nome,
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EMPRESAS RECOMENDADAS</Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#39ff14"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={empresas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.infoEmpresa}>
                <Image
                  source={{
                    uri: item.foto || "https://via.placeholder.com/100",
                  }}
                  style={styles.avatarMini}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.nomeEmpresa}>{item.nome}</Text>
                  <Text style={styles.vagas}>{item.vagas} vagas abertas</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.btnSeguir,
                  item.jaSigo && { backgroundColor: "#39ff14" },
                ]}
                onPress={() => !item.jaSigo && handleSeguir(item.id)}
              >
                <Text
                  style={[styles.btnText, item.jaSigo && { color: "#000" }]}
                >
                  {item.jaSigo ? "SEGUINDO" : "SEGUIR"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: "#64748b", textAlign: "center" }}>
              Nenhuma empresa encontrada.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0b10",
    padding: 20,
    paddingTop: 60,
  },
  header: { marginBottom: 20 },
  btnVoltar: { flexDirection: "row", alignItems: "center" },
  txtVoltar: {
    color: "#39ff14",
    marginLeft: 5,
    fontWeight: "bold",
    fontSize: 12,
  },
  title: {
    color: "#39ff14",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 20,
    textTransform: "uppercase",
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#161b22",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 10,
  },
  infoEmpresa: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#0a0b10",
  },
  nomeEmpresa: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  vagas: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  btnSeguir: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#39ff14",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
  },
  btnText: { color: "#39ff14", fontSize: 10, fontWeight: "bold" },
});
