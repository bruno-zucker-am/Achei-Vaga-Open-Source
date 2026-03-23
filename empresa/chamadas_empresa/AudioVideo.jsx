// Tela de chamada de áudio/vídeo (BossCall) — gerencia permissões, motor Agora e controles de câmera/microfone.
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  createAgoraRtcEngine,
  RtcSurfaceView,
  ChannelProfileType,
  ClientRoleType,
} from "react-native-agora";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID;

export default function AudioVideo({ chamada, encerrar }) {
  // O nome da sala agora é único para BossCall para evitar conflito com entrevistas
  const salaNome = `bosscall-${chamada.id}`;

  const [permissoesConcedidas, setPermissoesConcedidas] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);
  const [videoLigado, setVideoLigado] = useState(chamada.tipo === "video");
  const [microfoneLigado, setMicrofoneLigado] = useState(true);

  // Cronômetro Real (Só conta quando houver conexão)
  const [tempoMostrado, setTempoMostrado] = useState(0);
  const tempoRef = useRef(0);
  const engine = useRef(null);

  // 1. Permissões (Crítico para o Motorola G41 não travar no login)
  useEffect(() => {
    const getPermissions = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        setPermissoesConcedidas(
          granted["android.permission.CAMERA"] === "granted" &&
            granted["android.permission.RECORD_AUDIO"] === "granted",
        );
      } else {
        setPermissoesConcedidas(true);
      }
    };
    getPermissions();
  }, []);

  // 2. Inicializar o Motor Agora (O coração do BossCall)
  useEffect(() => {
    if (!permissoesConcedidas) return;

    const init = async () => {
      try {
        engine.current = createAgoraRtcEngine();
        engine.current.initialize({ appId: APP_ID });

        engine.current.registerEventHandler({
          onJoinChannelSuccess: () => {
            setIsJoined(true);
            console.log("Entrou no BossCall");
          },
          onUserJoined: (_connection, uid) => {
            setRemoteUid(uid);
            // Inicia o cronômetro real quando o outro lado atende
            const intervalo = setInterval(() => {
              tempoRef.current += 1;
              setTempoMostrado(tempoRef.current);
            }, 1000);
            return () => clearInterval(intervalo);
          },
          onUserOffline: () => setRemoteUid(null),
          onError: (err) => console.log("Erro Agora BossCall:", err),
        });

        // Configura se começa com vídeo ou só áudio
        if (chamada.tipo === "video") {
          engine.current.enableVideo();
          engine.current.startPreview();
        } else {
          engine.current.enableAudio();
          engine.current.disableVideo(); // Garante que a câmera não ligue se for áudio
        }

        engine.current.joinChannel("", salaNome, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });
      } catch (e) {
        console.log("Erro ao iniciar BossCall:", e);
      }
    };

    init();

    return () => {
      engine.current?.leaveChannel();
      engine.current?.release();
    };
  }, [permissoesConcedidas]);

  // Alternar Vídeo durante a chamada
  const toggleVideo = () => {
    const novoEstado = !videoLigado;
    setVideoLigado(novoEstado);
    if (novoEstado) {
      engine.current?.enableVideo();
    } else {
      engine.current?.disableVideo();
    }
  };

  // Finalizar e salvar no Banco
  async function finalizarChamada() {
    const duracaoFinal = tempoRef.current;
    await supabase
      .from("chamadas_empresa")
      .update({ status: "encerrada", duracao: duracaoFinal })
      .eq("id", chamada.id);

    encerrar();
  }

  if (!permissoesConcedidas) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff" }}>Solicitando acesso à mídia...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TELA DE VÍDEO OU LOGO DA EMPRESA */}
      <View style={styles.viewPrincipal}>
        {videoLigado && remoteUid ? (
          <RtcSurfaceView
            canvas={{ uid: remoteUid }}
            style={styles.fullVideo}
          />
        ) : (
          <View style={styles.centered}>
            {/* Aqui entra a logo da empresa (substitua pela URL real se tiver) */}
            <View style={styles.placeholderLogo}>
              <MaterialCommunityIcons
                name="office-building"
                size={80}
                color="#00FF88"
              />
            </View>
            <Text style={styles.nome}>Em chamada...</Text>
            <Text style={styles.tempo}>{tempoMostrado}s</Text>
          </View>
        )}
      </View>

      {/* MINIATURA DA CÂMERA LOCAL (Se vídeo ligado) */}
      {isJoined && videoLigado && (
        <View style={styles.localVideoContainer}>
          <RtcSurfaceView
            canvas={{ uid: 0 }}
            style={styles.localVideo}
            zOrderMediaOverlay={true}
          />
        </View>
      )}

      {/* CONTROLES */}
      <View style={styles.botoes}>
        <TouchableOpacity
          style={[
            styles.botaoAcao,
            !microfoneLigado && { backgroundColor: "#ff4444" },
          ]}
          onPress={() => {
            setMicrofoneLigado(!microfoneLigado);
            engine.current?.muteLocalAudioStream(microfoneLigado);
          }}
        >
          <MaterialCommunityIcons
            name={microfoneLigado ? "microphone" : "microphone-off"}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoVerde} onPress={toggleVideo}>
          <MaterialCommunityIcons
            name={videoLigado ? "video" : "video-off"}
            size={28}
            color="#000"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoVermelho}
          onPress={finalizarChamada}
        >
          <MaterialCommunityIcons name="phone-hangup" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0F14" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  viewPrincipal: { flex: 1 },
  fullVideo: { flex: 1 },
  nome: { color: "#fff", fontSize: 22, marginTop: 20 },
  tempo: { color: "#00FF88", fontSize: 18, fontWeight: "bold" },
  placeholderLogo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#1A1D24",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00FF88",
  },
  localVideoContainer: {
    width: 100,
    height: 150,
    position: "absolute",
    top: 50,
    right: 20,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#00FF88",
  },
  localVideo: { flex: 1 },
  botoes: {
    flexDirection: "row",
    justifyContent: "center",
    position: "absolute",
    bottom: 40,
    width: "100%",
  },
  botaoAcao: {
    backgroundColor: "#333",
    padding: 20,
    borderRadius: 50,
    margin: 10,
  },
  botaoVerde: {
    backgroundColor: "#00FF88",
    padding: 20,
    borderRadius: 50,
    margin: 10,
  },
  botaoVermelho: {
    backgroundColor: "#E53935",
    padding: 20,
    borderRadius: 50,
    margin: 10,
  },
});
