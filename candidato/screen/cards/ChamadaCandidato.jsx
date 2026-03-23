// Botão de videochamada para entrevista do candidato — controla estados: aguardando, contagem regressiva, habilitado e encerrado.
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useNavigation } from "@react-navigation/native";

export default function ChamadaCandidato({ item }) {
  const [status, setStatus] = useState(item.status); // Status da entrevista (ex: 'entrevistado')
  const [linkDb, setLinkDb] = useState(item.link_entrevista); // Link da entrevista salvo no banco
  const [estadoBotao, setEstadoBotao] = useState("DESABILITADO");
  const [contagem, setContagem] = useState("");
  const animacaoPulso = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation();

  // Animação de pulso para estado CONTAGEM
  useEffect(() => {
    if (estadoBotao === "CONTAGEM") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animacaoPulso, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(animacaoPulso, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [estadoBotao]);

  // Listener realtime para atualizar status e link no estado
  useEffect(() => {
    const canal = supabase
      .channel(`vaga_${item.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "selecao_empresa",
          filter: `id=eq.${item.id}`,
        },
        (payload) => {
          setStatus(payload.new.status);
          setLinkDb(payload.new.link_entrevista);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [item.id]);

  // Lógica de estados com base no horário da entrevista
  useEffect(() => {
    const verificarTempo = () => {
      if (status === "entrevistado") {
        setEstadoBotao("ENCERRADO");
        return;
      }

      const agora = new Date();
      const [hora, minuto] = item.horarios_entrevistas?.horarios[0].split(":");
      const dataEntrevista = new Date();
      dataEntrevista.setHours(parseInt(hora), parseInt(minuto), 0, 0);

      const diff = dataEntrevista - agora;
      const minutosRestantes = diff / 1000 / 60;

      if (minutosRestantes > 0 && minutosRestantes <= 5) {
        setEstadoBotao("CONTAGEM");
        const min = Math.floor(diff / 1000 / 60);
        const seg = Math.floor((diff / 1000) % 60);
        setContagem(`${min}:${seg < 10 ? "0" : ""}${seg}`);
      } else if (minutosRestantes <= 0 && minutosRestantes > -60) {
        setEstadoBotao("HABILITADO");
      } else if (minutosRestantes <= -60) {
        setEstadoBotao("ENCERRADO");
      } else {
        setEstadoBotao("DEFAULT");
      }
    };

    const timer = setInterval(verificarTempo, 1000);
    verificarTempo();
    return () => clearInterval(timer);
  }, [status, item]);

  // Ação para navegar para a tela de video chamada
  const handleAcesso = () => {
    if (estadoBotao !== "HABILITADO") return;
    navigation.navigate("VideoChamada", {
      idVaga: item.id,
      nomeUsuario: item.nome_candidato,
    });
  };

  // Renderiza botão com base no estado
  const renderBotao = () => {
    switch (estadoBotao) {
      case "CONTAGEM":
        return (
          <Animated.View
            style={[
              styles.btn,
              styles.btnContagem,
              { transform: [{ scale: animacaoPulso }] },
            ]}
          >
            <Ionicons name="videocam" size={20} color="#FFD700" />
            <Text style={styles.txtContagem}>LIBERA EM {contagem}</Text>
          </Animated.View>
        );
      case "HABILITADO":
        return (
          <TouchableOpacity
            style={[styles.btn, styles.btnHabilitado]}
            onPress={handleAcesso}
          >
            <Ionicons name="videocam" size={22} color="#000" />
            <Text style={styles.txtHabilitado}>ENTRAR NA ENTREVISTA</Text>
          </TouchableOpacity>
        );
      case "ENCERRADO":
        return (
          <View style={[styles.btn, styles.btnEncerrado]}>
            <Ionicons name="videocam-off" size={20} color="#FF4444" />
            <Text style={styles.txtEncerrado}>CONCLUÍDA</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.btn, styles.btnDesabilitado]}>
            <Ionicons name="videocam" size={18} color="#444" />
            <Text style={styles.txtDesabilitado}>AGUARDANDO HORÁRIO...</Text>
          </View>
        );
    }
  };

  return <View style={styles.container}>{renderBotao()}</View>;
}

const styles = StyleSheet.create({
  container: { marginVertical: 10, width: "100%", alignItems: "center" },
  btn: {
    width: "90%",
    height: 55,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1.5,
  },
  btnDesabilitado: { backgroundColor: "#121212", borderColor: "#222" },
  txtDesabilitado: { color: "#444", fontWeight: "600" },
  btnContagem: { backgroundColor: "#000", borderColor: "#FFD700" },
  txtContagem: { color: "#FFD700", fontWeight: "bold" },
  btnHabilitado: {
    backgroundColor: "#39FF14",
    borderColor: "#39FF14",
    shadowColor: "#39FF14",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  txtHabilitado: { color: "#000", fontWeight: "900", fontSize: 15 },
  btnEncerrado: { backgroundColor: "#000", borderColor: "#FF4444" },
  txtEncerrado: { color: "#FF4444", fontWeight: "bold" },
});
