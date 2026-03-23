// Central de suporte do candidato — exibe FAQs e botão para abrir chamado técnico.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SuporteCandidatos() {
  const faqs = [
    { id: '1', pergunta: 'Como alterar meus dados?' },
    { id: '2', pergunta: 'Erro ao gerar o PDF do currículo' },
    { id: '3', pergunta: 'Como excluir minha conta?' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>CENTRAL DE AJUDA</Text>
      
      <ScrollView>
        {faqs.map(item => (
          <TouchableOpacity key={item.id} style={styles.faqCard}>
            <Text style={styles.faqText}>{item.pergunta}</Text>
            <Ionicons name="chevron-forward" size={18} color="#39ff14" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.btnChamado}>
          <Text style={styles.btnText}>ABRIR CHAMADO TÉCNICO</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0b10", padding: 20 },
  header: { color: '#39ff14', fontSize: 14, fontWeight: '700', marginBottom: 25, letterSpacing: 2 },
  faqCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 18, 
    backgroundColor: '#161b22', 
    borderRadius: 4, 
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#39ff14'
  },
  faqText: { color: '#fff', fontSize: 14 },
  btnChamado: { 
    marginTop: 20, 
    padding: 18, 
    borderWidth: 1, 
    borderColor: '#39ff14', 
    alignItems: 'center',
    borderRadius: 4,
    // Efeito de brilho que você pediu
    shadowColor: "#39ff14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  btnText: { color: '#39ff14', fontWeight: 'bold', fontSize: 12 }
});