import React, {useState, useEffect, useMemo, useRef} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Alert
} from "react-native";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  ListMusic,
  X,
  SlidersHorizontal,
  Shuffle,
  Repeat,
  RefreshCw
} from "lucide-react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {router} from "expo-router";
import Slider from "@react-native-community/slider";
import useThemeStore from "../../../store/theme";
import useAudioControl from "../../../store/useAudioControl";

const {width} = Dimensions.get("window");

const parseLRC = (lrc) => {
    if (!lrc) return [];
    const lines = lrc.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
            const text = match[4].trim();
            const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
            if (text) {
              result.push({ time, text });
            }
        }
    }
    return result;
};

const PlayerScreen = () => {
  const {themeColors} = useThemeStore();
  const { 
    currentTrack, 
    isPlaying, 
    duration, 
    position, 
    pause,
    play,
    next,
    previous,
    seek,
    lyrics,
    showLyrics,
    toggleLyrics,
    sleepTimerId,
    setSleepTimer,
    clearSleepTimer,
    isShuffleOn,
    toggleShuffle,
    lyricsLoading,
    lyricsError,
    refreshLyrics,
  } = useAudioControl();
  
  const [isTimerModalVisible, setTimerModalVisible] = useState(false);
  const albumArtRotation = useRef(new Animated.Value(0)).current;
  const albumArtScale = useRef(new Animated.Value(1)).current;

  const parsedLyrics = useMemo(() => parseLRC(lyrics), [lyrics]);

  const activeLyricIndex = useMemo(() => {
    if (!parsedLyrics || parsedLyrics.length === 0) return -1;
    const currentPosition = position;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
        if (currentPosition >= parsedLyrics[i].time) {
            return i;
        }
    }
    return -1;
  }, [position, parsedLyrics]);

  useEffect(() => {
    if (!isPlaying) return;
    albumArtRotation.setValue(0);
    const rotation = Animated.loop(Animated.timing(albumArtRotation, {
      toValue: 1, duration: 10000, useNativeDriver: true,
    }));
    rotation.start();
    return () => rotation.stop();
  }, [isPlaying, albumArtRotation]);

  const formatTime = (milliseconds) => {
    if (!milliseconds) return "0:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = async () => {
    if (isPlaying) await pause();
    else await play();
  };

  const handleSeek = async (value) => {
    await seek((value / 100) * duration);
  };

  const handleClose = () => {
    router.back();
  };

  const spin = albumArtRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleOpenEQ = () => {
    Alert.alert("Equalizer unavailable", "Audio effects are not supported in this version.");
  };

  if (!currentTrack) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: themeColors.background}]}>
        <View style={styles.centeredContainer}>
          <Text style={[styles.noTrackText, {color: themeColors.text}]}>No track playing</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={[styles.closeButtonText, { color: themeColors.primary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: themeColors.background}]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <ChevronDown size={24} color={themeColors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, {color: themeColors.text}]} numberOfLines={1}>NOW PLAYING</Text>
          <Text style={[styles.headerSubtitle, {color: themeColors.textSecondary}]} numberOfLines={1}>{currentTrack.album || 'Unknown Album'}</Text>
        </View>
        <View style={{width: 48}} />
      </View>

      <View style={styles.albumArtContainer}>
        {showLyrics ? (
          <View style={[styles.lyricsContainer, { backgroundColor: themeColors.card }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 16 }}>Lyrics</Text>
              <TouchableOpacity onPress={refreshLyrics} style={{ padding: 6 }}>
                <RefreshCw size={20} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.lyricsScrollView}>
              {lyricsLoading ? (
                <Text style={[styles.lyricLine, { color: themeColors.textSecondary }]}>Loading lyrics...</Text>
              ) : lyricsError ? (
                <Text style={[styles.lyricLine, { color: themeColors.textSecondary }]}>{lyricsError}</Text>
              ) : parsedLyrics.length > 0 ? (
                parsedLyrics.map((line, index) => (
                  <Text key={index} style={[ styles.lyricLine, { color: index === activeLyricIndex ? themeColors.primary : themeColors.textSecondary }, index === activeLyricIndex && styles.activeLyricLine ]}>
                    {line.text}
                  </Text>
                ))
              ) : lyrics ? (
                lyrics.split('\n').map((line, index) => (
                  <Text key={index} style={[styles.lyricLine, { color: themeColors.textSecondary }]}>{line}</Text>
                ))
              ) : (
                <Text style={[styles.lyricLine, { color: themeColors.textSecondary }]}>No lyrics available.</Text>
              )}
            </ScrollView>
          </View>
        ) : (
           <Animated.View style={[styles.albumArtWrapper, {transform: [{scale: albumArtScale}, {rotate: spin}]}]}>
            {currentTrack.artwork ? (
              <Image source={{uri: currentTrack.artwork}} style={styles.albumArt} />
            ) : (
              <View style={[styles.albumArtPlaceholder, {backgroundColor: themeColors.primary}]}>
                <Text style={styles.defaultIconText}>♪</Text>
              </View>
            )}
           </Animated.View>
        )}
      </View>

      <View style={styles.trackInfoContainer}>
        <Text style={[styles.trackTitle, {color: themeColors.text}]} numberOfLines={2}>{currentTrack.title || "Unknown Track"}</Text>
        <Text style={[styles.trackArtist, {color: themeColors.textSecondary}]} numberOfLines={1}>{currentTrack.artist || "Unknown Artist"}</Text>
      </View>

      <View style={styles.progressContainer}>
        <Slider
          style={styles.progressSlider}
          minimumValue={0}
          maximumValue={100}
          value={duration > 0 ? (position / duration) * 100 : 0}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={themeColors.primary}
          maximumTrackTintColor={themeColors.textSecondary}
          thumbTintColor={themeColors.primary}
        />
        <View style={styles.progressTimeContainer}>
          <Text style={[styles.progressTimeText, {color: themeColors.textSecondary}]}>{formatTime(position)}</Text>
          <Text style={[styles.progressTimeText, {color: themeColors.textSecondary}]}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.mainControlsContainer}>
        <TouchableOpacity style={styles.mainControlButton} onPress={toggleShuffle}>
          <Shuffle size={24} color={isShuffleOn ? themeColors.primary : themeColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mainControlButton} onPress={previous}>
          <SkipBack size={32} color={themeColors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.playPauseButton, {backgroundColor: themeColors.primary}]} onPress={handlePlayPause} disabled={!currentTrack}>
          {isPlaying ? <Pause size={40} color={themeColors.background} /> : <Play size={40} color={themeColors.background} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.mainControlButton} onPress={next}>
          <SkipForward size={32} color={themeColors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mainControlButton}>
           <Repeat size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.secondaryControlsContainer}>
         <TouchableOpacity style={styles.secondaryControlButton} onPress={toggleLyrics}>
           <ListMusic size={24} color={showLyrics ? themeColors.primary : themeColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryControlButton} onPress={() => setTimerModalVisible(true)}>
           <Clock size={24} color={sleepTimerId ? themeColors.primary : themeColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryControlButton} onPress={handleOpenEQ}>
           <SlidersHorizontal size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={isTimerModalVisible} onRequestClose={() => setTimerModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTimerModalVisible(false)}>
            <Pressable style={[styles.modalContent, {backgroundColor: themeColors.card}]}>
                <Text style={[styles.modalTitle, {color: themeColors.text}]}>Sleep Timer</Text>
                
                <View style={styles.timerOptions}>
                    {[15, 30, 45, 60].map(minutes => (
                        <TouchableOpacity key={minutes} style={[styles.timerButton, {backgroundColor: themeColors.background}]} onPress={() => { setSleepTimer(minutes); setTimerModalVisible(false); }}>
                            <Text style={[styles.timerButtonText, {color: themeColors.text}]}>{minutes} minutes</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {sleepTimerId && (
                     <TouchableOpacity style={[styles.timerButton, styles.cancelTimerButton, {backgroundColor: themeColors.error}]} onPress={() => { clearSleepTimer(); setTimerModalVisible(false); }}>
                        <Text style={[styles.timerButtonText, {color: '#fff'}]}>Cancel Timer</Text>
                    </TouchableOpacity>
                )}
                 <TouchableOpacity style={styles.closeModalButton} onPress={() => setTimerModalVisible(false)}>
                    <X size={24} color={themeColors.textSecondary} />
                </TouchableOpacity>
            </Pressable>
        </Pressable>
      </Modal>



    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  noTrackText: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  closeButton: { marginTop: 20, padding: 10 },
  closeButtonText: { fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10 },
  headerButton: { padding: 5 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 12, fontWeight: "bold", textTransform: 'uppercase' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  albumArtContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, paddingVertical: 20 },
  albumArtWrapper: { width: width * 0.75, height: width * 0.75, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 20 },
  albumArt: { width: "100%", height: "100%", borderRadius: 20 },
  albumArtPlaceholder: { width: "100%", height: "100%", borderRadius: 20, justifyContent: "center", alignItems: "center" },
  defaultIconText: { fontSize: 80, color: "rgba(255, 255, 255, 0.5)" },
  lyricsContainer: { width: '100%', height: '100%', borderRadius: 20, padding: 20 },
  lyricsScrollView: { paddingVertical: 10, alignItems: 'center' },
  lyricLine: { fontSize: 18, textAlign: 'center', marginBottom: 16, lineHeight: 28 },
  activeLyricLine: { fontWeight: 'bold', transform: [{ scale: 1.1 }] },
  trackInfoContainer: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 20 },
  trackTitle: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  trackArtist: { fontSize: 18, textAlign: "center" },
  progressContainer: { paddingHorizontal: 30, paddingVertical: 15 },
  progressSlider: { width: "100%", height: 40 },
  progressTimeContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: -10 },
  progressTimeText: { fontSize: 12 },
  mainControlsContainer: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", paddingHorizontal: 40, paddingVertical: 20 },
  mainControlButton: { padding: 10 },
  playPauseButton: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  secondaryControlsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20 },
  secondaryControlButton: { padding: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  timerOptions: { marginBottom: 10 },
  timerButton: { padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  timerButtonText: { fontSize: 16, fontWeight: '500' },
  cancelTimerButton: { marginTop: 10 },
  closeModalButton: { position: 'absolute', top: 15, right: 15 },
  eqModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  eqModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, minHeight: 420, marginTop: 40 },
  eqDragIndicator: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#444', marginBottom: 12 },
  eqHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  eqTitle: { fontSize: 20, fontWeight: 'bold' },
  eqSlidersRowStrict: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-start', marginVertical: 18, marginHorizontal: 8 },
  eqDbScaleCol: { alignItems: 'center', width: 38, height: 180, justifyContent: 'space-between', marginRight: 6 },
  eqSliderColStrict: { alignItems: 'center', flex: 1, justifyContent: 'space-between', height: 200 },
  eqFreqLabelStrict: { fontSize: 13, marginTop: 10, fontWeight: 'bold' },
  eqDbLabel: { fontSize: 10, marginVertical: 2 },
  eqExtraRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  eqExtraLabel: { flex: 1, fontSize: 14 },
  eqExtraValue: { width: 40, textAlign: 'right', fontSize: 13 },
  eqBanner: { backgroundColor: '#222', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, alignSelf: 'center', marginBottom: 12, marginTop: 2, elevation: 2 },
  eqBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});

export default PlayerScreen;
