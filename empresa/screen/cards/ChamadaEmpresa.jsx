// Botão de videochamada para entrevista da empresa — controla estados e atualiza status no banco ao iniciar a chamada.
import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, Animated, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useNavigation } from "@react-navigation/native";

export default function ChamadaEmpresa({ item, onUpdate }) {
  const [estadoBotao, setEstadoBotao] = useState("DESABILITADO");
  const [contagem, setContagem] = useState("");
  const animacaoPulso = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation();

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

  useEffect(() => {
    const verificarTempo = () => {
      if (item.status === "entrevistado") {
        setEstadoBotao("ENCERRADO");
        return;
      }

      try {
        const agora = new Date();
        const [hora, minuto] =
          item.horarios_entrevistas?.horarios[0].split(":");
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
      } catch {
        setEstadoBotao("DEFAULT");
      }
    };

    const timer = setInterval(verificarTempo, 1000);
    verificarTempo();
    return () => clearInterval(timer);
  }, [item]);

  // Atualiza status no Supabase e navega para VideoChamada
  const handleAcesso = async () => {
    if (estadoBotao !== "HABILITADO") return;

    try {
      await supabase
        .from("selecao_empresa")
        .update({ status: "entrevistado" })
        .eq("id", item.id);
      if (onUpdate) onUpdate(); // Atualiza lista na tela pai
      navigation.navigate("VideoChamada", { idVaga: item.id });
    } catch (err) {
      console.error(err);
      navigation.navigate("VideoChamada", { idVaga: item.id });
    }
  };

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
            <Text style={styles.txtHabilitado}>ENTRAR</Text>
          </TouchableOpacity>
        );
      case "ENCERRADO":
        return (
          <View style={[styles.btn, styles.btnEncerrado]}>
            <Ionicons name="checkmark-circle" size={20} color="#39FF14" />
          </View>
        );
      default:
        return (
          <View style={[styles.btn, styles.btnDesabilitado]}>
            <Ionicons name="videocam" size={18} color="#444" />
          </View>
        );
    }
  };

  return <View>{renderBotao()}</View>;
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
  },
  btnDesabilitado: { backgroundColor: "#121212", borderColor: "#222" },
  btnContagem: { backgroundColor: "#000", borderColor: "#FFD700" },
  txtContagem: { color: "#FFD700", fontWeight: "bold", fontSize: 10 },
  btnHabilitado: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  txtHabilitado: { color: "#000", fontWeight: "900", fontSize: 12 },
  btnEncerrado: { backgroundColor: "#000", borderColor: "#39FF14" },
});
