// Chat interno B2B — tela de mensagens com suporte a texto, imagem, áudio, resposta e indicador de digitação.
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

// Se não tiver a lib instalada, use essa função auxiliar fora do componente
import { decode } from "base64-arraybuffer";

const { width, height } = Dimensions.get("window");

export default function ChatInterno({ route, navigation }) {
  const { conversationId, contato } = route.params;

  // --- REFS ---
  const flatListRef = useRef();
  const timerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const channelRef = useRef(null);
  const swipeableRefs = useRef(new Map());
  const soundRef = useRef(null);
  const recordingRef = useRef(null);

  // --- ESTADOS DE MENSAGENS ---
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [userId, setUserId] = useState(null);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  // --- ESTADOS DE PRESENÇA ---
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  // --- ESTADOS DE MÍDIA ---
  const [recording, setRecording] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [imageViewer, setImageViewer] = useState({ visible: false, url: null });

  // --- ESTADOS DE ÁUDIO ---
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [posicaoAtual, setPosicaoAtual] = useState(0);
  const [duracaoTotal, setDuracaoTotal] = useState(0);
  const [audioUrlAtiva, setAudioUrlAtiva] = useState(null);

  const [destinatarioId, setDestinatarioId] = useState(null);

  const marcarComoLida = async (meuId) => {
    const { error } = await supabase
      .from("mensagens_empresas")
      .update({ status: "lida" })
      .eq("conversation_id", conversationId)
      .eq("destinatario_id", meuId)
      .neq("status", "lida"); // Só atualiza o que ainda não está como lido

    if (error) console.log("Erro ao marcar como lida:", error);
  };

  // INICIALIZAÇÃO
  useEffect(() => {
    let active = true;

    const initChat = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user && active) {
        setUserId(session.user.id);
        if (contato?.user_id) setDestinatarioId(contato.user_id);

        await fetchMensagens();

        // CHAMA AQUI: Assim que carregar as mensagens, avisa que você leu
        await marcarComoLida(session.user.id);

        setupRealtime(session.user.id);
      }
    };

    initChat();

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId]);

  // CANAL REAL TIME DO CHAT NO SUPABASE
  const setupRealtime = (myId) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    // O segredo está em monitorar os estados do canal para reconectar se cair
    const channel = supabase.channel(`chat_${conversationId}`, {
      config: { presence: { key: myId } },
    });

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_empresas",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // IMPORTANTE: Só adiciona se o sender NÃO for eu (pois eu já adicionei no otimista)
          // Isso evita que a mensagem suma e volte ou duplique
          if (payload.new.sender_id !== myId) {
            setMensagens((prev) => {
              const exists = prev.find((m) => m.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });
          }
        },
      )
      // DENTRO DO SEU SETUPREALTIME, ABAIXO DO .on("postgres_changes" de INSERT)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mensagens_empresas",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Atualiza a mensagem na lista com o novo status (enviado -> lido)
          setMensagens((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m)),
          );
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== myId) {
          setIsOtherTyping(payload.isTyping);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const online = Object.keys(state).some(
          (key) => key === contato.user_id,
        );
        setIsOnline(online);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          console.log("Conectado ao chat!");
          await channel.track({ online_at: new Date().toISOString() });
        }

        // Se a conexão falhar, tentamos buscar as mensagens de novo para não perder nada
        if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          console.log("Conexão instável, atualizando mensagens...");
          fetchMensagens();
        }
      });

    channelRef.current = channel;
  };

  const fetchMensagens = async () => {
    const { data } = await supabase
      .from("mensagens_empresas")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMensagens(data);
  };

  const handleTyping = (val) => {
    setTexto(val);
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, isTyping: val.length > 0 },
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, isTyping: false },
      });
    }, 2000);
  };

  const enviarMensagem = async (
    destIdOuTipo,
    tipoOuUrl = "texto",
    urlOpcional = null,
  ) => {
    // 1. Bloqueio de texto vazio
    if (tipoOuUrl === "texto" && texto.trim() === "") return;

    let destinatario = destinatarioId;
    let tipo = "texto";
    let url = null;

    if (
      typeof destIdOuTipo === "string" &&
      (destIdOuTipo.includes("-") || destIdOuTipo.length > 20)
    ) {
      destinatario = destIdOuTipo;
      tipo = tipoOuUrl;
      url = urlOpcional;
    } else if (destIdOuTipo === "imagem" || destIdOuTipo === "audio") {
      tipo = destIdOuTipo;
      url = tipoOuUrl;
    }

    const msgData = {
      conversation_id: conversationId,
      destinatario_id: destinatario,
      sender_id: userId,
      usuario_id: userId,
      sender_tipo: "empresa",
      mensagem: tipo === "texto" ? texto : null,
      tipo: tipo,
      arquivo_url: url,
      reply_to_id: replyingTo?.id || null,
    };

    // 2. ID Temporário para o Otimismo
    const temporaryId = Date.now();
    const optimisticMsg = {
      ...msgData,
      id: temporaryId,
      created_at: new Date().toISOString(),
    };

    // 3. Interface atualiza na hora
    setMensagens((prev) => [...prev, optimisticMsg]);
    setTexto("");
    setReplyingTo(null);

    // 4. Envio real pro banco
    const { data, error } = await supabase
      .from("mensagens_empresas")
      .insert([msgData])
      .select();

    if (error) {
      console.log("Erro ao enviar:", error);
      // Se deu erro, removemos da tela para o usuário saber que não foi
      setMensagens((prev) => prev.filter((m) => m.id !== temporaryId));
      alert("Falha ao enviar mensagem. Verifique sua conexão.");
    } else {
      // 5. Sucesso: Substituímos a mensagem "falsa" pela oficial do banco
      setMensagens((prev) =>
        prev.map((m) => (m.id === temporaryId ? data[0] : m)),
      );
    }
  };

  // UPLOAD DE IMAGENS

  const uploadFile = async (data, ext, folder, isBase64 = false) => {
    try {
      let body;
      if (isBase64) {
        body = decode(data);
      } else {
        const response = await fetch(data);
        body = await response.blob();
      }

      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${folder}/${fileName}`;

      // Ajuste dinâmico do contentType para não "cagar" o que já funciona
      let contentType = "image/jpeg";
      if (ext === "png") contentType = "image/png";
      if (ext === "m4a" || ext === "caf") contentType = "audio/m4a"; // Suporte para áudio

      const { error } = await supabase.storage
        .from("chat_media")
        .upload(filePath, body, {
          contentType: contentType,
          upsert: true,
        });

      if (error) {
        console.log("Erro upload:", error);
        return null;
      }

      const { data: res } = supabase.storage
        .from("chat_media")
        .getPublicUrl(filePath);

      return res.publicUrl;
    } catch (err) {
      console.log("Upload error:", err);
      return null;
    }
  };


  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.5,
      base64: true, // ADICIONE ISSO AQUI
    });

    if (!res.canceled) {
      setSending(true);

      // Pegamos o base64 direto do asset
      const base64Data = res.assets[0].base64;
      const uri = res.assets[0].uri;
      const fileExt = uri.split(".").pop().toLowerCase() || "jpg";

      // Passamos o base64 para o upload
      const url = await uploadFile(base64Data, fileExt, "images", true);

      if (url) {
        await enviarMensagem("imagem", url);
      }
      setSending(false);
    }
  };
  // ============================
  // ÁUDIO - GRAVAÇÃO
  // ============================

  const startRecording = async () => {
    if (recording) return;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setTempoGravacao(0);
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setTempoGravacao((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao iniciar:", err);
    }
  };

  const pauseRecording = async () => {
    if (!recording) return;
    if (isPaused) {
      await recording.startAsync();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setTempoGravacao((prev) => prev + 1);
      }, 1000);
    } else {
      await recording.pauseAsync();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const discardRecording = async () => {
    if (!recording) return;
    try {
      clearInterval(timerRef.current);
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setTempoGravacao(0);
      setIsPaused(false);
    } catch (e) {
      setRecording(null);
    }
  };

  const stopAndSendRecording = async () => {
    if (!recording) return;
    try {
      clearInterval(timerRef.current);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI(); // URI local do celular

      setRecording(null);
      setSending(true);

      // MÁGICA PARA O CELULAR: Converte o arquivo gravado em Base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExt = "m4a"; // Padrão do HIGH_QUALITY do Expo

      // Usa sua função uploadFile com isBase64 = true (igual você faz na imagem)
      const url = await uploadFile(base64Audio, fileExt, "audios", true);

      if (url) {
        await enviarMensagem(destinatarioId, "audio", url);
      }
    } catch (e) {
      console.error("Erro ao processar áudio:", e);
    }
    setSending(false);
    setTempoGravacao(0);
  };

  // ============================
  // REPRODUÇÃO DE ÁUDIO
  // ============================

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosicaoAtual(status.positionMillis);
      setDuracaoTotal(status.durationMillis);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosicaoAtual(0);
      }
    }
  };

  const tocarAudio = async (url) => {
    try {
      if (sound && audioUrlAtiva === url) {
        isPlaying ? await sound.pauseAsync() : await sound.playAsync();
        return;
      }
      if (sound) await sound.unloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        onPlaybackStatusUpdate,
      );
      setSound(newSound);
      setAudioUrlAtiva(url);
    } catch (error) {
      console.error(error);
    }
  };

  // ============================
  // RENDERIZAÇÃO
  // ============================

  const renderRightActions = (item) => (
    <View style={styles.swipeAction}>
      <Ionicons name="arrow-undo" size={20} color="#64748b" />
    </View>
  );

  const formatarTempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins}:${segs < 10 ? "0" : ""}${segs}`;
  };

  const formatarTempoMillis = (millis) => {
    return formatarTempo(Math.floor(millis / 1000));
  };

  const renderItem = ({ item }) => {
    const eu = item.sender_id === userId;
    const ativo = audioUrlAtiva === item.arquivo_url;

    return (
      <Swipeable
        // FORÇAR FALSE PARA EVITAR O ERRO NO WEB/DESKTOP
        useNativeDriver={false}
        ref={(el) => swipeableRefs.current.set(item.id, el)}
        renderRightActions={() => renderRightActions(item)}
        onSwipeableOpen={() => {
          setReplyingTo(item);
          swipeableRefs.current.get(item.id)?.close();
        }}
      >
        <View
          style={[
            styles.msgContainer,
            eu ? { alignItems: "flex-end" } : { alignItems: "flex-start" },
          ]}
        >
          <View
            style={[
              styles.msgBubble,
              eu ? styles.msgEu : styles.msgOutro,
              // Se for imagem, removemos o padding e escondemos o que sobrar (overflow)
              item.tipo === "imagem" && { padding: 0, overflow: "hidden" },
            ]}
          >
            {item.reply_to_id && (
              <View
                style={[
                  styles.replyPreviewInternal,
                  item.tipo === "imagem" && { margin: 10 },
                ]}
              >
                <Text style={styles.replyTextInternal} numberOfLines={1}>
                  Mensagem anterior...
                </Text>
              </View>
            )}

            {item.tipo === "imagem" && (
              <TouchableOpacity
                onPress={() =>
                  setImageViewer({ visible: true, url: item.arquivo_url })
                }
              >
                <Image
                  source={{ uri: item.arquivo_url }}
                  style={styles.imgMsg}
                  resizeMode="cover" // Faz a imagem preencher o quadrado todo sem sobras
                />
              </TouchableOpacity>
            )}

            {item.tipo === "audio" && (
              <View style={styles.audioBubbleContent}>
                <TouchableOpacity onPress={() => tocarAudio(item.arquivo_url)}>
                  <Ionicons
                    name={ativo && isPlaying ? "pause" : "play"}
                    size={28}
                    color={eu ? "#020617" : "#00ff9d"}
                  />
                </TouchableOpacity>
                <View style={styles.audioBarContainer}>
                  <Text
                    style={{ color: eu ? "#020617" : "#fff", fontSize: 12 }}
                  >
                    {ativo
                      ? `${formatarTempoMillis(posicaoAtual)} / ${formatarTempoMillis(duracaoTotal)}`
                      : "Mensagem de voz"}
                  </Text>
                  <View style={styles.wavePlaceholder} />
                </View>
              </View>
            )}

            {item.mensagem && (
              <Text
                style={[styles.msgText, { color: eu ? "#020617" : "#fff" }]}
              >
                {item.mensagem}
              </Text>
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-end",
                marginTop: 4,
              }}
            >
              <Text
                style={[
                  styles.timeText,
                  {
                    color: eu ? "#020617" : "#64748b",
                    marginTop: 0,
                    marginRight: 4,
                  },
                ]}
              >
                {format(new Date(item.created_at), "HH:mm")}
              </Text>

              {eu && (
                <Ionicons
                  name={item.status === "lida" ? "checkmark-done" : "checkmark"}
                  size={15}
                  color={item.status === "lida" ? "#020617" : "#020617"} // Aqui você escolhe se quer verde ou manter o contraste do balão
                  style={{ opacity: item.status === "lida" ? 1 : 0.6 }}
                />
              )}
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#00ff9d" />
          </TouchableOpacity>
          <Image source={{ uri: contato.foto_url }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{contato.nome}</Text>
            <Text style={[styles.statusText, isOnline && { color: "#00ff9d" }]}>
              {isOtherTyping
                ? "digitando..."
                : isOnline
                  ? "online agora"
                  : "offline"}
            </Text>
          </View>
        </View>

        {/* MENSAGENS */}
        <FlatList
          ref={flatListRef}
          data={mensagens}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 15 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* RESPOSTA RÁPIDA */}
        {replyingTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyContent}>
              <Text style={{ color: "#00ff9d", fontWeight: "bold" }}>
                Respondendo a:
              </Text>
              <Text style={{ color: "#94a3b8" }} numberOfLines={1}>
                {replyingTo.mensagem || "Mídia"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* FOOTER - INPUT E ÁUDIO */}
        <View style={styles.footer}>
          {recording ? (
            <View style={styles.recContainer}>
              {/* Cancelar */}
              <TouchableOpacity onPress={discardRecording}>
                <Ionicons name="trash" size={24} color="#ef4444" />
              </TouchableOpacity>

              {/* Timer */}
              <Text style={styles.recTimer}>
                {Math.floor(tempoGravacao / 60)}:
                {String(tempoGravacao % 60).padStart(2, "0")}
              </Text>

              {/* Pausar / Retomar */}
              <TouchableOpacity
                onPress={pauseRecording}
                style={{ marginHorizontal: 15 }}
              >
                <Ionicons
                  name={isPaused ? "play-circle" : "pause-circle"}
                  size={26}
                  color="#64748b"
                />
              </TouchableOpacity>

              {/* Enviar */}
              <TouchableOpacity onPress={stopAndSendRecording}>
                <Ionicons name="checkmark-circle" size={32} color="#00ff9d" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputRow}>
              {/* Botão de imagem */}
              <TouchableOpacity onPress={pickImage}>
                <Ionicons name="image-outline" size={26} color="#94a3b8" />
              </TouchableOpacity>

              {/* Input */}
              <TextInput
                style={styles.input}
                placeholder="Mensagem..."
                value={texto}
                onChangeText={handleTyping}
                multiline
              />

              {/* Botões de enviar ou gravar */}
              {texto.length > 0 ? (
                <TouchableOpacity onPress={() => enviarMensagem()}>
                  <Ionicons name="send" size={26} color="#00ff9d" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={startRecording}>
                  <Ionicons name="mic" size={26} color="#00ff9d" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Visualizador de imagem */}
        <Modal
          visible={imageViewer.visible}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalFull}>
            <TouchableOpacity
              style={styles.closeModal}
              onPress={() => setImageViewer({ visible: false, url: null })}
            >
              <Ionicons name="close" size={35} color="#fff" />
            </TouchableOpacity>
            {imageViewer.url && (
              <Image
                source={{ uri: imageViewer.url }}
                style={styles.fullImg}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // AQUI VOCÊ TROCA A COR DE FUNDO DO CHAT (ATUAL: AZUL ESCURO)
  container: { flex: 1, backgroundColor: "#fff" },

  // BARRA DO TOPO (Onde fica a foto e o nome do contato)
  header: {
    flexDirection: "row", // Alinha seta, foto e nome na horizontal
    alignItems: "center", // Centraliza os itens verticalmente
    paddingTop: 50, // Espaço para não bater no entalhe (notch) do celular
    paddingBottom: 15, // Espaço abaixo do nome
    paddingHorizontal: 15, // Recuo nas laterais
    backgroundColor: "#0f172a", // Cor de fundo do cabeçalho (Azul Marinho)
  },

  // FOTO DO PERFIL NO HEADER
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20, // Faz a foto ficar redonda
    marginHorizontal: 12, // Afasta a foto da seta e do nome
  },

  // NOME DO USUÁRIO NO HEADER
  headerName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  // TEXTO DE "ONLINE" OU "DIGITANDO"
  statusText: {
    fontSize: 12,
    color: "#64748b",
  },

  // ESPAÇAMENTO EXTERNO ENTRE UMA MENSAGEM E OUTRA
  msgContainer: {
    width: "100%",
    marginVertical: 4,
  },

  // O "BALÃO" DA MENSAGEM (Preenchimento e arredondamento)
  msgBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: "80%", // Faz o balão não ocupar a largura toda da tela
  },

  // SEU BALÃO (ENVIADO)
  msgEu: {
    backgroundColor: "#00ff9d", // Seu verde limão
    borderBottomRightRadius: 2, // Deixa a pontinha direita mais "quadrada" (estilo zap)
  },

  // BALÃO DO OUTRO (RECEBIDO)
  msgOutro: {
    backgroundColor: "#08256a", // Azul que você definiu agora
    borderBottomLeftRadius: 2, // Deixa a pontinha esquerda mais "quadrada"
  },

  // O TEXTO DA MENSAGEM EM SI
  msgText: {
    fontSize: 15,
  },

  // O HORÁRIO DA MENSAGEM
  timeText: {
    fontSize: 9,
  },

  // ESTILO CASO A MENSAGEM SEJA UMA IMAGEM
  imgMsg: {
    width: 220,
    height: 220,
    borderRadius: 0,
  },

  footer: {
    padding: 10,
    backgroundColor: "#08256a", // AQUI TROCA A COR DE FUNDO DA BARRA DE DIGITAR

    // AQUI VOCÊ SOBE O INPUT: Aumente o 15 para 30 ou 40 para o Android
    paddingBottom: Platform.OS === "ios" ? 15 : 40,
  },

  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    color: "#000", // Cor da letra dentro do input
    backgroundColor: "#fff", // AQUI TROCA A COR DE FUNDO DO "BALÃO" ONDE DIGITA
    borderRadius: 20,
    paddingHorizontal: 15,
    marginHorizontal: 10,
    minHeight: 40,
  },
  // Lógica de deslizar para responder
  swipeAction: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  // Barra que aparece em cima do input quando você está respondendo a alguém
  replyBar: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#1e293b", // Cor de fundo da barra de resposta
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },

  // Conteúdo interno da resposta (o texto da mensagem citada)
  replyContent: {
    flex: 1,
    borderLeftWidth: 3, // Aquela bordinha vertical do lado da resposta
    borderLeftColor: "#00ff9d", // Cor da bordinha (seu verde)
    paddingLeft: 10,
  },

  // Estilo do Modal de imagem em tela cheia
  modalFull: {
    flex: 1,
    backgroundColor: "#000", // Fundo preto total para destacar a foto
    justifyContent: "center",
  },

  // Tamanho da imagem aberta no modal
  fullImg: {
    width: width,
    height: height * 0.8,
  },

  // Botão de fechar o modal da imagem
  closeModal: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },

  // Container que aparece enquanto você está gravando áudio
  recContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
  },

  // O contador de tempo da gravação (o reloginho vermelho)
  recTimer: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 18,
  },

  // Botão circular de enviar
  btnSend: {
    backgroundColor: "#00ff9d",
    padding: 8,
    borderRadius: 20,
  },

  // Container do áudio dentro do balão de mensagem
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 150,
  },

  // A linha/barra de progresso do áudio
  audioBar: {
    flex: 1,
    height: 2,
    backgroundColor: "#64748b",
    marginLeft: 10,
    opacity: 0.5,
  },

  // Preview da resposta dentro do balão da mensagem (aquela caixinha pequena)
  replyPreviewInternal: {
    backgroundColor: "rgba(0,0,0,0.1)", // Fundo levemente escurecido
    padding: 5,
    borderRadius: 5,
    marginBottom: 5,
  },

  // Texto da mensagem que está sendo respondida dentro do balão
  replyTextInternal: {
    fontSize: 12,
    color: "#444",
  },
});
