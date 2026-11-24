import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageViewerModal({
  visible,
  imageUrl,
  onClose,
}: ImageViewerModalProps) {
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);

  // Reanimated shared values untuk zoom & pan
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset zoom & posisi saat modal dibuka / ditutup / ganti gambar
  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setAspectRatio(4 / 3); // default aspect ratio
    }
  }, [visible, imageUrl, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  // 1. Gesture Cubit 2 Jari (Pinch-to-Zoom)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.8, savedScale.value * e.scale);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withTiming(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  // 2. Gesture Geser saat Zoom (Pan / Drag)
  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  // 3. Gesture Ketuk 2x (Double-Tap to Zoom)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  // Gabungkan seluruh gesture menjadi satu gesture simultan
  const combinedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture,
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible || !imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(15, 23, 42, 0.85)" />

        {/* 1. Backdrop Area Gelap (Tap di mana saja di area kosong untuk menutup modal) */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Tutup preview gambar"
        />

        {/* 2. Tombol Close "X" di pojok kanan atas */}
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.8}
          className="absolute top-12 right-5 w-11 h-11 bg-black/40 rounded-full items-center justify-center z-50 border border-white/20 shadow-md"
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* 3. Container Gambar dengan Dynamic Aspect Ratio */}
        <View
          pointerEvents="box-none"
          style={styles.imageContainer}
        >
          <GestureDetector gesture={combinedGesture}>
            <Animated.View
              style={[
                {
                  width: "100%",
                  aspectRatio,
                  maxHeight: "82%",
                },
                animatedStyle,
              ]}
            >
              <ExpoImage
                source={{ uri: imageUrl }}
                style={styles.fullImage}
                contentFit="contain"
                transition={150}
                cachePolicy="memory-disk"
                onLoad={(e) => {
                  if (e.source.width && e.source.height) {
                    setAspectRatio(e.source.width / e.source.height);
                  }
                }}
              />
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.82)", // Slate-900 semi-transparan
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
});
