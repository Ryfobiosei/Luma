import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import useThemeStore from '../../../store/theme';
import useAudioStore from '../../../store/AudioHeadStore';
import useVideoStore from '../../../store/VideoHeadStore';

export default function BrowseScreen() {
  const { themeColors } = useThemeStore();
  const audioFiles = useAudioStore(state => state.audioFiles);
  const videoFiles = useVideoStore(state => state.videoFiles);
  const [scanning, setScanning] = useState(false);
  const refresh = async () => {
    setScanning(true);
    try {
      await Promise.all([
        useAudioStore.getState().loadAudioFiles(),
        useVideoStore.getState().loadVideoFiles(),
      ]);
    } finally {
      setScanning(false);
    }
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Browse media</Text>
      <Text style={{ color: themeColors.textSecondary }}>Open your device’s music and video library.</Text>
      {[
        ['Music', audioFiles.length, '/(tabs)/(audio)'],
        ['Videos', videoFiles.length, '/(tabs)/(video)'],
        ['Playlists', null, '/(tabs)/(playlist)'],
      ].map(([label, count, route]) => (
        <TouchableOpacity key={label} onPress={() => router.push(route)} style={[styles.row, { backgroundColor: themeColors.card }]}>
          <Text style={{ color: themeColors.text, fontSize: 18 }}>{label}</Text>
          <Text style={{ color: themeColors.textSecondary }}>{count ?? 'Open'}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity disabled={scanning} onPress={refresh} style={[styles.row, { backgroundColor: themeColors.primary }]}>
        <Text style={{ color: '#fff' }}>Rescan device library</Text>
        {scanning && <ActivityIndicator color="#fff" />}
      </TouchableOpacity>
      <View><Text style={{ color: themeColors.textSecondary }}>Media access permission is required to scan your device.</Text></View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: 'bold' },
  row: { padding: 20, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between' },
});
