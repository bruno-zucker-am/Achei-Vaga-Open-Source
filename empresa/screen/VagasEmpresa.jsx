// Candidatos disponíveis — exibe um candidato por vez com compatibilidade e gestos de swipe para selecionar ou recusar.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Animated,
  PanResponder,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { calculos } from "../../components/calculos";
import { estilos } from "../../components/estilos";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function VagasEmpresa({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [perfilEmpresa, setPerfilEmpresa] = useState(null);
  const [candidato, setCandidato] = useState(null);

  const nivel = useMemo(() => {
    if (!candidato || !perfilEmpresa) return 0;
    return calculos(candidato, perfilEmpresa);
  }, [candidato, perfilEmpresa]);

  const cor = useMemo(() => estilos(nivel), [nivel]);

  const buscarProximoCandidato = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vagas } = await supabase
        .from("vagas_empregos")
        .select("*")
        .eq("empresa_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (vagas?.length > 0) setPerfilEmpresa(vagas[0]);
      else return setLoading(false);

      const { data: recusas } = await supabase
        .from("recusas_empresa")
        .select("candidato_id")
        .eq("empresa_id", user.id);

      const { data: selecoes } = await supabase
        .from("selecao_empresa")
        .select("candidato_id")
        .eq("empresa_id", user.id);

      const idsOcultar = [
        ...(recusas?.map((r) => r.candidato_id) || []),
        ...(selecoes?.map((s) => s.candidato_id) || []),
      ];

      let query = supabase.from("cadastro_candidato").select("*");

      if (idsOcultar.length > 0)
        query = query.not("user_id", "in", `(${idsOcultar.join(",")})`);

      const { data: proxCand, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      setCandidato(proxCand);
    } catch (e) {
      console.error("Erro ao buscar próximo:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscarProximoCandidato();
  }, [buscarProximoCandidato]);

  const handleRecusar = async () => {
    if (!candidato || !perfilEmpresa) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("recusas_empresa").insert({
        empresa_id: user.id,
        candidato_id: candidato.user_id,
        vaga_id: perfilEmpresa.id,
      });

      if (error) throw error;
      await buscarProximoCandidato();
    } catch (error) {
      console.error("Erro ao recusar:", error);
    }
  };

  const handleSelecionar = async () => {
    if (!candidato || !perfilEmpresa) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("selecao_empresa").insert({
        empresa_id: user.id,
        candidato_id: candidato.user_id,
        vaga_id: perfilEmpresa.id,
        status: "selecionado",
      });

      if (error) throw error;

      Alert.alert("Sucesso", "Candidato enviado para sua lista de seleção! 🚀");
      await buscarProximoCandidato();
      navigation.navigate("ProcessoSeletivo");
    } catch (error) {
      console.error("Erro ao selecionar:", error);
    }
  };

  // ANIMAÇÃO SWIPE
  const pan = useMemo(() => new Animated.ValueXY(), []);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 20,
        onPanResponderMove: Animated.event([null, { dx: pan.x }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 120) {
            Animated.timing(pan, {
              toValue: { x: width + 100, y: 0 },
              duration: 200,
              useNativeDriver: false,
            }).start(() => {
              pan.setValue({ x: 0, y: 0 });
              handleSelecionar();
            });
          } else if (gesture.dx < -120) {
            Animated.timing(pan, {
              toValue: { x: -width - 100, y: 0 },
              duration: 200,
              useNativeDriver: false,
            }).start(() => {
              pan.setValue({ x: 0, y: 0 });
              handleRecusar();
            });
          } else {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [pan, handleRecusar, handleSelecionar],
  );

  if (loading)
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#39ff14" />
      </View>
    );

  if (!candidato)
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Nenhum candidato novo disponível no momento.
        </Text>
        <TouchableOpacity
          onPress={buscarProximoCandidato}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: "#4ade80", fontWeight: "bold" }}>
            🔄 ATUALIZAR LISTA
          </Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.card, { transform: [{ translateX: pan.x }] }]}
      >
        <Text style={styles.statusTitle}>CANDIDATO DISPONÍVEL 🔥</Text>
        <View style={styles.divider} />

        <Image
          source={{
            uri: candidato.foto_url || "https://via.placeholder.com/170",
          }}
          style={styles.foto}
        />

        <Text style={styles.nome}>{candidato.nome}</Text>

        <Text style={styles.cargoInfo}>
          {candidato.cargo} • {candidato.idade} anos
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#00f2ff" />

          <Text style={styles.localizacao}>
            {candidato.endereco?.cidade || candidato.cidade},{" "}
            {candidato.endereco?.estado || candidato.estado}
          </Text>
        </View>

        <View style={styles.matchContainer}>
          <View style={styles.matchTextRow}>
            <Text style={styles.matchLabel}>Nível de compatibilidade</Text>

            {/* Aqui o 'color' funciona porque é TEXTO */}

            <Text style={[styles.matchValue, { color: cor }]}>{nivel}%</Text>
          </View>

          <View style={styles.barraFundo}>
            {/* AQUI ESTAVA O ERRO: Troque 'color' por 'backgroundColor' */}

            <View
              style={[
                styles.barraProgresso,

                { backgroundColor: cor }, // View usa backgroundColor

                { width: `${nivel}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btnAction, styles.btnRecusar]}
            onPress={handleRecusar}
          >
            <Ionicons name="close" size={28} color="#ff4d4d" />
            <Text style={[styles.btnText, { color: "#ff4d4d" }]}>Recusar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, styles.btnPerfil]}
            onPress={() =>
              navigation.navigate("DetalhesVagaCandidato", {
                candidatoId: candidato.user_id, // ID do cara de SP
                vagaId: perfilEmpresa.id, // ID da vaga da empresa
              })
            }
          >
            <Ionicons name="person-outline" size={26} color="#FFF" />
            <Text style={styles.btnText}>Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, styles.btnSelecionar]}
            onPress={handleSelecionar}
          >
            <MaterialCommunityIcons name="target" size={28} color="#000" />
            <Text style={[styles.btnText, { color: "#000" }]}>Selecionar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0b11",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#11141b",
    borderRadius: 30,
    padding: 24,
    width: width * 0.9,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1c1f26",
  },
  statusTitle: {
    color: "#4ade80",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#1c1f26",
    marginBottom: 20,
  },
  foto: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#252932",
  },
  nome: { fontSize: 24, fontWeight: "900", color: "#FFF", textAlign: "center" },
  cargoInfo: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  localizacao: { color: "#00f2ff", fontSize: 13, fontWeight: "600" },
  matchContainer: { width: "100%", marginTop: 25, marginBottom: 20 },
  matchTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  matchLabel: { color: "#9ca3af", fontSize: 13, fontWeight: "500" },
  matchValue: { color: "#4ade80", fontWeight: "900", fontSize: 16 },
  barraFundo: { height: 10, backgroundColor: "#000", borderRadius: 10 },
  barraProgresso: {
    height: "100%",
    backgroundColor: "#4ade80",
    borderRadius: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 15,
  },
  btnAction: {
    width: "30%",
    height: 80,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  btnRecusar: { backgroundColor: "#2d161a" },
  btnPerfil: { backgroundColor: "#1c1f26" },
  btnSelecionar: { backgroundColor: "#a3ff4d" },
  btnText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 6,
  },
});
