// ChatBot — interface de chat para auxiliar o candidato a montar o currículo. Em desenvolvimento.
import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';

export default function ChatBot() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.balaoBot}>
          <Text style={styles.txtBot}>Beleza! Vamos montar seu currículo. Qual sua última experiência profissional?</Text>
        </View>
        
        <View style={styles.balaoUser}>
          <Text style={styles.txtUser}>Desenvolvedor React Native na Empresa X</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TextInput 
          style={styles.input} 
          placeholder="Digite aqui..." 
          placeholderTextColor="#475569"
        />
        <TouchableOpacity style={styles.sendBtn}>
          <Text style={{ color: '#000', fontWeight: 'bold' }}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0b10" },
  balaoBot: { backgroundColor: '#1e293b', padding: 15, borderRadius: 10, marginBottom: 20, maxWidth: '85%' },
  txtBot: { color: '#fff', fontSize: 14 },
  balaoUser: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#0a0b10', 
    borderWidth: 1, 
    borderColor: '#39ff14', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20 
  },
  txtUser: { color: '#39ff14', fontSize: 14 },
  footer: { 
    flexDirection: 'row', 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#1e293b', 
    backgroundColor: '#0a0b10',
    marginBottom: 115 
  },
  input: { flex: 1, color: '#fff', backgroundColor: '#161b22', padding: 12, borderRadius: 4, marginRight: 10 },
  sendBtn: { backgroundColor: '#39ff14', padding: 12, borderRadius: 4, justifyContent: 'center' }
});