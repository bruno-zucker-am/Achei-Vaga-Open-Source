import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, PermissionsAndroid, Platform, Text, TouchableOpacity } from 'react-native';
import { createAgoraRtcEngine, RtcSurfaceView, ChannelProfileType, ClientRoleType } from 'react-native-agora';

// App ID do Agora lido do .env — substitua pelo seu no arquivo .env
const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID;
const token = ''; // Token vazio para projetos sem autenticação Agora

export default function VideoChamada({ route, navigation }) {
  // Parâmetros recebidos via navegação (idVaga e nomeUsuario)
  const { idVaga, nomeUsuario } = route.params || { idVaga: 'teste', nomeUsuario: 'Usuário' };
  const nomeSala = `acheivaga-${idVaga}`;

  const [permissoesConcedidas, setPermissoesConcedidas] = useState(false);
  const [entrou, setEntrou] = useState(false);
  const [uidRemoto, setUidRemoto] = useState(null);
  const motor = useRef(null);

  // Solicita permissões de câmera e microfone no Android
  useEffect(() => {
    const obterPermissoes = async () => {
      if (Platform.OS === 'android') {
        const concedidas = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        setPermissoesConcedidas(
          concedidas['android.permission.CAMERA'] === 'granted' &&
          concedidas['android.permission.RECORD_AUDIO'] === 'granted'
        );
      } else {
        setPermissoesConcedidas(true);
      }
    };
    obterPermissoes();
  }, []);

  // Inicializa o motor Agora, registra eventos e entra na sala após permissões concedidas
  useEffect(() => {
    if (!permissoesConcedidas) return;

    const inicializar = async () => {
      try {
        motor.current = createAgoraRtcEngine();
        motor.current.initialize({ appId });

        motor.current.registerEventHandler({
          onJoinChannelSuccess: () => setEntrou(true),
          onUserJoined: (_conexao, uid) => setUidRemoto(uid),
          onUserOffline: () => setUidRemoto(null),
          onError: (err) => console.log('Erro Agora:', err)
        });

        motor.current.enableVideo();  // Ativa o módulo de vídeo
        motor.current.startPreview(); // Inicia a câmera local antes de entrar

        motor.current.joinChannel(token, nomeSala, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });
      } catch (erro) {
        console.log('Erro ao inicializar videochamada:', erro);
      }
    };

    inicializar();

    // Sai da sala e libera recursos ao desmontar o componente
    return () => {
      motor.current?.leaveChannel();
      motor.current?.release();
    };
  }, [permissoesConcedidas]);

  // Exibe mensagem enquanto aguarda permissões
  if (!permissoesConcedidas) {
    return (
      <View style={estilos.centralizado}>
        <Text style={{ color: '#fff' }}>Aguardando permissões...</Text>
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      {/* Vídeo remoto — ocupa a tela inteira */}
      {uidRemoto ? (
        <RtcSurfaceView canvas={{ uid: uidRemoto }} style={estilos.videoPrincipal} />
      ) : (
        <View style={estilos.centralizado}>
          <Text style={{ color: '#39FF14' }}>Aguardando o outro participante entrar...</Text>
        </View>
      )}

      {/* Câmera local — exibida no canto superior direito */}
      {entrou && (
        <View style={estilos.containerVideoLocal}>
          <RtcSurfaceView
            canvas={{ uid: 0 }}
            style={estilos.videoLocal}
            zOrderMediaOverlay={true}
          />
        </View>
      )}

      {/* Botão para encerrar a chamada */}
      <TouchableOpacity style={estilos.botaoSair} onPress={() => navigation.goBack()}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Encerrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoPrincipal: { flex: 1 },
  containerVideoLocal: {
    width: 120, height: 180,
    position: 'absolute', top: 50, right: 20,
    borderRadius: 15, overflow: 'hidden',
    borderWidth: 2, borderColor: '#39FF14'
  },
  videoLocal: { flex: 1 },
  botaoSair: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: '#ff4444', padding: 15,
    borderRadius: 30, width: 150, alignItems: 'center'
  }
});
